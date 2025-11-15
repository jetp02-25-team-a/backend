import { prisma } from "../utils/prisma-only";

export type LatLng = { lat: number; lng: number };
export type Bounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type GeoResolutionResult = {
  center: LatLng | null; // 中心點（若找不到則為 null）
  bounds: Bounds | null; // 邊界盒（可用來畫地圖視窗）
  count: number; // 命中筆數（已取樣上限）
};

// 地理計算常數
const KM_PER_DEG_LAT = 111.32; // 1 緯度度 ≈ 111.32 公里

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 依據指定的公里數擴張邊界盒。
 * - lat 方向：1 度約 111.32km
 * - lng 方向：依據中心緯度做 cos(lat) 修正
 */
export function inflateBounds(
  b: Bounds,
  km: number,
  centerLat?: number
): Bounds {
  if (!km || km <= 0) return b;

  const midLat =
    typeof centerLat === "number" ? centerLat : (b.minLat + b.maxLat) / 2;
  const latDeg = km / KM_PER_DEG_LAT;
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
  const lonDeg = kmPerDegLon > 0 ? km / kmPerDegLon : 0;

  return {
    minLat: clamp(b.minLat - latDeg, -90, 90),
    maxLat: clamp(b.maxLat + latDeg, -90, 90),
    minLng: clamp(b.minLng - lonDeg, -180, 180),
    maxLng: clamp(b.maxLng + lonDeg, -180, 180),
  };
}

/**
 * 將一段文字（如「台北」、「北投」或完整地址的一部分）轉成經緯度估計結果。
 * 資料來源：
 * 1. 優先從資料庫 Attraction 表的 lat/lng 與地址欄位，使用 contains 模糊比對
 * 2. 若本地找不到，自動呼叫 Nominatim (OpenStreetMap) 地理編碼服務
 * 策略：
 * - 以 name/nameZh/addrCity/addrDistrict/addrProvince/addrFull 做 OR 模糊搜尋（不分大小寫）
 * - 取前 maxRecords 筆，計算平均值作為中心點，並輸出邊界盒（min/max）
 * - 若本地無命中，則查詢 Nominatim API（免費但有 1 req/sec 限制）
 * - 都找不到才回傳 { center: null, bounds: null, count: 0 }
 */
export async function resolveTextToGeo(
  text: string,
  options?: { maxRecords?: number; useNominatim?: boolean; inflateKm?: number }
): Promise<GeoResolutionResult> {
  const query = (text || "").trim();
  if (!query) return { center: null, bounds: null, count: 0 };

  const maxRecords = options?.maxRecords ?? 500; // 避免拉太多資料
  const useNominatim = options?.useNominatim ?? true; // 預設啟用 Nominatim 後備
  const inflateKm = options?.inflateKm ?? 10; // 預設擴張 10 公里，放寬查詢範圍

  // Prisma MySQL: 使用不分大小寫 contains 比對多個欄位

  const where = {
    OR: [
      { name: { contains: query } },
      { nameZh: { contains: query } },
      { addrCity: { contains: query } },
      { addrDistrict: { contains: query } },
      { addrProvince: { contains: query } },
      { addrFull: { contains: query } },
      { addrStreet: { contains: query } },
    ],
  } as const;

  // 只取計算所需欄位，降低 I/O
  const rows = await prisma.attraction.findMany({
    where: where as any,
    select: { lat: true, lng: true },
    take: maxRecords,
  });

  // ✅ 1️⃣ 本地資料庫有資料，直接計算並回傳
  if (rows.length > 0) {
    let sumLat = 0;
    let sumLng = 0;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;

    for (const r of rows) {
      const { lat, lng } = r;
      sumLat += lat;
      sumLng += lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const center: LatLng = {
      lat: sumLat / rows.length,
      lng: sumLng / rows.length,
    };

    const bounds: Bounds = { minLat, minLng, maxLat, maxLng };
    const inflated = inflateBounds(bounds, inflateKm, center.lat);

    return { center, bounds: inflated, count: rows.length };
  }

  // ✅ 2️⃣ 本地找不到 且 啟用 Nominatim，嘗試呼叫外部 API
  if (useNominatim) {
    try {
      const nominatimResult = await fetchFromNominatim(query);
      if (nominatimResult) {
        const centerLat = nominatimResult.center?.lat;
        const inflated = nominatimResult.bounds
          ? inflateBounds(
              nominatimResult.bounds,
              inflateKm,
              typeof centerLat === "number" ? centerLat : undefined
            )
          : null;
        return { ...nominatimResult, bounds: inflated };
      }
    } catch (err) {
      console.warn(
        "⚠️ Nominatim API 呼叫失敗:",
        err instanceof Error ? err.message : err
      );
      // 失敗不中斷，繼續往下走
    }
  }

  // ✅ 3️⃣ 都找不到，回傳 null
  return { center: null, bounds: null, count: 0 };
}

/**
 * 呼叫 Nominatim (OpenStreetMap) 地理編碼 API
 * 將文字地址轉換為經緯度座標
 * 注意: Nominatim 有速率限制 (1 request/second)，請自行控制呼叫頻率
 */
async function fetchFromNominatim(
  text: string
): Promise<GeoResolutionResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    text
  )}&format=json&limit=1&countrycodes=tw&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "TravelPlannerApp/1.0", // ⚠️ 必須設定，否則會被 Nominatim 擋掉
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`);
  }

  const data = await response.json();

  // 沒有結果
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const result = data[0];
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Nominatim 有提供 boundingbox [minLat, maxLat, minLng, maxLng]
  const bbox = result.boundingbox;
  const bounds: Bounds | null = bbox
    ? {
        minLat: parseFloat(bbox[0]),
        maxLat: parseFloat(bbox[1]),
        minLng: parseFloat(bbox[2]),
        maxLng: parseFloat(bbox[3]),
      }
    : null;

  return {
    center: { lat, lng },
    bounds,
    count: 1, // Nominatim 只回傳單一結果
  };
}

/**
 * 簡易用法示例：
 *
 * // 只查本地資料庫
 * const geo1 = await resolveTextToGeo("北投", { useNominatim: false });
 *
 * // 本地找不到時自動查 Nominatim（預設行為）
 * const geo2 = await resolveTextToGeo("北投");
 *
 * // geo.center => { lat, lng } | null
 * // geo.bounds => { minLat, minLng, maxLat, maxLng } | null
 * // geo.count => 命中資料筆數
 */
