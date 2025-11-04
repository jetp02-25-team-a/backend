export interface PlaceRow {
  place_id: number;
  type: "food" | "spot";
  name: string;
  introduce: string | null;
  contact: string | null;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: Date | string;
}

export interface PhotoRow {
  id: number;
  place_id: number;
  url: string;
}

export interface ReviewRow {
  id: number;
  place_id: number;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  content: string;
  created_at: Date | string;
}

export interface RatingDist {
  star: number;
  pct: number;
}
