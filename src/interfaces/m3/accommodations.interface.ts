import type {
  AccommodationImage,
  AccommodationAmenity,
  Contact,
  RoomType,
  Review,
} from "../../generated/prisma";

export interface AccommodationDTO {
  id: number;
  name: string;
  description?: string;
  city: string;
  type: string;
  images?: AccommodationImage[];
  contacts?: Contact[];
  amenities?: AccommodationAmenity[];
  roomTypes?: RoomType[];
  reviews?: Review[];
}

// 顯示卡片用
export interface AccommodationListDTO {
  id: number;
  name: string;
  city: string;
  mainImage: string | null;
  averageRating: number | null;
  latitude: number | null;
  longitude: number | null;
  countFavorite: number;
}

export type SortType = "popular" | "highRated";

// 搜尋結果列表用
export type SortDirection = "desc" | "asc";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface SearchParams {
  keyword?: string;
  city?: string;
  boundingBox?: BoundingBox;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  sort?: SortType;
  direction?: SortDirection;
  cursor?: string;
  limit?: number;
  hasUserInputDate: boolean;

  // 篩選條件
  accommodationAmenities?: string[]; // 住宿設施
  roomTypeAmenities?: string[]; // 房型設施
  favorites?: boolean;
  userId?: number;
  favoriteIds?: number[];
}
