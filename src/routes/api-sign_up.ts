import express from "express";
import type { Request, Response, Router } from "express";
import { prisma } from "../utils/prisma-pagination.js";
import bcrypt from "bcrypt";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
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
