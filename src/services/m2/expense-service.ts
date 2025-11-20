// src/services/m2/expense-service.ts
import { PrismaClient } from "../../generated/prisma";
import type {
  ExpenseCreateDTO,
  ExpenseUpdateDTO,
} from "../../interfaces/m2/expense-interface";

const prisma = new PrismaClient();

export const getExpensesByTripService = async (tripId: number) => {
  return prisma.expense.findMany({
    where: { tripPlanId: tripId },
    orderBy: { expenseDate: "asc" },
  });
};

export const getExpenseByIdService = async (id: number) => {
  return prisma.expense.findUnique({
    where: { id },
  });
};

export const createExpenseService = async (data: ExpenseCreateDTO) => {
  return prisma.expense.create({
    data: {
      ...data,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : null,
    },
  });
};

export const updateExpenseService = async (
  id: number,
  data: ExpenseUpdateDTO
) => {
  return prisma.expense.update({
    where: { id },
    data: {
      ...data,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
    },
  });
};

export const deleteExpenseService = async (id: number) => {
  return prisma.expense.delete({ where: { id } });
};
