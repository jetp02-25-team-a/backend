// src/interfaces/m2/trip-interface.ts

export type TripType = "solo" | "friends" | "couple" | "family" | string;

export interface TripCreateDTO {
  userId: number;
  title: string;
  type?: TripType;
  destinationId?: number | null;
  startDate: string;
  endDate: string;
  url?: string | null;
}

export interface TripUpdateDTO {
  title?: string;
  type?: TripType;
  destinationId?: number | null;
  startDate?: string;
  endDate?: string;
  url?: string | null;
}
