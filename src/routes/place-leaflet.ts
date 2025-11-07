import { Router } from "express";
import { bboxQuerySchema, nearbyQuerySchema } from "../schemas/leaflet";
import {
  findPlacesInBBox,
  findNearby,
  getPlaceDetail,
} from "../services/leaflet";

const router = Router();

// 取得景點
router.get("/places", async (req, res) => {
  try {
    const q = bboxQuerySchema.parse(req.query);
    const rows = await findPlacesInBBox({
      bbox: q.bbox,
      type: q.type,
      q: q.q,
      limit: q.limit,
    });

    if (q.geojson) {
      return res.json({
        type: "FeatureCollection",
        features: rows
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({
            type: "Feature",
            id: p.id,
            geometry: {
              type: "Point",
              coordinates: [p.longitude, p.latitude],
            },
            properties: {
              id: p.id,
              name: p.name,
              type: p.type,
              region: p.region,
              address: p.address,
              heroPhoto: p.heroPhoto,
              avgScore: p.avgScore,
              rankCount: p.rankCount,
              commentCount: p.commentCount,
            },
          })),
      });
    }

    return res.json({ success: true, data: rows });
  } catch (err: any) {
    return res
      .status(400)
      .json({ success: false, error: err?.message ?? "Bad Request" });
  }
});

// 取得附近景點
router.get("/places/nearby", async (req, res) => {
  try {
    const q = nearbyQuerySchema.parse(req.query);
    const rows = await findNearby(q);
    return res.json({ success: true, data: rows });
  } catch (err: any) {
    return res
      .status(400)
      .json({ success: false, error: err?.message ?? "Bad Request" });
  }
});

// 取得單一景點
router.get("/places/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id))
    return res.status(400).json({ success: false, error: "Invalid id" });
  const data = await getPlaceDetail(id);
  if (!data)
    return res.status(404).json({ success: false, error: "Not found" });

  // 也提供單點的 GeoJSON（給 Leaflet 彈窗用的話會很方便）
  const feature = {
    type: "Feature" as const,
    id: data.id,
    geometry:
      data.latitude && data.longitude
        ? {
            type: "Point" as const,
            coordinates: [data.longitude, data.latitude],
          }
        : null,
    properties: {
      id: data.id,
      name: data.name,
      type: data.type,
      introduce: data.introduce,
      contact: data.contact,
      region: data.region,
      address: data.address,
      photos: data.Photos.map((p) => p.url),
      avgScore: data.avgScore,
      rankCount: data.rankCount,
      commentCount: data.commentCount,
    },
  };

  return res.json({ success: true, feature });
});

export default router;
