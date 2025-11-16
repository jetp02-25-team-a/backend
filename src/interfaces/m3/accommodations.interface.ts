import type {
  AccommodationImage,
  AccommodationAmenity,
  Contact,
  RoomType,
  Review,
} from "../../generated/prisma";

// 精簡版：卡片列表用（列表/搜尋結果）
export interface AccommodationListDTO {
  id: number;
  name: string;
  city: string;
  mainImage: string;
  averageRating: number | null;
  latitude: number | null;
  longitude: number | null;
  countFavorite: number;
}

// 搜尋方向（保留擴充性）
export type SortDirection = "desc" | "asc";

// 地圖框範圍
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// 搜尋結果用的查詢參數（僅 R 範圍）
export interface SearchParams {
  keyword?: string;
  city?: string;
  boundingBox?: BoundingBox;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  cursor?: string;
  limit?: number;
  hasUserInputDate: boolean;

  // 篩選條件
  accommodationAmenities?: string[]; // 住宿設施
  roomTypeAmenities?: string[]; // 房型設施
  favorites?: boolean;
  userId?: number;

  // 由 favorites + userId 推導出來
  favoriteIds?: number[];
}

// 詳細版：單筆住宿用
export interface AccommodationDTO {
  id: number;
  name: string;
  address: string;
  description: string | null;

  latitude: number | null;
  longitude: number | null;

  checkInTime: string | null;
  checkOutTime: string | null;

  city: string;
  type: string;

  reviewSummary: {
    averageRating: number | null;
    reviewCount: number;
  };

  images: any[];
  contacts: any[];

  amenities: AmenityDTO[];

  roomTypes: RoomTypeDTO[];

  reviews: ReviewDTO[];
}

export interface AmenityDTO {
  id: number;
  name: string;
  type: string;
}

export interface RoomTypeDTO {
  id: number;
  name: string;
  description: string | null;
  basePrice: number;
  maxCapacity: number;
  totalRooms: number;
  bedType: string | null;
  amenities: AmenityDTO[];
}

export interface ReviewDTO {
  id: number;
  ratingScore: number;
  comment: string;
  reviewDate: Date;
  user: UserDTO;
}

export interface UserDTO {
  id: number;
  fullName: string;
  nickname: string;
  avatar: string | null;
}
