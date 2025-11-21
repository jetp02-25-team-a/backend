// src/interfaces/m2/packing-interface.ts

export interface PackingCreateDTO {
  TripPlanId: number;
  userId: number;
  name: string;
  isChecked?: boolean;
  templateId?: number | null;
}

export interface PackingUpdateDTO {
  name?: string;
  isChecked?: boolean;
  templateId?: number | null;
}
