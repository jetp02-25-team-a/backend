import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import moment from "moment-timezone";
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
    const totalDays = end.diff(start, "days"); //取得行程天數

    await Promise.all(
      Array.from({ length: totalDays }).map((_, i) => {
        const dayDate = start.clone().add(i, "days").startOf("day"); //moment 轉 datetime 本地 UTC

        // console.log("dayDate=>", dayDate.toDate());
        // const taipeiTime = moment(dayDate.toDate())
        //   .tz("Asia/Taipei")
        //   .format("YYYY-MM-DD HH:mm");
        // console.log("????=>", taipeiTime);

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
    res.status(200).json({ success: true, message: "行程建立完成" });
  } catch (err) {
    console.log(err);
  }
  //   res.status(200).json({ a: "oooooo" });
});

//搜尋關鍵字附近的景點
router.get("/serch", async (req: Request, res: Response) => {
  const { place } = req.query;
  const query = typeof place === "string" ? place : "台北101";

  const apiKey = process.env.GOOGLE_API_KEY;
  //encodeURIComponent() 是用來把「文字」轉成「網址中可以安全使用的格式」。
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`;
  try {
    const result = await fetch(url).then((r) => r.json());
    console.log("result=>", result);
    if (result.status === "OK" && result.results.length > 0) {
      const createPlace = await Promise.all(
        result.results.map(async (place: any) => {
          const { name, place_id, formatted_address, geometry, photos } = place;
          const data = await prisma.googleMapPlace.create({
            data: {
              placeId: place_id,
              name: name,
              formattedAddress: formatted_address,
              lat: geometry.location.lat,
              lng: geometry.location.lng,
              photoReference: photos.photoReference,
            },
          });
          return data;
        })
      );
      console.log("新增地點成功", createPlace);
      res.status(200).json({ a: "成功" });
    }
  } catch (err) {
    console.log(err);
  }
});

//新增某天的新節點
router.post("create-node", async (req: Request, res: Response) => {
  const { day, place } = req.body;
});

//取得所有行程(依照地區)
router.get("/itineraries", async (req: Request, res: Response) => {
  const { area } = req.query;
  if (!area) return;
  try {
    const allItinerary = await prisma.itinerary.findMany({
      where: {
        area: area.toString(),
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
router.post("/itineraries-comment", async (req: Request, res: Response) => {
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

//上傳旅程圖片功能 還沒寫好？
router.post("/upload-pictures", (req: Request, res: Response) => {
  try {
  } catch (err) {
    console.log(err);
  }
});

export default router;
