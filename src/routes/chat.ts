import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";

const router = express.Router();

function decodeToken(req: Request) {
  const token = req.headers["authorization"];
  //去掉前面七個字Bearer
  //解開jwt
  if (!token) return;
  const result = jwt.verify(
    token.substring(7),
    process.env.JWT_SECRET as string
  ) as JwtPayload;
  return result;
}

router.get("/allmessage", async (req: Request, res: Response) => {
  const payload = decodeToken(req); //當前使用者id
  const { receiverId, roomId } = req.query; //跟他對話的人的id 或對話房間的ｉｄ
  let data;
  try {
    if (!payload) return;
    //個人
    if (receiverId) {
      data = await prisma.message.findMany({
        where: {
          OR: [
            {
              senderId: payload.user_id,
              receiverId: +receiverId, //轉number
            },
            {
              senderId: +receiverId, //轉number
              receiverId: payload.user_id,
            },
          ],
        },
        select: {
          content: true,
          createdAt: true,
          updatedAt: true,
          receiverId: true,
          Sender: {
            select: {
              id: true,
              avatar: true,
              nickname: true,
            },
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
      });
    }
    //團體
    if (roomId) {
      data = await prisma.message.findMany({
        where: {
          senderId: payload.user_id,
          roomId: +roomId, //轉number
        },
        select: {
          content: true,
          createdAt: true,
          updatedAt: true,
          receiverId: true,
          senderId: true,
        },
      });
    }

    res.status(200).json({ success: true, data: data });
  } catch (err) {
    console.log(err);
  }
});

export default router;
