import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma-pagination.js";
import upload from "../utils/upload-images-avatar.js";
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
import { jwtParseMiddleware, requireAuth } from "../middleware/jwt.js";

interface UserUpdateData {
  nickname?: string | null;
  description?: string | null;
  fullName?: string | null;
  avatar?: string | null;
}

const router = express.Router();

//JWT設定
const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "2h";

//登入
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
      avatar: user.avatar,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const response: LoginSuccessResponse = {
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        nickname: user.nickname || "",
        avatar: user.avatar || "",
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

//註冊
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

//編輯資料-拿該使用者資料
router.get("/user/:id", async (req: Request, res: Response) => {
  const user_id = parseInt(req.params.id);
  if (isNaN(user_id)) return res.status(400).send("ID格式錯誤");
  const data = await prisma.user.findUnique({
    where: {
      id: user_id,
    },
  });

  if (!data) {
    return res.status(404).json({
      success: false,
      data: null,
      message: "找不到指定的會員", // 或是 "User not found"
    });
  }

  const response = {
    success: true,
    data: {
      user_id: data?.id,
      email: data?.email,
      nickname: data?.nickname || "",
      avatar: data?.avatar || "",
      description: data?.description || "",
      fullname: data?.fullName || "",
    },
    message: "成功",
  };
  res.json(response);
});

//編輯資料
router.put(
  "/user/:id",
  jwtParseMiddleware,
  requireAuth,
  upload.single("avatar"),
  async (req: Request, res: Response<ApiResponse>) => {
    const { nickname, description, fullName } = req.body;
    const filename = req.file?.filename;
    const user_id = parseInt(req.params.id);
    if (isNaN(user_id)) {
      const response = {
        success: false,
        message: "使用者ID錯誤",
      };
      return res.status(400).json(response);
    }

    const updateData: UserUpdateData = {
      nickname: nickname,
      description: description,
      fullName: fullName,
    };

    if (req.file) {
      updateData.avatar = filename;
    }

    const r = await prisma.user.update({
      where: { id: user_id },
      data: updateData,
    });

    const response = {
      success: true,
      data: r,
      message: "更改成功",
    };

    res.json(response);
  }
);

//JWT驗證
router.post("/auth", async (req: Request, res: Response) => {
  const JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const auth = req.get("Authorization");
  if (auth && auth.indexOf("Bearer") === 0) {
    const token = auth.slice(7);
    try {
      const result = jwt.verify(token, JWT_SECRET);
      res.status(200).json(result);
    } catch (e) {
      res.status(401).json({ message: "Invalid Token" });
    }
  } else {
    res
      .status(401)
      .json({ message: "Authorization header not found or malformed" });
  }
});

router.get("/auth", async (req: Request, res: Response) => {
  const JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const auth = req.get("Authorization");

  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const result = jwt.verify(token, JWT_SECRET);
      res.status(200).json(result); // 回傳 payload
    } catch (e) {
      res.status(401).json({ message: "Invalid Token" });
    }
  } else {
    res
      .status(401)
      .json({ message: "Authorization header not found or malformed" });
  }
});

export default router;
