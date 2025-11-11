export interface Expense {
  id: number;
  tripPlanId: number;
  userId: number;
  title: string;
  amount: number;
  typeId?: number | null;
  area?: string | null;
  expenseDate?: Date;
  createdAt?: Date;
}

export interface PackingItem {
  id: number;
  TripPlanId: number;
  userId: number;
  name: string;
  isChecked: boolean;
  templateId?: number | null;
}

export interface TripPlan {
  id: number;
  userId: number;
  title: string;
  area: string;
  startDate: string;
  endDate: string;
  url: string;
}
