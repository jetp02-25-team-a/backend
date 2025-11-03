import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma-pagination.js";
import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";

import type { ApiResponse, ApiErrorResponse } from "../interfaces/index.js";

const router = express.Router();

//關鍵字搜尋
router.get("/keyword", async (req: Request, res: Response) => {
  const keyword: string = req.query.keyword as string;
  const data = await prisma.product.findMany({
    where: {
      keyword: {
        contains: keyword,
      },
    },
    include: {
      ProductVariants: true,
      ProductPics: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: data,
  };

  res.json(response);
});

//推薦商品路由
router.get("/recommend", async (req: Request, res: Response<ApiResponse>) => {
  const data = await prisma.product.findMany({
    take: 12,
    skip: 30,
    include: {
      ProductVariants: true,
      ProductPics: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: data,
  };

  res.json(response);
});

//購物車
router.get(
  "/cart",
  jwtParseMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    res.json("ok");
  }
);

export default router;
