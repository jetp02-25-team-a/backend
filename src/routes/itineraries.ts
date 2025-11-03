import express from "express";
import type { Request, Response } from "express";
import { json, success } from "zod";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { prisma } from "../utils/prisma-pagination";
import moment from "moment";
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
  console.log(payload);
  console.log(req.body);

  try {
    if (!payload) return;
    //1.先建立行程
    const itinerary = await prisma.itinerary.create({
      data: {
        userId: payload.user_id,
        title: title,
        area: area,
        category: 1,
        status: 1,
      },
    });
    //2.建立每日行程
    const start = moment(startDay);
    const end = moment(endDay);
    const totalDays = end.diff(start, "days"); //取得行程天數

    const days = Promise.all(
      Array.from({ length: totalDays }).map((v, i) => {
        prisma.itineraryDay.create({
          data: {
            itineraryId: itinerary.id,
            dayDate: start.add(i + 1, "days").toDate(), //moment 轉 datetime
            startTime: startTime,
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
  res.status(200).json({ a: "oooooo" });
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
