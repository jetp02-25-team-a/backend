// src/interfaces/m2/expense-interface.ts

export interface ExpenseCreateDTO {
  tripPlanId: number;
  userId: number;
  category: string;
  amount: number;
  note?: string;
  expenseDate?: string; // ISO string
}

export interface ExpenseUpdateDTO {
  category?: string;
  amount?: number;
  note?: string;
  expenseDate?: string;
}
