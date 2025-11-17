import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import upload from "../utils/upload-images-chat";
import { requireAuth, jwtParseMiddleware } from "../middleware/jwt";

const router = express.Router();

function decodeToken(req: Request) {
  const token = req.headers["authorization"];
  //去掉前面七個字Bearer
  //解開jwt
  if (!token) return;
  try {
    const result = jwt.verify(
      token.substring(7),
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    return result;
  } catch (error) {
    return undefined;
  }
}

router.get("/allmessage", async (req: Request, res: Response) => {
  const payload = decodeToken(req); //當前使用者id
  const { receiverId, roomId } = req.query; //跟他對話的人的id 或對話房間的ｉｄ
  let data;
  try {
    if (!payload) return res.status(401).json({ message: "未授權" });
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
          messageType: true,
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
          roomId: +roomId, //只需要 roomId，不需要過濾 senderId
        },
        select: {
          content: true,
          createdAt: true,
          updatedAt: true,
          receiverId: true,
          senderId: true,
          messageType: true,
          Sender: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
      });
    }

    res.status(200).json({ success: true, data: data });
  } catch (err) {
    console.log(err);
  }
});

//根據行程 ID ${itineraryId} 尋找對應的聊天室..
//const response = await fetch(`${API_SERVER}/itineraries/${itineraryId}/room`);
router.get(
  "/itineraries/:itineraryId/room",
  async (req: Request, res: Response) => {
    const payload = decodeToken(req);
    if (!payload) return res.status(401).json({ message: "未授權" });
    const { itineraryId } = req.params;
    try {
      const result = await prisma.room.findFirst({
        where: {
          Itineraries: {
            some: {
              id: +itineraryId,
            },
          },
        },
        select: {
          id: true,
          roomName: true,
        },
      });

      if (result) {
        res.status(200).json({ success: true, data: result });
      } else {
        res.status(404).json({ success: false, message: "找不到對應的聊天室" });
      }
    } catch (err) {
      console.log(err);
    }
  }
);

// 根據房間id 取得所有對話
// `${API_SERVER}/messages/room/${roomId}
router.get("/messages/room/:roomId", async (req: Request, res: Response) => {
  console.log("開始找房間訊息===>");
  const payload = decodeToken(req);
  if (!payload) return res.status(401).json({ message: "未授權" });
  const { roomId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: {
        roomId: +roomId,
      },
      select: {
        receiverId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        senderId: true,
        messageType: true,
        Sender: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 標記個人聊天為已讀
router.post("/mark-read-user", async (req: Request, res: Response) => {
  const { senderId, receiverId } = req.body;

  try {
    await prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: receiverId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.status(200).json({ success: true, message: "已標記為已讀" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 標記群組聊天為已讀
router.post("/mark-read-room", async (req: Request, res: Response) => {
  const { roomId, userId } = req.body;

  try {
    await prisma.message.updateMany({
      where: {
        roomId: +roomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.status(200).json({ success: true, message: "已標記為已讀" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

//視窗的圖片上傳

// 單張圖片上傳
router.post(
  "/upload",
  jwtParseMiddleware,
  requireAuth,
  upload.single("image"),
  async (req: Request, res: Response) => {
    const userId = req.user!.user_id; // 已保證存在
    const filename = req.file?.filename; //檔案名稱
    const { roomId, receiverId } = req.body; //接收者id 或 房間id

    if (!filename) {
      return res.status(400).json({ message: "未上傳檔案" });
    }
    //1.創建新的對話紀錄 且類型設定為image 並將檔案名稱存在content欄位
    const result = await prisma.message.create({
      data: {
        senderId: userId,
        content: filename,
        messageType: "image",
        roomId: +roomId || null, // 沒有就存 null
        receiverId: +receiverId || null, // 團體視窗就沒有接收者
      },
    });
    if (result) {
      console.log("圖片訊息已存入資料庫:", result);
      // 上傳成功後，檔案資訊在 req.file
      return res.json({ filename: req.file?.filename });
    }

    // 上傳失敗
    return res.json({ message: "上傳失敗" });
  }
);

export default router;
