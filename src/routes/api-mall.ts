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
    take: 24,
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

//新上架
router.get("/new", async (req: Request, res: Response<ApiResponse>) => {
  const data = await prisma.product.findMany({
    take: 24,
    orderBy: {
      id: "desc",
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

//熱門
router.get("/hot", async (req: Request, res: Response<ApiResponse>) => {
  const allProducts = await prisma.product.findMany({
    include: {
      ProductVariants: true,
      ProductPics: true,
    },
  });

  const sortedProducts = allProducts
    .map((product) => {
      const minStock = product.ProductVariants.reduce((min, variant) => {
        return Math.min(min, variant.stock);
      }, Infinity);

      return {
        ...product,
        _minStock: minStock,
      };
    })
    .sort((a, b) => a._minStock - b._minStock)
    .slice(0, 24);

  const response: ApiResponse = {
    success: true,
    data: sortedProducts,
  };

  res.json(response);
});

//拿取特定商品資料
router.get(
  "/product/:product_id",
  async (req: Request, res: Response<ApiResponse>) => {
    const id = parseInt(req.params.product_id);
    if (!id) {
      const response: ApiErrorResponse = {
        success: false,
        error: "找不到該產品",
      };
      res.status(401).json(response);
    }
    const data = await prisma.product.findUnique({
      where: { id: id },
      include: {
        ProductVariants: true,
        ProductPics: true,
      },
    });

    if (!data) {
      const response: ApiErrorResponse = {
        success: false,
        error: "找不到該產品",
      };
      res.status(401).json(response);
    }
    const response: ApiResponse = {
      success: true,
      data: data,
    };
    res.json(response);
  }
);

export default router;
