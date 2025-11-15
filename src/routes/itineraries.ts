import express from "express";
import type { Request, Response } from "express";
import { json, object, success, tuple } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import moment from "moment-timezone";

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
//<= 路徑
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

// 建立行程
router.post("/create-itinerary", async (req: Request, res: Response) => {
  const payload = decodeToken(req); //user_id ,
  const { title, area, startDay, endDay, startTime, figure } = req.body;
  console.log({ title, area, startDay, endDay, startTime, figure });

  try {
    if (!payload) return;
    // 使用交易確保建立行程、聊天室與成員一致
    const [itinerary, room] = await prisma.$transaction([
      prisma.itinerary.create({
        data: {
          userId: payload.user_id,
          title: title,
          area: area,
          figure: figure,
        },
      }),
      prisma.room.create({
        data: {
          roomName: title ? `行程: ${title}` : `Itinerary-${Date.now()}`,
        },
      }),
    ]);

    // 更新 itinerary 加上 roomId
    await prisma.itinerary.update({
      where: { id: itinerary.id },
      data: { roomId: room.id },
    });

    // 將使用者加入 user_itineraries 與房間成員
    await prisma.userItinerary.create({
      data: {
        userId: payload.user_id,
        itineraryId: itinerary.id,
      },
    });
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: payload.user_id,
      },
    });

    //2.建立每日行程
    const start = moment.tz(startDay, "Asia/Taipei"); //2025-11-10",轉亞洲本地端
    const end = moment.tz(endDay, "Asia/Taipei");

    const totalDays = end.diff(start, "days") + 1; //取得行程天數

    const result = await Promise.all(
      Array.from({ length: totalDays }).map((_, i) => {
        // const dayDate = start.clone().add(i, "days").startOf("day"); //moment 轉 datetime 本地 UTC
        const dayDate = start.clone().add(i, "days"); //moment 轉 datetime 本地 UTC
        const dayStartTime = moment(
          `${dayDate.format("YYYY-MM-DD")} ${startTime}`,
          "YYYY-MM-DD HH:mm"
        ).toDate();

        return prisma.itineraryDay.create({
          data: {
            itineraryId: itinerary.id,
            dayDate: dayDate.toDate(),
            startTime: dayStartTime,
            status: 1,
          },
        });
      })
    );

    //3.回傳訊息
    if (result) {
      console.log("is send");
      res.status(200).json({
        success: true,
        message: "行程建立完成",
        itineraryId: itinerary.id,
        roomId: room.id,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//更新文章內容
router.put("/update-article", async (req: Request, res: Response) => {
  const { itineraryId, title, content } = req.body;

  if (!itineraryId || !title || !content) {
    return res.status(400).json({
      success: false,
      message: "缺少必要參數（itineraryId, title, content）",
    });
  }

  try {
    // 檢查文章是否存在
    const existingArticle = await prisma.article.findFirst({
      where: { itineraryId: Number(itineraryId) },
    });

    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: "文章不存在，請先建立文章",
      });
    }

    // 更新文章
    const result = await prisma.article.update({
      where: { id: existingArticle.id },
      data: {
        title: title,
        content: content,
      },
    });

    return res.status(200).json({
      success: true,
      message: "文章更新成功",
      data: result,
    });
  } catch (err) {
    console.error("❌ /update-article 錯誤:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

//輸入行程id取得該行程的天數和天數下的所有nodes和node 下面的googlePlace資訊 id:22
// ✅ 取得行程詳細（天 + nodes + attraction）
// 在您的後端檔案中，找到這段程式碼並替換：
router.get("/detail", async (req: Request, res: Response) => {
  const { itineraryId } = req.query;

  if (!itineraryId) {
    return res.status(400).json({ error: "缺少 itineraryId" });
  }

  try {
    const result = await prisma.itineraryDay.findMany({
      where: {
        itineraryId: Number(itineraryId),
        status: 1,
      },
      select: {
        id: true,
        itineraryId: true,
        dayDate: true,
        startTime: true,
        Nodes: {
          where: { status: 1 },
          select: {
            id: true,
            durationMinutes: true,
            order: true,
            attractionId: true,
            Attraction: {
              select: {
                id: true,
                name: true,
                addrFull: true,
                lat: true,
                lng: true,
                image: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        StayNodes: true,
      },
      orderBy: { dayDate: "asc" },
    });

    // ✅ 轉換資料格式：將 Attraction 重新命名為 Place
    const transformedResult = result.map((day) => ({
      ...day,
      Nodes: day.Nodes.map((node) => ({
        ...node,
        Place: node.Attraction, // ✅ 將 Attraction 重新命名為 Place
        // 不要包含原本的 Attraction
      })),
    }));

    res.status(200).json({ success: true, data: transformedResult });
  } catch (err) {
    console.error("❌ /detail API error:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});
// router.get("/detail", async (req: Request, res: Response) => {
//   const { itineraryId } = req.query;

//   if (!itineraryId) {
//     return res.status(400).json({ error: "缺少 itineraryId" });
//   }

//   try {
//     const result = await prisma.itineraryDay.findMany({
//       where: {
//         itineraryId: Number(itineraryId),
//         status: 1,
//       },
//       select: {
//         id: true,
//         itineraryId: true,
//         dayDate: true,
//         startTime: true,
//         Nodes: {
//           where: { status: 1 },
//           select: {
//             id: true,
//             durationMinutes: true,
//             order: true,
//             attractionId: true,
//             Attraction: {
//               select: {
//                 id: true,
//                 name: true,
//                 addrFull: true,
//                 lat: true,
//                 lng: true,
//                 image: true,
//               },
//             },
//           },
//           orderBy: { order: "asc" }, // ✅ 依順序排列節點
//         },
//         StayNodes: true,
//       },
//       orderBy: { dayDate: "asc" }, // ✅ 天數按日期排序
//     });

//     res.status(200).json({ success: true, data: result });
//   } catch (err) {
//     console.error("❌ /detail API error:", err);
//     res.status(500).json({ error: "伺服器錯誤" });
//   }
// });

//輸入行程id取得該行程的天數和天數下的所有nodes和node 下面的googlePlace資訊 id:22 包含持有者user資料
router.get("/itinerary-list", async (req: Request, res: Response) => {
  const { itineraryId, userId } = req.query;

  if (!itineraryId || !userId) {
    return res.status(400).json({ error: "缺少必要參數" });
  }

  try {
    const result = await prisma.user.findMany({
      where: {
        id: Number(userId),
      },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        avatar: true,
        Itineraries: {
          where: {
            id: Number(itineraryId),
            status: 1,
          },
          include: {
            UserLinked: {
              include: {
                User: {
                  select: {
                    id: true,
                    avatar: true,
                  },
                },
              },
            },
            Days: {
              where: {
                status: 1,
              },
              select: {
                dayDate: true,
                startTime: true,
                Nodes: {
                  where: { status: 1 },
                  select: {
                    id: true,
                    durationMinutes: true,
                    order: true,
                    Attraction: {
                      select: {
                        id: true,
                        name: true,
                        lat: true,
                        lng: true,
                        image: true,
                      },
                    },
                  },
                  orderBy: {
                    order: "asc",
                  },
                },
              },
              orderBy: {
                dayDate: "asc",
              },
            },
            Images: {
              select: {
                imageName: true,
              },
            },
            ItineraryComments: {
              select: {
                senderId: true,
                content: true,
                updatedAt: true,
                Sender: {
                  select: {
                    nickname: true,
                    fullName: true,
                    avatar: true,
                  },
                },
              },
              orderBy: {
                updatedAt: "desc",
              },
            },
            Article: {
              select: {
                title: true,
                content: true,
                publishedAt: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

//搜尋關鍵字附近的景點
// router.get("/search", async (req: Request, res: Response) => {
//   const { place } = req.query;
//   const query = typeof place === "string" ? place : "台北101";

//   const apiKey = process.env.GOOGLE_API_KEY;
//   //encodeURIComponent() 是用來把「文字」轉成「網址中可以安全使用的格式」。
//   const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
//     query
//   )}&key=${apiKey}&language=zh-TW`;
//   try {
//     // 1. 用關鍵字搜尋到的資料
//     const result = await fetch(url).then((r) => r.json());
//     // console.log("result=>", result);
//     // 2. 將所查到的資料存到資料庫
//     if (result.status === "OK" && result.results.length > 0) {
//       const createPlace = await Promise.all(
//         result.results.map(async (place: any) => {
//           const { name, place_id, formatted_address, geometry, photos } = place;

//           const exist = await prisma.googleMapPlace.findUnique({
//             where: { placeId: place.place_id },
//           });
//           if (exist) return exist;
//           //不存在執行創建
//           return await prisma.googleMapPlace.create({
//             data: {
//               placeId: place.place_id,
//               name: place.name,
//               formattedAddress: place.formatted_address,
//               lat: place.geometry.location.lat,
//               lng: place.geometry.location.lng,
//               photoReference: place.photos?.[0]?.photo_reference ?? null,
//             },
//           });
//         })
//       );
//       // 3. 在將存入資料庫的返回給 前端使用者顯示
//       //修改圖片路徑給前端完整的路徑
//       await Promise.all(
//         createPlace.map(async (c, i) => {
//           if (c.photoReference) {
//             const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${c.photoReference}&key=${process.env.GOOGLE_API_KEY}`;
//             const response = await fetch(imageUrl);
//             c.photoReference = response.url;
//           }
//         })
//       );

//       res.status(200).json({ success: true, data: createPlace });
//     }
//   } catch (err) {
//     console.log(err);
//   }
// });

//搜尋關鍵字景點 非google
router.get("/search", async (req: Request, res: Response) => {
  const { place } = req.query;
  const keyword = typeof place === "string" ? place : "台北101";

  try {
    const result = await prisma.attraction.findMany({
      where: {
        OR: [
          { name: { contains: keyword } },
          { nameZh: { contains: keyword } },
          { addrCity: { contains: keyword } },
          { addrDistrict: { contains: keyword } },
          { addrStreet: { contains: keyword } },
          { addrFull: { contains: keyword } },
        ],
      },
      select: {
        id: true,
        name: true,
        nameZh: true,
        addrCity: true,
        addrDistrict: true,
        addrFull: true,
        lat: true,
        lng: true,
        image: true,
      },
    });

    if (result) res.json({ success: true, message: "搜尋成功", data: result });
  } catch (err) {
    console.log(err);
  }
});

//輸入placeId 返回資訊
router.get("/place", async (req: Request, res: Response) => {
  const placeId = req.query.placeId as string;
  try {
    const result = await prisma.googleMapPlace.findFirst({
      where: {
        placeId: placeId,
      },
    });

    if (!result) return;
    // //修改圖片路徑給前端完整的路徑
    const imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${result.photoReference}&key=${process.env.GOOGLE_API_KEY}`;
    await fetch(imageUrl).then((r) => (result.photoReference = r.url));

    res.status(200).json(result);
  } catch (err) {
    console.log(err);
  }
});

// 定義資料結構
interface Itinerary {
  id?: number;
  itineraryId: number;
  dayDate: string | Date;
  startTime: string | Date;
  status?: number;
  Nodes?: any[];
  StayNodes?: any[];
  [key: string]: any; // 👈 這行是關鍵，允許用字串 key 存取屬性
}

router.post("/save", async (req: Request, res: Response) => {
  try {
    const { itineraryData: newItinerary } = req.body;

    console.log("=== /save API 收到的資料 ===");
    console.log("newItinerary:", JSON.stringify(newItinerary, null, 2));

    //=======================================================
    // ✅ 0. 檢查參數
    //=======================================================
    const itineraryId = newItinerary?.[0]?.itineraryId;
    if (!itineraryId) {
      return res.status(400).json({ error: "缺少 itineraryId" });
    }

    //=======================================================
    // ✅ 1. 抓現有行程（只抓 status=1 的）
    //=======================================================
    const oldItinerary = await prisma.itinerary.findFirst({
      where: { id: itineraryId, status: 1 },
      include: {
        Days: {
          where: { status: 1 },
          include: {
            Nodes: {
              where: { status: 1 },
            },
          },
          orderBy: { dayDate: "asc" },
        },
      },
    });

    if (!oldItinerary) {
      return res.status(404).json({ error: "舊行程不存在" });
    }

    //=======================================================
    // ✅ 2. 聰明更新：只更新有變化的部分
    //=======================================================
    for (const newDay of newItinerary) {
      // 找到對應的舊 Day
      const oldDay = oldItinerary.Days.find((d) => d.id === newDay.id);

      if (!oldDay) {
        // 新增的 Day - 創建新的
        console.log("🆕 創建新的 Day:", newDay.dayDate);
        const createdDay = await prisma.itineraryDay.create({
          data: {
            itineraryId,
            dayDate: new Date(newDay.dayDate),
            startTime: new Date(newDay.startTime),
            status: 1,
          },
        });

        // 創建這一天的所有 nodes
        for (let i = 0; i < newDay.Nodes.length; i++) {
          const node = newDay.Nodes[i];

          // ✅ 統一處理：支援 Place.id 和 Attraction.id 兩種格式
          const attractionId = node?.Place?.id || node?.Attraction?.id;

          if (attractionId) {
            console.log(
              `✅ 創建新 node：attractionId=${attractionId}, order=${i}, durationMinutes=${
                node.durationMinutes || 60
              }`
            );
            await prisma.itineraryNode.create({
              data: {
                itineraryDayId: createdDay.id,
                attractionId: attractionId,
                durationMinutes: node.durationMinutes || 60,
                order: i,
                status: 1,
              },
            });
          } else {
            console.warn(
              "⚠️ node 缺少有效的 attractionId，跳過該 node:",
              JSON.stringify(node, null, 2)
            );
          }
        }
      } else {
        // 現有的 Day - 更新 nodes
        console.log("🔄 更新現有的 Day:", newDay.dayDate, "dayId:", oldDay.id);

        // 先將這天的所有舊 nodes 標記為 status=0
        await prisma.itineraryNode.updateMany({
          where: { itineraryDayId: oldDay.id },
          data: { status: 0 },
        });

        // 重新創建這天的 nodes（基於新資料）
        for (let i = 0; i < newDay.Nodes.length; i++) {
          const node = newDay.Nodes[i];

          // ✅ 統一處理：支援 Place.id 和 Attraction.id 兩種格式
          const attractionId = node?.Place?.id || node?.Attraction?.id;

          if (attractionId) {
            console.log(
              `✅ 更新 node：attractionId=${attractionId}, order=${i}, durationMinutes=${
                node.durationMinutes || 60
              }`
            );
            await prisma.itineraryNode.create({
              data: {
                itineraryDayId: oldDay.id,
                attractionId: attractionId,
                durationMinutes: node.durationMinutes || 60,
                order: i,
                status: 1,
              },
            });
          } else {
            console.warn(
              "⚠️ node 缺少有效的 attractionId，跳過該 node:",
              JSON.stringify(node, null, 2)
            );
          }
        }
      }
    }

    //=======================================================
    // ✅ 3. 清理不存在的 Days
    //=======================================================
    const newDayIds = newItinerary.map((d) => d.id).filter(Boolean);
    const oldDayIds = oldItinerary.Days.map((d) => d.id);
    const deletedDayIds = oldDayIds.filter((id) => !newDayIds.includes(id));

    // 將已刪除的 days 和其 nodes 標記為 status=0
    for (const dayId of deletedDayIds) {
      console.log("🗑️ 刪除 Day:", dayId);
      await prisma.itineraryDay.update({
        where: { id: dayId },
        data: { status: 0 },
      });
      await prisma.itineraryNode.updateMany({
        where: { itineraryDayId: dayId },
        data: { status: 0 },
      });
    }

    //=======================================================
    // ✅ DONE
    //=======================================================
    console.log("✅ 聰明更新完成");
    return res.json({ success: true, message: "行程保存成功" });
  } catch (err) {
    console.error("❌ /save 發生錯誤:", err);
    return res.status(500).json({ error: "伺服器錯誤", details: err.message });
  }
});
// router.post("/save", async (req: Request, res: Response) => {
//   try {
//     const { itineraryData: newItinerary } = req.body;

//     console.log("newItinerary:", newItinerary);

//     //=======================================================
//     // ✅ 0. 檢查參數
//     //=======================================================
//     const itineraryId = newItinerary?.[0]?.itineraryId;
//     if (!itineraryId) {
//       return res.status(400).json({ error: "缺少 itineraryId" });
//     }

//     //=======================================================
//     // ✅ 1. 抓現有行程（只抓 status=1 的）
//     //=======================================================
//     const oldItinerary = await prisma.itinerary.findFirst({
//       where: { id: itineraryId, status: 1 },
//       include: {
//         Days: {
//           where: { status: 1 },
//           include: {
//             Nodes: {
//               where: { status: 1 },
//             },
//           },
//           orderBy: { dayDate: "asc" },
//         },
//       },
//     });

//     if (!oldItinerary) {
//       return res.status(404).json({ error: "舊行程不存在" });
//     }

//     //=======================================================
//     // ✅ 2. 聰明更新：只更新有變化的部分
//     //=======================================================
//     for (const newDay of newItinerary) {
//       // 找到對應的舊 Day
//       const oldDay = oldItinerary.Days.find((d) => d.id === newDay.id);

//       if (!oldDay) {
//         // 新增的 Day - 創建新的
//         const createdDay = await prisma.itineraryDay.create({
//           data: {
//             itineraryId,
//             dayDate: new Date(newDay.dayDate),
//             startTime: new Date(newDay.startTime),
//             status: 1,
//           },
//         });

//         // 創建這一天的所有 nodes
//         for (let i = 0; i < newDay.Nodes.length; i++) {
//           const node = newDay.Nodes[i];
//           if (node?.Place?.id) {
//             await prisma.itineraryNode.create({
//               data: {
//                 itineraryDayId: createdDay.id,
//                 attractionId: node.Place.id,
//                 durationMinutes: node.durationMinutes,
//                 order: i,
//                 status: 1,
//               },
//             });
//           }
//         }
//       } else {
//         // 現有的 Day - 更新 nodes

//         // 先將這天的所有舊 nodes 標記為 status=0
//         await prisma.itineraryNode.updateMany({
//           where: { itineraryDayId: oldDay.id },
//           data: { status: 0 },
//         });

//         // 重新創建這天的 nodes（基於新資料）
//         for (let i = 0; i < newDay.Nodes.length; i++) {
//           const node = newDay.Nodes[i];
//           if (node?.Place?.id) {
//             await prisma.itineraryNode.create({
//               data: {
//                 itineraryDayId: oldDay.id,
//                 attractionId: node.Place.id,
//                 durationMinutes: node.durationMinutes,
//                 order: i,
//                 status: 1,
//               },
//             });
//           }
//         }
//       }
//     }

//     //=======================================================
//     // ✅ 3. 清理不存在的 Days
//     //=======================================================
//     const newDayIds = newItinerary.map((d) => d.id).filter(Boolean);
//     const oldDayIds = oldItinerary.Days.map((d) => d.id);
//     const deletedDayIds = oldDayIds.filter((id) => !newDayIds.includes(id));

//     // 將已刪除的 days 和其 nodes 標記為 status=0
//     for (const dayId of deletedDayIds) {
//       await prisma.itineraryDay.update({
//         where: { id: dayId },
//         data: { status: 0 },
//       });
//       await prisma.itineraryNode.updateMany({
//         where: { itineraryDayId: dayId },
//         data: { status: 0 },
//       });
//     }

//     //=======================================================
//     // ✅ DONE
//     //=======================================================
//     console.log("✅ 聰明更新完成");
//     return res.json({ success: true });
//   } catch (err) {
//     console.error("❌ /save 發生錯誤:", err);
//     return res.status(500).json({ error: "伺服器錯誤" });
//   }
// });
// router.post("/save", async (req: Request, res: Response) => {
//   try {
//     const { itineraryData: newItinerary } = req.body;

//     console.log("newItinerary:", newItinerary);

//     //=======================================================
//     // ✅ 0. 檢查參數
//     //=======================================================
//     const itineraryId = newItinerary?.[0]?.itineraryId;
//     if (!itineraryId) {
//       return res.status(400).json({ error: "缺少 itineraryId" });
//     }

//     //=======================================================
//     // ✅ 1. 抓現有行程（只抓 status=1 的）
//     //=======================================================
//     const oldItinerary = await prisma.itinerary.findFirst({
//       where: { id: itineraryId, status: 1 },
//       include: {
//         Days: {
//           where: { status: 1 },
//           include: {
//             Nodes: {
//               where: { status: 1 },
//             },
//           },
//           orderBy: { dayDate: "asc" },
//         },
//       },
//     });

//     if (!oldItinerary) {
//       return res.status(404).json({ error: "舊行程不存在" });
//     }

//     //=======================================================
//     // ✅ 2. 全部舊資料改成 status=0
//     //=======================================================
//     await Promise.all(
//       oldItinerary.Days.map(async (d) => {
//         // 修改 Day
//         await prisma.itineraryDay.update({
//           where: { id: d.id },
//           data: { status: 0 },
//         });

//         // 修改 Node
//         await prisma.itineraryNode.updateMany({
//           where: { itineraryDayId: d.id },
//           data: { status: 0 },
//         });
//       })
//     );

//     //=======================================================
//     // ✅ 3. 根據 newItinerary 建立全新的天 ＆ node
//     //=======================================================
//     for (const day of newItinerary) {
//       //----------------------------------------------------
//       // ✅ 建立一天
//       //----------------------------------------------------
//       const newDay = await prisma.itineraryDay.create({
//         data: {
//           itineraryId,
//           dayDate: new Date(day.dayDate),
//           startTime: new Date(day.startTime),
//           status: 1,
//         },
//       });

//       //----------------------------------------------------
//       // ✅ 建立 node（按順序）
//       //----------------------------------------------------
//       for (let i = 0; i < day.Nodes.length; i++) {
//         const node = day.Nodes[i];

//         if (!node?.Place?.id) {
//           console.warn("⚠️ node 缺少 Place.id，跳過該 node");
//           continue;
//         }

//         await prisma.itineraryNode.create({
//           data: {
//             itineraryDayId: newDay.id,
//             attractionId: node.Place.id, // ✅ 只用 attractionId
//             durationMinutes: node.durationMinutes,
//             order: i,
//             status: 1,
//           },
//         });
//       }
//     }

//     //=======================================================
//     // ✅ DONE
//     //=======================================================
//     return res.json({ success: true });
//   } catch (err) {
//     console.error("❌ /save 發生錯誤:", err);
//     return res.status(500).json({ error: "伺服器錯誤" });
//   }
// });

//取得所有行程(依照地區)
router.get("/area", async (req: Request, res: Response) => {
  const { area } = req.query;
  if (!area) return;
  try {
    const allItinerary = await prisma.itinerary.findMany({
      where: {
        area: area.toString(),
        status: 1,
      },
      select: {
        id: true,
        title: true,
        figure: true,
        User: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            avatar: true,
          },
        },
        Images: {
          take: 1,
          select: {
            itineraryId: true,
            imageName: true,
          },
        },
        Article: {
          select: {
            title: true,
            content: true,
          },
        },
      },
    });
    res.status(200).json({ success: true, data: allItinerary });
  } catch (err) {
    console.log(err);
  }
});

//團體行程展示頁面 包含對話內容。和行程天數內容
router.get("/itineraries/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const itineraryDetail = await prisma.itinerary.findFirst({
      where: {
        id: +id,
      },
      include: {
        Days: true,
        ItineraryComments: true,
      },
    });
    res.status(200).json({ suceess: true, data: itineraryDetail });
  } catch (err) {
    console.log(err);
  }
});

//行程第三方人的留言功能
router.post("/create-comment", async (req: Request, res: Response) => {
  const { content, itineraryId, senderId } = req.body;
  try {
    await prisma.itineraryComment.create({
      data: {
        content: content,
        itineraryId: itineraryId,
        senderId: senderId,
      },
    });
    res.status(200).json({ success: true, message: "上傳成功" });
  } catch (err) {
    console.log(err);
  }
});

//修改留言內容
router.put("/put-comment", (req: Request, res: Response) => {
  const { itineraryId, senderId, content, commentId } = req.body;
  try {
    prisma.itineraryComment.update({
      where: {
        id: commentId,
      },
      data: {
        senderId: senderId,
        content: content,
      },
    });
    res.status(200).json({ success: true, message: "更新成功" });
  } catch (err) {
    console.log(err);
  }
});

//上傳團體行程內容
router.post("/create-article", async (req: Request, res: Response) => {
  const { itineraryId, title, content } = req.body;

  if (!itineraryId || !title || !content) {
    return res.status(400).json({
      success: false,
      message: "缺少必要參數（itineraryId, title, content）",
    });
  }

  try {
    // 檢查行程是否存在
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: Number(itineraryId) },
    });

    if (!itinerary) {
      return res.status(404).json({ success: false, message: "行程不存在" });
    }

    // 檢查文章是否已存在（itineraryId 應為 @unique）
    const existingArticle = await prisma.article.findFirst({
      where: { itineraryId: Number(itineraryId) },
    });

    if (existingArticle) {
      return res
        .status(400)
        .json({ success: false, message: "該行程已有文章，請使用更新功能" });
    }

    // 建立文章
    const result = await prisma.article.create({
      data: {
        itineraryId: Number(itineraryId),
        title: title,
        content: content,
      },
    });

    return res
      .status(201)
      .json({ success: true, message: "文章上傳成功", data: result });
  } catch (err) {
    console.error("❌ /create-article 錯誤:", err);
    return res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

//查找有無文在該行程的文章
router.get(
  "/check-article/:itineraryId",
  async (req: Request, res: Response) => {
    const { itineraryId } = req.params;

    if (!itineraryId) {
      return res
        .status(400)
        .json({ success: false, message: "缺少 itineraryId" });
    }

    try {
      const result = await prisma.article.findFirst({
        where: { itineraryId: Number(itineraryId) },
        select: { id: true, itineraryId: true },
      });

      console.log("🔍 check-article result:", result);

      if (result) {
        return res.status(200).json({ success: true, message: "文章已存在" });
      } else {
        return res
          .status(200)
          .json({ success: false, message: "尚未建立文章" });
      }
    } catch (err) {
      console.error("❌ /check-article 錯誤:", err);
      return res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
  }
);

// 設定上傳位置與檔名（使用 UUID）
// 取得 __dirname（ESM 默認沒有，所以要自己做）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上傳設定：存到 uploads 資料夾，檔名用 UUID
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../public/images/itineraries_photo"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // 取得原始檔案的副檔名（例如 .jpg）
    cb(null, uuidv4() + ext); // 使用 UUID 當新檔名，再加上原本的副檔名
  },
});

const upload = multer({ storage });

//處理圖片上傳
router.post(
  "/upload/:itineraryId",
  upload.single("image"),
  async (req, res) => {
    const { itineraryId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "沒有收到圖片" });
    }

    const filename = req.file.filename;
    console.log("filename =>", filename);

    // 這裡要改成「有圖片時才新增資料」
    const result = await prisma.itineraryImage.create({
      data: {
        imageName: filename,
        itineraryId: Number(itineraryId),
      },
    });

    res.json({
      message: "上傳成功",
      filename,
      url: `/uploads/${filename}`, // 前端想直接顯示這網址
    });
  }
);

//發送旅程邀約
router.post("/invite", async (req: Request, res: Response) => {
  const { itineraryId, senderId, receiverId } = req.body;
  try {
    // 1. 查詢行程取得 roomId
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      select: { roomId: true },
    });

    if (!itinerary?.roomId) {
      return res.status(404).json({
        success: false,
        message: "找不到對應的聊天室",
      });
    }

    // 2. 檢查發送者是否已經加入行程
    const existingUserItinerary = await prisma.userItinerary.findFirst({
      where: {
        userId: senderId,
        itineraryId: itineraryId,
      },
    });

    // 如果還沒加入,先將發送者加入行程
    if (!existingUserItinerary) {
      await prisma.userItinerary.create({
        data: {
          userId: senderId,
          itineraryId: itineraryId,
        },
      });
    }

    // 3. 檢查發送者是否已經加入聊天室
    const existingRoomMember = await prisma.roomMember.findFirst({
      where: {
        roomId: itinerary.roomId,
        userId: senderId,
      },
    });

    // 如果還沒加入,先將發送者加入聊天室
    if (!existingRoomMember) {
      await prisma.roomMember.create({
        data: {
          roomId: itinerary.roomId,
          userId: senderId,
        },
      });
    }

    // 4. 建立邀請記錄
    const result = await prisma.itineraryInvitation.create({
      data: {
        itineraryId: itineraryId,
        senderId: senderId,
        receiverId: receiverId,
        status: 0, //0 => pending
      },
    });

    res.status(200).json({ success: true, message: "已發送邀請" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 查詢自己所有接收到的行程邀約
router.get("/all-invite/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const received = await prisma.itineraryInvitation.findMany({
      where: {
        receiverId: +userId,
        status: 0,
      },
      include: {
        itinerary: {
          select: { userId: true, title: true },
        },
        sender: {
          select: { id: true, nickname: true, fullName: true, avatar: true },
        },
      },
    });

    const sent = await prisma.itineraryInvitation.findMany({
      where: {
        senderId: +userId,
        status: 0,
      },
      include: {
        itinerary: {
          select: { userId: true, title: true },
        },
        receiver: {
          select: { id: true, nickname: true, fullName: true, avatar: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        received,
        sent,
      },
      // received, // 收到的邀請
      // sent, // 送出的邀請
    });
    // res.status(200).json({ success: true, data: result });
  } catch (err) {}
});

//更新旅程邀約
router.patch("/invite", async (req: Request, res: Response) => {
  const { invitationId, invitationResponse } = req.body;

  try {
    //1.先修改invitation的資料
    const result = await prisma.itineraryInvitation.update({
      where: {
        id: invitationId,
      },
      data: {
        status: invitationResponse,
      },
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "找不到該邀請",
      });
    }

    //2.如果接收 將該使用者(receiverId)加入 user_itineraries 和聊天室中
    //0 pending 1 accept 2 reject
    if (invitationResponse === 1) {
      // ✅ 使用 invitation 記錄中的 receiverId (被邀請人)
      const receiverId = result.receiverId;

      // 查詢行程取得 roomId
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: result.itineraryId },
        select: { roomId: true },
      });

      if (!itinerary?.roomId) {
        return res.status(404).json({
          success: false,
          message: "找不到對應的聊天室",
        });
      }

      // 檢查被邀請人是否已經加入過行程
      const existingUserItinerary = await prisma.userItinerary.findFirst({
        where: {
          userId: receiverId,
          itineraryId: result.itineraryId,
        },
      });

      // 如果還沒加入，才新增
      if (!existingUserItinerary) {
        await prisma.userItinerary.create({
          data: {
            userId: receiverId,
            itineraryId: result.itineraryId,
          },
        });
      }

      // 檢查被邀請人是否已經加入過聊天室
      const existingRoomMember = await prisma.roomMember.findFirst({
        where: {
          roomId: itinerary.roomId,
          userId: receiverId,
        },
      });

      // 如果還沒加入，才新增
      if (!existingRoomMember) {
        await prisma.roomMember.create({
          data: {
            roomId: itinerary.roomId,
            userId: receiverId,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: "已接受邀請並加入行程",
      });
    }

    // 拒絕邀請的情況
    if (invitationResponse === 2) {
      return res.status(200).json({
        success: true,
        message: "已拒絕邀請",
      });
    }

    res.status(200).json({ success: true, message: "已更新狀態" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

//依照userid找尋目前持有的行程 排除已經有效日期已過期的資訊
router.get("/user-itineraries", async (req: Request, res: Response) => {
  const payload = decodeToken(req);
  if (!payload)
    return res.status(401).json({ success: false, message: "未授權" });

  const { user_id } = payload;
  console.log("payload=>", user_id);

  try {
    const result = await prisma.userItinerary.findMany({
      where: {
        userId: Number(user_id),
      },
      include: {
        Itinerary: {
          where: {
            status: 1,
            Days: {
              some: {
                //至少有一天符合
                dayDate: {
                  gte: new Date(), //過濾出未來的行程
                },
              },
            },
          },
          select: {
            id: true,
            title: true,
            area: true,
            figure: true,
            Days: {
              orderBy: {
                dayDate: "asc",
              },
              take: 1,
              select: {
                dayDate: true,
              },
            },
          },
        },
      },
    });
    if (result) res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.log(err);
  }
});

// ✅ 附近景點 API - 使用 Haversine 公式計算距離
router.get("/nearby", async (req: Request, res: Response) => {
  const { lat, lng, radius = 5 } = req.query;

  // 參數驗證
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "缺少必要參數 (lat, lng)",
    });
  }

  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);
  const searchRadius = parseFloat(radius as string); // 預設 5 公里

  if (isNaN(userLat) || isNaN(userLng) || isNaN(searchRadius)) {
    return res.status(400).json({
      success: false,
      message: "參數格式錯誤",
    });
  }

  try {
    // 1️⃣ 取得所有景點
    const allAttractions = await prisma.attraction.findMany({
      select: {
        id: true,
        name: true,
        nameZh: true,
        lat: true,
        lng: true,
        addrCity: true,
        addrDistrict: true,
        addrFull: true,
        image: true,
        tourism: true,
        natural: true,
        historic: true,
      },
    });

    // 2️⃣ 使用 Haversine 公式計算距離
    const nearbyAttractions = allAttractions
      .map((attraction) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          attraction.lat,
          attraction.lng
        );

        return {
          ...attraction,
          distance: parseFloat(distance.toFixed(2)), // 保留兩位小數
        };
      })
      .filter((attraction) => attraction.distance <= searchRadius) // 只保留在半徑內的
      .sort((a, b) => a.distance - b.distance); // 依距離排序 (由近到遠)

    res.status(200).json({
      success: true,
      message: `找到 ${nearbyAttractions.length} 個附近景點`,
      data: {
        center: { lat: userLat, lng: userLng },
        radius: searchRadius,
        count: nearbyAttractions.length,
        attractions: nearbyAttractions,
      },
    });
  } catch (err) {
    console.error("❌ /nearby 錯誤:", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});

// 🔧 Haversine 公式 - 計算兩個經緯度之間的距離 (公里)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球半徑 (公里)
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 返回距離 (公里)
}

// 將度數轉換為弧度
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

//更新文章
// router.put(
//   "/renew-article/:itineraryId",
//   async (req: Request, res: Response) => {
//     const { itineraryId, title, content } = req.body;
//     try {
//       const result = await prisma.article.update({
//         data: {
//           itineraryId: itineraryId,
//           title: title,
//           content: content,
//         },
//       });
//       if (result) res.status(200).json({ success: true, message: "上傳成功" });
//     } catch (err) {
//       console.log(err);
//     }
//   }
// );

export default router;
