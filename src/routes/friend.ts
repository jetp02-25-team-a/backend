import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import { ca } from "zod/v4/locales";
//friendships<= 路徑
const router = express.Router();

// {
//   user_id: 2,
//   email: 'user@test.com',
//   nickname: 'TestUser',
//   avatar: null,
//   iat: 1761978258,
//   exp: 1762064658
// }

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

//取得所有好友關係
router.get("/", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  try {
    if (!payload) return;
    const data = await prisma.friendship.findMany({
      where: {
        userId: payload.user_id,
        status: 1, // 只回傳已接受的好友
      },
      select: {
        User: {
          select: {
            id: true,
            avatar: true,
            nickname: true,
          },
        },
      },
    });
    //攤平
    const users = data.map((f) => f.User);
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.log(err);
  }
});

//取得所有好友關係＋行程 的 最新一條訊息
router.get("/allmessage", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  try {
    if (!payload) return;
    //1. 先找出所有好友
    const friendships = await prisma.friendship.findMany({
      where: {
        userId: payload.user_id,
        status: 1, // 只取已接受的好友
      },
      include: {
        Friend: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });
    // console.log("friendships=>", friendships);
    //2.用找出的好友再去找第一條訊息
    //等全部查完才拿到資料
    const allFriendLatestMessage = await Promise.all(
      friendships.map(async (f) => {
        const LatestMessage = await prisma.message.findFirst({
          where: {
            OR: [
              // 我傳給對方
              { senderId: payload.user_id, receiverId: f.friendId },
              // 對方傳給我
              { senderId: f.friendId, receiverId: payload.user_id },
            ],
          },
          select: {
            content: true,
            isRead: true,
            senderId: true,
            receiverId: true,
          },
          orderBy: {
            createdAt: "desc", //搭配findFirst ＝ 找到最新
          },
        });
        return { friendData: f.Friend, LatestMessage: LatestMessage };
      })
    );

    // console.log("allFriendLatestMessage=>", allFriendLatestMessage);

    //3.找出使用者擁有的所有房間
    const rooms = await prisma.roomMember.findMany({
      where: {
        userId: payload.user_id,
      },
      include: {
        Room: true,
      },
    });
    // console.log("rooms=>", rooms);

    //4.在透過所有房間去搜尋message最新的最新訊息
    const allRoomsLatestMessages = await Promise.all(
      rooms.map(async (room) => {
        const roomLatestMessage = await prisma.message.findFirst({
          where: { senderId: payload.user_id, roomId: room.roomId },
          select: {
            content: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        return { roomData: room.Room, LatestMessage: roomLatestMessage };
      })
    );

    const data = { allRoomsLatestMessages, allFriendLatestMessage };
    return res.json({ success: true, data: data });
  } catch (err) {
    console.log(err);
  }
});

router.get("/userinfo", async (req: Request, res: Response) => {
  const { userId } = req.query;
  console.log("userId=>", userId);
  try {
    if (!userId) return;
    const result = await prisma.user.findFirst({
      where: {
        id: +userId,
      },
      include: {
        Posts: true,
        Favorites: true,
        FriendshipsFriend: {
          where: { status: 1 },
          include: {
            User: {
              select: {
                avatar: true,
                nickname: true,
              },
            },
          },
        },
      },
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.log(err);
  }
});

// 送出好友邀請或處理已存在的反向邀請（若對方已先邀請，則直接互為好友）
router.post("/add", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  if (!payload)
    return res.status(401).json({ success: false, message: "未授權" });
  const { friendId } = req.body;
  try {
    // 不允許加自己
    if (payload.user_id === friendId) {
      return res
        .status(400)
        .json({ success: false, message: "不能加入自己為好友" });
    }

    // 檢查是否已有直接紀錄
    const existing = await prisma.friendship.findFirst({
      where: { userId: payload.user_id, friendId: friendId },
    });
    if (existing) {
      if (existing.status === 1) {
        return res.status(200).json({ success: true, message: "已為好友" });
      }
      if (existing.status === 0) {
        return res.status(200).json({ success: true, message: "邀請已送出" });
      }
      // status === 2 (rejected) -> 重新送出
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 0 },
      });
      return res.status(200).json({ success: true, message: "邀請已重新送出" });
    }

    // 檢查反向邀請（對方是否已向我發送邀請）
    const reverse = await prisma.friendship.findFirst({
      where: { userId: friendId, friendId: payload.user_id },
    });
    if (reverse) {
      if (reverse.status === 0) {
        // 對方曾發送邀請給我：將該筆改為 accepted，並建立我方的 accepted 紀錄
        await prisma.friendship.update({
          where: { id: reverse.id },
          data: { status: 1 },
        });

        const reciprocal = await prisma.friendship.findFirst({
          where: { userId: payload.user_id, friendId: friendId },
        });
        if (reciprocal) {
          await prisma.friendship.update({
            where: { id: reciprocal.id },
            data: { status: 1 },
          });
        } else {
          await prisma.friendship.create({
            data: { userId: payload.user_id, friendId: friendId, status: 1 },
          });
        }

        return res.status(200).json({ success: true, message: "已成為好友" });
      }
      if (reverse.status === 1) {
        // 已為好友（反向已存在 accepted），建立或更新我方紀錄為 accepted
        await prisma.friendship.upsert({
          where: { id: reverse.id },
          create: { userId: payload.user_id, friendId: friendId, status: 1 },
          update: { status: 1 },
        });
        return res.status(200).json({ success: true, message: "已為好友" });
      }
    }

    // 正常情況：建立 pending 的邀請（status = 0）
    await prisma.friendship.create({
      data: { userId: payload.user_id, friendId: friendId, status: 0 },
    });
    return res.status(200).json({ success: true, message: "邀請已送出" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 取得我收到的 pending 好友邀請
router.get("/requests", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  if (!payload)
    return res.status(401).json({ success: false, message: "未授權" });
  try {
    const requests = await prisma.friendship.findMany({
      where: { friendId: payload.user_id, status: 0 },
      include: {
        User: {
          select: { id: true, nickname: true, fullName: true, avatar: true },
        },
      },
      orderBy: { id: "desc" },
    });
    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

//依照 ID 找到friendship 的id
router.post("/findFriendshipId", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  if (!payload)
    return res.status(401).json({ success: false, message: "未授權" });
  const { friendId } = req.body;
  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        // userId: payload.user_id,
        // friendId: friendId,
        // 顛倒找因為是對方發送邀請的
        userId: friendId,
        friendId: payload.user_id,
        status: 0,
      },
    });
    if (!friendship) {
      return res
        .status(404)
        .json({ success: false, message: "找不到好友關係" });
    }

    return res
      .status(200)
      .json({ success: true, data: { friendshipId: friendship.id } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 回應邀請：接受 (response = 1) 或 拒絕 (response = 2)
router.post("/respond", async (req: Request, res: Response) => {
  console.log("進入respond");
  const payload = decodeToken(req);
  if (!payload)
    return res.status(401).json({ success: false, message: "未授權" });
  const { friendshipId, response } = req.body; // response: 1 accept, 2 reject
  console.log("friendshipId=>", friendshipId, response);
  try {
    const f = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f)
      return res.status(404).json({ success: false, message: "找不到邀請" });
    // 只有被邀請人可以回應
    if (f.friendId !== payload.user_id)
      return res
        .status(403)
        .json({ success: false, message: "沒有權限回應此邀請" });

    if (response === 1) {
      // 接受：將原邀請改為 accepted 並建立反向 accepted 紀錄
      await prisma.friendship.update({
        where: { id: f.id },
        data: { status: 1 },
      });

      const reciprocal = await prisma.friendship.findFirst({
        where: { userId: payload.user_id, friendId: f.userId },
      });
      if (reciprocal) {
        await prisma.friendship.update({
          where: { id: reciprocal.id },
          data: { status: 1 },
        });
      } else {
        await prisma.friendship.create({
          data: { userId: payload.user_id, friendId: f.userId, status: 1 },
        });
      }

      return res.status(200).json({ success: true, message: "已接受邀請" });
    } else {
      // 拒絕
      await prisma.friendship.update({
        where: { id: f.id },
        data: { status: 2 },
      });
      return res.status(200).json({ success: true, message: "已拒絕邀請" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;
