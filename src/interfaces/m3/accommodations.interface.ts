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
  cursor?: string;
  limit?: number;
  hasUserInputDate: boolean;
}
