// src/interfaces/m2/packing-interface.ts

export interface PackingCreateDTO {
  TripPlanId: number;
  userId: number;
  name: string;
  isPacked?: boolean;
}

export interface PackingUpdateDTO {
  name?: string;
  isPacked?: boolean;
}
