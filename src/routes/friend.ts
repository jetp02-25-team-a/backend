import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import { ca } from "zod/v4/locales";

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
        Friend: {
          select: {
            id: true,
            avatar: true,
            nickname: true,
          },
        },
      },
    });
    //攤平
    const users = data.map((f) => f.Friend);
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
        Room: {
          include: {
            Members: {
              include: {
                User: {
                  select: {
                    id: true,
                    nickname: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    // console.log("rooms=>", rooms);

    //4.在透過所有房間去搜尋message最新的最新訊息
    const allRoomsLatestMessages = await Promise.all(
      rooms.map(async (room) => {
        const roomLatestMessage = await prisma.message.findFirst({
          where: { roomId: room.roomId },
          select: {
            content: true,
            senderId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        
        // 整理房間成員資訊
        const members = room.Room.Members.map((m) => m.User);
        
        return {
          roomData: {
            id: room.Room.id,
            roomName: room.Room.roomName,
            createdAt: room.Room.createdAt,
          },
          members: members, // 所有房間成員
          LatestMessage: roomLatestMessage,
        };
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

//確認是否為好友
router.get("/check", async (req: Request, res: Response) => {
  const { userId, friendId } = req.query; //想確認的對象id
  if (!userId || !friendId) {
    return res.status(400).json({ success: false, message: "缺少參數" });
  }
  try {
    const result = await prisma.friendship.findFirst({
      where: {
        status: 1,
        OR: [
          { userId: +userId, friendId: +friendId },
          { userId: +friendId, friendId: +userId },
        ],
      },
    });

    if (result) {
      return res
        .status(200)
        .json({ success: true, isFriend: true, message: "是好友關係" });
    } else {
      return res
        .status(200)
        .json({ success: true, isFriend: false, message: "非好友關係" });
    }
  } catch (err) {
    console.log(err);
  }
});

// 用使用者的 id 尋找擁有相同景點經驗的非朋友使用者
router.get("/similar-experience", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  if (!payload) {
    return res.status(401).json({ success: false, message: "未授權" });
  }

  const limit = Number(req.query.limit) || 20; // 可選的限制筆數

  try {
    // 1. 取得使用者擁有或參與的行程 ID
    const ownedItineraries = await prisma.itinerary.findMany({
      where: { userId: payload.user_id, status: 1 },
      select: { id: true },
    });

    const joinedItineraries = await prisma.userItinerary.findMany({
      where: { userId: payload.user_id },
      select: { itineraryId: true },
    });

    const allItineraryIds = [
      ...new Set([
        ...ownedItineraries.map((i) => i.id),
        ...joinedItineraries.map((j) => j.itineraryId),
      ]),
    ];

    if (allItineraryIds.length === 0) {
      return res
        .status(200)
        .json({ success: true, data: [], message: "尚無任何行程紀錄" });
    }

    // 2. 抓出使用者所有行程中的景點 (distinct attractionId)
    const userNodes = await prisma.itineraryNode.findMany({
      where: {
        attractionId: { not: null },
        status: 1,
        Day: {
          itineraryId: { in: allItineraryIds },
        },
      },
      select: { attractionId: true },
    });

    const experiencedAttractionIds = [
      ...new Set(userNodes.map((n) => n.attractionId as number)),
    ];

    if (experiencedAttractionIds.length === 0) {
      return res
        .status(200)
        .json({ success: true, data: [], message: "尚無景點經驗" });
    }

    // 3. 查詢已接受好友 (雙向)
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 1,
        OR: [{ userId: payload.user_id }, { friendId: payload.user_id }],
      },
      select: { userId: true, friendId: true },
    });

    const friendIds = new Set<number>();
    friendships.forEach((f) => {
      if (f.userId !== payload.user_id) friendIds.add(f.userId);
      if (f.friendId !== payload.user_id) friendIds.add(f.friendId);
    });

    // 4. 找出其他使用者 (排除自己 + 好友)，其行程含有上述景點
    // 只看「他們自己擁有的行程」；如果也要算他們參與的，可再加 userItinerary
    const candidateUsers = await prisma.user.findMany({
      where: {
        id: {
          notIn: [payload.user_id, ...Array.from(friendIds)],
        },
        Itineraries: {
          some: {
            status: 1,
            Days: {
              some: {
                Nodes: {
                  some: {
                    attractionId: { in: experiencedAttractionIds },
                    status: 1,
                  },
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        avatar: true,
        Itineraries: {
          where: { status: 1 },
          select: {
            id: true,
            Days: {
              select: {
                Nodes: {
                  where: {
                    status: 1,
                    attractionId: { in: experiencedAttractionIds },
                  },
                  select: {
                    attractionId: true,
                    Attraction: {
                      select: {
                        id: true,
                        name: true,
                        image: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      take: limit,
    });

    // 5. 整理重疊景點數與樣本
    const result = candidateUsers
      .map((u) => {
        const overlapped: {
          id: number;
          name: string | null;
          image: string | null;
        }[] = [];

        u.Itineraries.forEach((iti) => {
          iti.Days.forEach((d) => {
            d.Nodes.forEach((n) => {
              if (
                n.attractionId &&
                experiencedAttractionIds.includes(n.attractionId)
              ) {
                overlapped.push({
                  id: n.Attraction?.id ?? n.attractionId,
                  name: n.Attraction?.name ?? null,
                  image: n.Attraction?.image ?? null,
                });
              }
            });
          });
        });

        const uniqueOverlap = new Map<
          number,
          { id: number; name: string | null; image: string | null }
        >();
        overlapped.forEach((o) => {
          uniqueOverlap.set(o.id, o);
        });

        return {
          user: {
            id: u.id,
            nickname: u.nickname,
            fullName: u.fullName,
            avatar: u.avatar,
          },
          overlapCount: uniqueOverlap.size,
          // 完整的重疊景點列表
          overlappedAttractions: Array.from(uniqueOverlap.values()),
        };
      })
      .filter((r) => r.overlapCount > 0)
      .sort((a, b) => b.overlapCount - a.overlapCount);

    return res.status(200).json({
      success: true,
      // 總共有多少人與我有相同旅遊經驗
      totalMatches: result.length,
      data: result,
      meta: {
        experiencedAttractionCount: experiencedAttractionIds.length,
        candidates: result.length,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

export default router;
