import express from "express";
import type { Request, Response } from "express";
import { json, object, success, tuple } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import moment from "moment-timezone";
import { tr } from "zod/v4/locales";
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

  try {
    if (!payload) return;
    //1.先建立行程
    const itinerary = await prisma.itinerary.create({
      data: {
        userId: payload.user_id,
        title: title,
        area: area,
        figure: figure,
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
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//輸入行程id取得該行程的天數和天數下的所有nodes和node 下面的googlePlace資訊 id:22
// ✅ 取得行程詳細（天 + nodes + attraction）
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
                // address: true,
                lat: true,
                lng: true,
                image: true,
              },
            },
          },
          orderBy: { order: "asc" }, // ✅ 依順序排列節點
        },
        StayNodes: true,
      },
      orderBy: { dayDate: "asc" }, // ✅ 天數按日期排序
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("❌ /detail API error:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

//輸入行程id取得該行程的天數和天數下的所有nodes和node 下面的googlePlace資訊 id:22 包含持有者user資料
router.get("/itinerary-list", async (req: Request, res: Response) => {
  const { itineraryId, userId } = req.query;

  if (!itineraryId || !userId) return;
  try {
    const result = await prisma.user.findMany({
      where: {
        id: +userId,
      },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        Itineraries: {
          where: {
            id: +itineraryId,
            status: 1,
          },
          include: {
            Days: {
              select: {
                dayDate: true,
                startTime: true,
                Nodes: {
                  where: {
                    status: 1,
                  },
                  select: {
                    durationMinutes: true,
                    GoogleMapPlace: {
                      select: {
                        name: true,
                        lat: true,
                        lng: true,
                      },
                    },
                  },
                },
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

    // const result = await prisma.itinerary.findFirst({
    //   where: {
    //     id: +itineraryId,
    //     status: 1,
    //     userId: +userId,
    //   },
    //   include: {
    //     Days: {
    //       where: {
    //         status: 1,
    //       },
    //       select: {
    //         dayDate: true,
    //         startTime: true,
    //         Nodes: {
    //           select: {
    //             durationMinutes: true,
    //             GoogleMapPlace: {
    //               select: {
    //                 name: true,
    //                 formattedAddress: true,
    //                 lat: true,
    //                 lng: true,
    //                 photoReference: true,
    //               },
    //             },
    //           },
    //           orderBy: {
    //             placeId: "desc",
    //           },
    //         },
    //       },
    //     },
    //     ItineraryComments: {
    //       select: {
    //         content: true,
    //         updatedAt: true,
    //         Sender: {
    //           select: {
    //             fullName: true,
    //             nickname: true,
    //             avatar: true,
    //           },
    //         },
    //       },
    //     },
    //     Images: {
    //       select: {
    //         imageName: true,
    //       },
    //     },
    //   },
    // });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.log(err);
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

// 更新行程
// router.post("/save", async (req: Request, res: Response) => {
//   console.log("進入了");
//   try {
//     const { itineraryData: newItinerary } = req.body;

//     //抓 itineraryId
//     const itineraryId = newItinerary[0]?.itineraryId;
//     if (!itineraryId) {
//       return res.status(400).json({ error: "缺少 itineraryId" });
//     }

//     //從資料庫取舊資料
//     const oldItinerary: Itinerary[] = await prisma.itineraryDay.findMany({
//       where: { itineraryId },
//     });

//     //用陣列裝所有的promise
//     const updatePromises: Promise<any>[] = [];

//     //3.比對差異 ＝>找出行程還存在 但日期基本數值修改了
//     console.log("is run compare");
//     await Promise.all(
//       newItinerary.map(async (nd: any, ni: number) => {
//         //排除掉沒有id的新物件
//         if (nd.id === undefined) return;
//         oldItinerary.map((od: any, oi: number) => {
//           //找出行程還存在 但日期基本數值修改了
//           if (od.id === nd.id) {
//             for (const key of Object.keys(od)) {
//               if (
//                 od[key] !== nd[key] &&
//                 nd[key] !== undefined &&
//                 new Date(od[key]).toISOString() !==
//                   new Date(nd[key]).toISOString()
//               ) {
//                 // console.log(
//                 //   `${key}=====>///od:${od[key]} / nd:${nd[key]}___od.id_${od.id}`
//                 // );
//                 updatePromises.push(
//                   prisma.itineraryDay.update({
//                     where: {
//                       id: od.id,
//                     },
//                     data: {
//                       dayDate: nd[key],
//                     },
//                   })
//                 );
//               }
//             }
//           }
//         });
//         // 建立天以下所有行程
//         const nodes = nd.Nodes;
//         //先找到存在的nodes
//         const exsitNodes = await prisma.itineraryNode.findMany({
//           where: {
//             itineraryDayId: nd.id,
//           },
//           select: {
//             placeId: true,
//             googleMapPlaceId: true,
//           },
//         });
//         const newNodes = nodes.filter((n: any, i: number) => {
//           if (exsitNodes.length === 0) {
//             return true;
//           } else {
//             return !exsitNodes.some(
//               (en) =>
//                 en.googleMapPlaceId === n.GoogleMapPlace.id && en.placeId === i
//             );
//             // exsitNodes.forEach((en: any, ei: number) => {
//             //   console.log("//", en.googleMapPlaceId);
//             //   console.log("//", n.GoogleMapPlace.id);
//             //   console.log("//", en.placeId);
//             //   console.log("//", i);
//             //   if (en.google_map_place_id !== n.id && en.placeId !== i) return n;
//             // });
//           }
//         });
//         console.log("newNodes==>", newNodes);
//         // const newNodes = nodes.filter((node: any, index: number) => {
//         //   //node.id === googlemaplace.  | index exsitNodes.placeId
//         //   return !exsitNodes.some(
//         //     (ex: any) =>
//         //       ex.placeId !== index + 1 && // index 對應 placeId
//         //       ex.googleMapPlaceId !== node.GoogleMapPlace.id
//         //   );
//         // });
//         // const newNodes = nodes.filter((node: any, index: number) => {
//         //   return !exsitNodes.some(
//         //     (ex: any) =>
//         //       ex.placeId === index + 1 &&
//         //       ex.googleMapPlaceId === node.GoogleMapPlace.id
//         //   );
//         // });
//         // console.log("newNodes", newNodes);
//         if (newNodes.length > 0) {
//           // console.log("newNodes大於0", newNodes.length);
//           newNodes.map((node: any, index: number) => {
//             // //先找出開天行程下是否有相同行程 place_id 跟 googleMapPlaceId 已經存在
//             // console.log("newNodes進行map....", node);
//             // console.log("node.id==>", node.id);
//             // if (node.id) {
//             // console.log("建立天以下所有行程....");
//             // console.log(nd.id);
//             // console.log(index);
//             // console.log(node.durationMinutes);
//             // console.log(node.GoogleMapPlace.id);

//             updatePromises.push(
//               prisma.itineraryNode.create({
//                 data: {
//                   status: 1,
//                   itineraryDayId: nd.id,
//                   placeId: index,
//                   durationMinutes: node.durationMinutes,
//                   googleMapPlaceId: node.GoogleMapPlace.id,
//                 },
//               })
//             );
//             // }
//           });
//         }
//       })
//     );
//     // console.log("is run compare1");
//     //4.找出被"刪除"掉的天數
//     const newIds = newItinerary.map((d: any) => d.id);
//     const delatedIds = oldItinerary //被刪除的天數
//       .filter((nd: any) => !newIds.includes(nd.id))
//       .map((d: any) => d.id);
//     //將刪除的天數隱藏 delatedIds有資料再執行
//     if (delatedIds.length > 0) {
//       delatedIds.map((i: number) => {
//         updatePromises.push(
//           prisma.itineraryDay.update({
//             where: {
//               id: i,
//             },
//             data: {
//               status: 0,
//             },
//           })
//         );
//       });
//     }

//     // new 裡面沒有id 的新建立到資料庫中 <= 天數ｏｎｌｙ
//     newItinerary.map((d: any) => {
//       if (!("id" in d)) {
//         //建立天
//         updatePromises.push(
//           prisma.itineraryDay.create({
//             data: {
//               itineraryId: itineraryId,
//               dayDate: new Date(d.dayDate),
//               startTime: new Date(d.startTime),
//               status: 1,
//             },
//           })
//         );
//       }
//     });

//     // console.log("is run compare4");
//     //等待全部的 promis 完成
//     await Promise.all(updatePromises);

//     res.json({ success: true, message: "比對完成，請查看 console 輸出" });
//   } catch (err) {
//     res.status(500).json({ error: "伺服器錯誤" });
//   }
// });
// router.post("/save", async (req: Request, res: Response) => {
//   try {
//     const { itineraryData: newItinerary } = req.body; //data

//     //抓itineraryId  //2號
//     const itineraryId = newItinerary[0]?.itineraryId;
//     if (!itineraryId) {
//       return res.status(400).json({ error: "缺少 itineraryId" });
//     }

//     //依照itineraryId 抓取資料庫的該行程所有資料
//     const oldItinerary = await prisma.itinerary.findFirst({
//       where: { id: itineraryId, status: 1 },
//       include: {
//         Days: {
//           where: { status: 1 },
//           orderBy: { dayDate: "asc" },
//           include: {
//             Nodes: {
//               where: { status: 1 },
//               include: {
//                 Attraction: true,
//               },
//             },
//             StayNodes: {
//               where: { status: 1 },
//             },
//           },
//         },
//       },
//     });
//     console.log("oldItinerary", oldItinerary);
//     if (!oldItinerary) return;
//     //用陣列裝所有的promise

//     // if (newItinerary) {
//     //   //1.刪除所有舊行程node ＝>將新行程node加入
//     //   const statusChanged = Promise.all(
//     //     oldItinerary.Days.map(async (d: any, i: number) => {
//     //       //3.將所有舊行程的天數 node 狀態改變
//     //       await prisma.itineraryDay.updateMany({
//     //         where: { id: d.id },
//     //         data: { status: 0 },
//     //       });
//     //       //3.將所有舊行程的天數 node 狀態改變
//     //       await prisma.itineraryNode.updateMany({
//     //         where: { itineraryDayId: d.id },
//     //         data: { status: 0 },
//     //       });
//     //     })
//     //   );
//     //   console.log("statusChanged", statusChanged);
//     // }

//     //3依照新行程的日期 ＝>創建整個旅程

//     // oldItinerary.Days.map((day: any, index: number) => {
//     //   day.map((node: any, i: number) => {

//     //   });
//     // });

//     res.json({ success: true, message: "比對完成，請查看 console 輸出" });
//   } catch (err) {
//     res.status(500).json({ error: "伺服器錯誤" });
//   }
// });
router.post("/save", async (req: Request, res: Response) => {
  try {
    const { itineraryData: newItinerary } = req.body;

    console.log("newItinerary:", newItinerary);

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
    // ✅ 2. 全部舊資料改成 status=0
    //=======================================================
    await Promise.all(
      oldItinerary.Days.map(async (d) => {
        // 修改 Day
        await prisma.itineraryDay.update({
          where: { id: d.id },
          data: { status: 0 },
        });

        // 修改 Node
        await prisma.itineraryNode.updateMany({
          where: { itineraryDayId: d.id },
          data: { status: 0 },
        });
      })
    );

    //=======================================================
    // ✅ 3. 根據 newItinerary 建立全新的天 ＆ node
    //=======================================================
    for (const day of newItinerary) {
      //----------------------------------------------------
      // ✅ 建立一天
      //----------------------------------------------------
      const newDay = await prisma.itineraryDay.create({
        data: {
          itineraryId,
          dayDate: new Date(day.dayDate),
          startTime: new Date(day.startTime),
          status: 1,
        },
      });

      //----------------------------------------------------
      // ✅ 建立 node（按順序）
      //----------------------------------------------------
      for (let i = 0; i < day.Nodes.length; i++) {
        const node = day.Nodes[i];

        if (!node?.Place?.id) {
          console.warn("⚠️ node 缺少 Place.id，跳過該 node");
          continue;
        }

        await prisma.itineraryNode.create({
          data: {
            itineraryDayId: newDay.id,
            attractionId: node.Place.id, // ✅ 只用 attractionId
            durationMinutes: node.durationMinutes,
            order: i,
            status: 1,
          },
        });
      }
    }

    //=======================================================
    // ✅ DONE
    //=======================================================
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ /save 發生錯誤:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
});

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
  try {
    const result = await prisma.article.create({
      data: {
        itineraryId: itineraryId,
        title: title,
        content: content,
      },
    });
    if (result) res.status(200).json({ success: true, message: "上傳成功" });
  } catch (err) {
    console.log(err);
  }
});

//查找有無文在該行程的文章
router.get(
  "/check-article/:itineraryId",
  async (req: Request, res: Response) => {
    const { itineraryId } = req.params;
    try {
      const result = await prisma.article.findFirst({
        where: {
          itineraryId: +itineraryId,
        },
        select: {
          id: true,
          itineraryId: true,
        },
      });
      console.log("result===>", result);
      if (result) {
        return res.status(200).json({ success: true, message: "find" });
      }
      return res.status(200).json({ success: false, message: "not find" });
    } catch (err) {}
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
    const result = await prisma.itineraryInvitation.create({
      data: {
        itineraryId: itineraryId,
        senderId: senderId,
        receiverId: receiverId,
        status: 0, //0 => pending
      },
    });
    res.status(200).json({ suceess: true, message: "已發送邀請" });
  } catch (err) {
    console.log(err);
  }
});

// 查詢自己所有接收到的行程邀約
router.get("/all-invite/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log("進入 all-invite");
  try {
    // const result = await prisma.itineraryInvitation.findMany({
    //   where: {
    //     receiverId: +userId,
    //     senderId: +userId,
    //     status: 0,
    //   },
    //   include: {
    //     itinerary: {
    //       select: {
    //         userId: true,
    //         title: true,
    //       },
    //     },
    //     sender: {
    //       select: {
    //         id: true,
    //         nickname: true,
    //         fullName: true,
    //         avatar: true,
    //       },
    //     },
    //   },
    // });
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
  const { invitationId, userId, invitationResponse } = req.body;
  console.log("xxxx=>", { invitationId, userId, invitationResponse });
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

    if (!result) return;
    //2.如果接收 將該使用者加入 user_itinerars 中
    //0 pending 1 accpet 2 reject
    if (invitationResponse === 1) {
      await prisma.userItinerary.create({
        data: {
          userId: userId,
          itineraryId: result.itineraryId,
        },
      });
    }

    res.status(200).json({ suceess: true, message: "已更新狀態" });
  } catch (err) {
    console.log(err);
  }
});

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
