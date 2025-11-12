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

router.post("/add", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  if (!payload) return;
  const { friendId } = req.body;
  try {
    await prisma.friendship.create({
      data: {
        userId: payload?.user_id as number,
        friendId: friendId,
      },
    });
    res.status(200).json({ success: true, message: "訊息已送出" });
  } catch (err) {
    console.log(err);
  }
});

export default router;
