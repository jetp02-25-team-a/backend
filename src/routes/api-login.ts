import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma-pagination.js";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type {
  User,
  ApiResponse,
  ApiErrorResponse,
  JwtPayload,
  LoginSuccessResponse,
} from "../interfaces/index.js";
import { loginSchema } from "../schemas/index.js";

const router = express.Router();

//JWT設定
const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "2h";

router.post("/login", async (req: Request, res: Response) => {
  try {
    // 驗證輸入資料
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    //尋找登入會員
    const user = await prisma.user.findUnique({
      where: { email },
    });

    //找不到輸入email
    if (!user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "找不到此用戶",
      };
      return res.status(401).json(errorResponse);
    }

    //密碼驗證
    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "帳號或密碼錯誤",
      };
      return res.status(401).json(errorResponse);
    }

    // 成功登入，生成 JWT token
    const payload: JwtPayload = {
      user_id: user.id,
      email: user.email,
      nickname: user.nickname,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const response: LoginSuccessResponse = {
      success: true,
      data: {
        user: {
          user_id: user.id,
          email: user.email,
        },
        token,
      },
      message: "登入成功",
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "資料驗證失敗",
        details: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return res.status(400).json(errorResponse);
    }

    console.error("登入失敗:", error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: "伺服器內部錯誤，請稍後再試",
    };
    res.status(500).json(errorResponse);
  }
});

router.post("/signup", async (req: Request, res: Response) => {
  //拿取資料
  const { email, password, nickname } = req.body;

  //密碼雜湊
  const password_hash = await bcrypt.hash(password, 12);

  const result = await prisma.user.create({
    data: {
      email: email,
      password: password_hash,
      nickname: nickname,
    },
  });

  res.status(200).json(result);
});

export default router;
