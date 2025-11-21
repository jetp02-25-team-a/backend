import type { Request, Response, NextFunction } from "express";
import {
  getExpensesByTripService,
  getExpenseByIdService,
  createExpenseService,
  updateExpenseService,
  deleteExpenseService,
} from "../../services/m2/expense-service";

/**
 * GET /api/m2/expense/trip/:tripId
 * 取得某行程的所有記帳
 */
export const getExpenseList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tripId = Number(req.params.tripId);

    const list = await getExpensesByTripService(tripId);
    res.json(list);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/m2/expense/:id
 * 取得單筆記帳
 */
export const getExpenseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const item = await getExpenseByIdService(id);
    if (!item) return res.status(404).json({ message: "Expense not found" });

    res.json(item);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/m2/expense
 * 新增記帳
 */
export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const item = await createExpenseService(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/m2/expense/:id
 * 更新記帳
 */
export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const updated = await updateExpenseService(id, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/m2/expense/:id
 * 刪除記帳
 */
export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    await deleteExpenseService(id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};
