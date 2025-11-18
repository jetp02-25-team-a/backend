import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/jwt";

import {
  getPlaceExpanded,
  searchPlacesExpanded,
  createPlace,
  upsertPlace,
} from "../services/placeSelect";
import commentsRouter from "./place-comment";
import rankRouter from "./place-ranks";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "uploads",
  "places"
);

// 確保資料夾存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^\w\-]/g, "_");
    const filename = `${Date.now()}-${safeBase}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// 針對營業時間做限制
const DayOpen = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  openTime: z.string(),
  closeTime: z.string(),
  isClosed: z.literal(false).optional(), // 可不填或明確 false
});
const DayClosed = z.object({
  weekday: z.number().int().min(0).max(6),
  isClosed: z.literal(true),
});
const OpeningHoursSchema = z.array(z.union([DayOpen, DayClosed]));

const CreatePlaceBody = z.object({
  type: z.enum(["food", "spot"]),
  name: z.string().min(1, "地名必填"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  address: z.string(),
  region: z.string(),
  contact: z.string().optional(),
  introduce: z.string().min(10, "至少10個字"),
  openingHours: OpeningHoursSchema.optional(),
  cityId: z.number().int().optional(),
  photos: z.array(z.string()).max(20).optional(),
});

const UpsertDetailBody = z.object({
  type: z.enum(["food", "spot"]),
  name: z.string().min(1, "地名必填"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string(),
  region: z.string(),
  contact: z.string().optional(),
  introduce: z.string().min(10, "至少10個字"),
  openingHours: OpeningHoursSchema.optional(),
  cityId: z.number().int().optional(),
  photos: z.array(z.string()).max(30).optional(),
});

/**
 * GET /places
 * Query:
 *  - type=food|spot
 *  - q=keyword
 *  - limit
 *  - offset  (或 page，兩者擇一；若兩者皆有，以 offset 優先)
 *  - page
 *  - sort=rank_desc|rank_asc（暫時先解析，等 service 支援後再串）
 *  - photos=每筆要帶幾張照片
 */

router.get("/", async (req, res) => {
  const Query = z.object({
    type: z.enum(["food", "spot"]).optional(),
    q: z.string().optional(),
    // 新增 page/sort；保留原本 limit/offset（兼容舊邏輯）
    page: z.coerce.number().int().gte(1).optional(),
    sort: z.enum(["rank_desc", "rank_asc"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional(),
    photos: z.coerce.number().int().min(0).max(5).default(1),
  });

  const parsed = Query.safeParse(req.query);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const { type, q, page, sort, limit, offset, photos } = parsed.data;

  // 1) 將 page 轉成 offset；若同時提供 offset 與 page，offset 優先
  const effectiveOffset =
    typeof offset === "number"
      ? offset
      : typeof page === "number"
      ? (page - 1) * limit
      : 0;

  // 2) keyword 正規化（空字串視為 undefined）
  const keyword = q && q.trim().length > 0 ? q.trim() : undefined;

  // 3) 先只把分頁參數餵給 service（不動 service 簽名）
  //    sort 先解析下來但暫時不傳，下一步你要去改 service 來支援它
  const rows = await searchPlacesExpanded({
    type,
    keyword,
    limit,
    offset: effectiveOffset,
    photosPerPlace: photos,
    sort,
  } as any);

  // 可選：把實際採用的分頁資訊/排序寫到回應 header，方便前端除錯
  res.setHeader("X-Limit", String(limit));
  res.setHeader("X-Offset", String(effectiveOffset));
  if (sort) res.setHeader("X-Sort", sort);

  res.json({ success: true, data: rows });
});

/**
 * GET /places/:id
 * 回傳：place、photos、reviews、rating(平均/分布/數量)
 */
/** GET /places/:id : 單筆詳情（含多張照片、統計、最新留言） */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res
      .status(400)
      .json({ success: false, error: { message: "Invalid id" } });
  }

  const data = await getPlaceExpanded(id, { photoLimit: 12, commentLimit: 20 });
  if (!data)
    return res
      .status(404)
      .json({ success: false, error: { message: "Place not found" } });

  res.json({ success: true, data });
});

/**  建立地標（簡易 or 完整都能用）
 *    - 最小必要：type, name, latitude, longitude
 *    - 其餘欄位都是可選（地址/聯絡/介紹/region/cityId/photos）
 *    - 回傳新 place.id
 */

router.post("/", requireAuth, upload.array("photos", 20), async (req, res) => {
  const userId = req.user!.user_id;
  try {
    const body = req.body;
    const files = (req.files as Express.Multer.File[]) || [];
    // 把實體檔案變成給前端用的路徑字串（會存進 DB）
    const photoUrls = files.map((f) => {
      return `/uploads/places/${f.filename}`; // 前端之後 <img src={url} />
    });

    let openingHours = undefined;

    if (body.openingHours) {
      try {
        openingHours = JSON.parse(body.openingHours);
      } catch {
        // parse 失敗可以丟錯或讓 Zod 報錯
      }
    }

    const inputForZod = {
      type: body.type, // "food" | "spot"
      name: body.name,
      address: body.address,
      region: body.region,
      contact: body.contact,
      introduce: body.introduce,
      latitude:
        body.latitude !== undefined && body.latitude !== ""
          ? Number(body.latitude)
          : undefined,
      longitude:
        body.longitude !== undefined && body.longitude !== ""
          ? Number(body.longitude)
          : undefined,
      openingHours: openingHours,
      cityId:
        body.cityId !== undefined && body.cityId !== ""
          ? Number(body.cityId)
          : undefined,
      photos: files.length
        ? files.map((f) => `/uploads/places/${f.filename}`)
        : undefined,
    };

    const parsed = CreatePlaceBody.safeParse(inputForZod);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const place = await createPlace(parsed.data);
    console.log("body =", body);
    return res.json({ success: true, data: place });
  } catch (err: any) {
    console.error("POST /api/place error:", err);
    return res
      .status(500)
      .json({ success: false, message: err?.message ?? "Server error" });
  }
});

/** 補充 / 修改詳情（詳細表單）
 *    - 可同時：更新介紹/聯絡/地址/region/city、相片（新增或覆蓋）、營業時間、我的首則評論與評分
 *    - 全部欄位都可選，傳了才會處理
 */

router.post("/:id", upload.array("photos", 20), async (req, res) => {
  try {
    const placeId = Number(req.params.id);

    if (!Number.isInteger(placeId)) {
      return res.status(400).json({ success: false, message: "placeId 無效" });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const photoUrls = files.map((f) => `/uploads/places/${f.filename}`);

    const parsed = UpsertDetailBody.safeParse({
      ...req.body,
      photos: photoUrls.length ? photoUrls : undefined,
    });

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const updated = await upsertPlace({ placeId, input: parsed.data });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (/HH:mm|缺少 open|時間格式|weekday 無效/.test(err?.message ?? "")) {
      return res.status(422).json({ success: false, message: err.message });
    }
    // Prisma 常見錯誤...
    if (err?.code === "P2025")
      return res.status(404).json({ success: false, message: "找不到該地標" });
    if (err?.code === "P2002")
      return res.status(409).json({ success: false, message: "唯一鍵衝突" });
    console.error(`POST /api/place/${req.params.id}/detail error:`, err);
    return res
      .status(500)
      .json({ success: false, message: err?.message ?? "Server error" });
  }
});

router.use("/", commentsRouter);
router.use("/", rankRouter);

export default router;
