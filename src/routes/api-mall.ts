import express, { response } from "express";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma-pagination.js";
import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";
import { Merchant, CreditOneTimePayment } from "node-ecpay-aio";
import "dotenv/config";

import type { ApiResponse, ApiErrorResponse } from "../interfaces/index.js";
import type { CreditOneTimePaymentParams } from "node-ecpay-aio/dist/types/index.js";

const router = express.Router();

const merchant = new Merchant("Test", {
  MerchantID: process.env.MERCHANT_ID || "",
  HashKey: process.env.ECPAY_HASHKEY || "",
  HashIV: process.env.ECPAY_HASHIV || "",
  ReturnURL: "https://declaratory-abdiel-numbingly.ngrok-free.dev/api/order",
  ClientBackURL: "http://localhost:3000/shops",
});

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

//拿取變體資料
router.get(
  "/variant/:variant_id",
  async (req: Request, res: Response<ApiResponse>) => {
    const id = parseInt(req.params.variant_id);
    if (!id) {
      const response: ApiErrorResponse = {
        success: false,
        error: "找不到該產品",
      };
      res.status(401).json(response);
    }
    const data = await prisma.productVariant.findUnique({
      where: { id: id },
      include: {
        Product: true,
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

router.get("/checkout", async (req: Request, res: Response) => {
  try {
    const baseParams = {
      // 必填參數
      MerchantTradeNo: `test${Date.now()}`, // 訂單編號 (唯一值)
      MerchantTradeDate: new Date().toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      TotalAmount: 100, // 交易金額
      TradeDesc: "測試商品交易", // 交易描述
      ItemName: "測試商品A#測試商品B", // 商品名稱 (用 # 分隔)
    };

    const params: CreditOneTimePaymentParams = {
      UnionPay: 2, // [需申請] 銀聯卡: 0 (可用, default) | 1 (導至銀聯網) | 2 (不可用)
    };

    const payment = merchant.createPayment(
      CreditOneTimePayment,
      baseParams,
      params
    );
    const htmlRedirectPostForm = await payment.checkout();
    res.send(htmlRedirectPostForm);
  } catch (error) {
    console.error("建立訂單失敗:", error);
    res.status(500).send("建立訂單時發生錯誤。");
  }
});

router.post("/order", (req: Request, res: Response) => {
  console.log(req.body);
  res.send("1|OK");
});

export default router;
