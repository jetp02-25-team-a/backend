// src/interfaces/m2/tripDetail-interface.ts

export type TripDetailType = "spot" | "hotel" | "food" | "custom";

/**
 * 建立 TripPlanDetail 用的 DTO
 */
export interface CreateTripDetailDTO {
  type: TripDetailType;

  /** 景點 TripPlanPlace.id 或 住宿 TripPlanAccommodation.id */
  referenceId?: number;

  /** food / custom 時由前端給 */
  title?: string;
  address?: string;
  url?: string;

  startDate: string; // ISO
  endDate: string; // ISO

  stayHour?: number;
  stayMin?: number;
  order?: number;
}

/**
 * 更新 TripPlanDetail
 */
export interface UpdateTripDetailDTO extends Partial<CreateTripDetailDTO> {}
