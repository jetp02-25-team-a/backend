// 匯入套件及類型定義 (類別、介面)
import express from "express";
// *** verbatimModuleSyntax 為 true 時，標示匯入類型
import type { Request, Response, NextFunction } from "express";

// 截入環境變數設定檔
import "dotenv/config";

import cookieParser from "cookie-parser";
import session from "express-session";
import sessionFileStore from "session-file-store";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import loginRouter from "./routes/api-user";
import friendsRouter from "./routes/friend";
import chatRouter from "./routes/chat";
import placeRouter from "./routes/place";
import featuredRouter from "./routes/place-features";
import searchRouter from "./routes/place-search";
import favoriteRouter from "./routes/place-favorite";
import mapRouter from "./routes/place-leaflet";
import articleRouter from "./routes/article.routes";
import likeroutes from "./routes/likeroutes";
import mallRouter from "./routes/api-mall";
import itinerariesRouter from "./routes/itineraries";

import { m3AccommodationsRoute, m3Favorite } from "./routes/m3";

import http from "http";
import { Server } from "socket.io";
import { chatSocket } from "./socket/socket";
// import { jwtParseMiddleware } from "./middleware";

import { m3JwtParseMiddleware } from "./middleware";
import { globalErrorHandler } from "./middleware";

// 建立伺服器主物件
const app = express();

// 圖片上傳靜態位置
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "public", "uploads"))
);

// CORS 白名單設定
const allowedOrigins = [
  "http://localhost:3033", // React 開發伺服器
  "http://localhost:3001", // 另一個前端開發埠
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  // 生產環境域名
  process.env.FRONTEND_URL || "https://your-production-domain.com",
];

const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // 允許沒有 origin 的請求（例如移動應用或 Postman）
    if (!origin) return callback(null, true);
    callback(null, allowedOrigins.includes(origin));
  },
  credentials: true, // 允許攜帶 cookies 和認證資訊
  optionsSuccessStatus: 200, // 一些舊版瀏覽器 (IE11, 各種 SmartTV) 在 204 狀態碼上有問題
};

// 套用 CORS 設定
app.use(cors(corsOptions));

// 設定靜態內容資料夾
app.use(express.static("public"));

// JWT 解析 middleware (可選性驗證) (m3用)
app.use(m3JwtParseMiddleware);

// 解析 JSON body 的中間件
app.use(express.json());

// 解析 URL-encoded body 的中間件
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser()); // 全域中介軟體：解析 cookies

const FileStore = sessionFileStore(session);
app.use(
  session({
    // 新用戶沒有使用到 session 物件時不會建立 session 和發送 cookie
    saveUninitialized: false,
    resave: false, // 沒變更內容是否強制回存
    secret: process.env.SESSION_SECRET || "development-session-secret",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24小時，單位毫秒
      secure: process.env.NODE_ENV === "production", // 生產環境使用 HTTPS
      httpOnly: true, // 防止 XSS 攻擊
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 跨站請求設定
    },
    store: new FileStore({
      path: process.env.SESSION_PATH || "./sessions",
      ttl: 86400, // 24小時過期
    }), // 使用檔案作為 session 儲存媒介
  })
);

// ************* 自訂的頂層 "中間件, 中介軟體" *************
// JWT 解析 middleware (可選性驗證)
// app.use(jwtParseMiddleware);

// app.use((req: Request, res: Response, next: NextFunction) => {
//   res.locals.pageName = "";
//   res.locals.session = req.session; // 讓所有的 EJS 可以用 session 變數
//   res.locals.query = req.query;
//   res.locals.cookies = req.cookies;

//   next();
// });

// 網站根目錄頁面
app.get("/", (req: Request, res: Response) => {
  res.json("ok");
});

app.use("/api", loginRouter);
app.use("/api/friendships", friendsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/map", mapRouter);
app.use("/api/place/featured", featuredRouter);
app.use("/api/place/search", searchRouter);
app.use("/api/place", placeRouter);
app.use("/api/favorite", favoriteRouter);
app.use("/api/article", articleRouter);
app.use("/api/itineraries", itinerariesRouter);
app.use("/api", mallRouter);

app.use("/api/likeroutes", likeroutes);
//m3 routes
app.use("/api/m3", m3AccommodationsRoute);
app.use("/api/m3", m3Favorite);

// --------------------------------------------------------------------

// 1. 處理所有未匹配到的路由 (404 Not Found)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API 路由不存在 (Not Found)",
    path: req.originalUrl,
  });
});

// 2. 全域錯誤處理器 (必須放在所有路由和 404 之後)
app.use(globalErrorHandler);

// --------------------------------------------------------------------

// ---------- 建立 HTTP + Socket.IO 伺服器 ----------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

chatSocket(io);

function shutdownGracefully(server: http.Server, source: string) {
  console.log(`\n[Shutdown] 來源: ${source} - 啟動優雅關機...`);

  // 嘗試關閉 HTTP 伺服器，等待所有當前連接完成
  server.close(() => {
    console.log("✅ HTTP 伺服器連線已關閉。");
    // 修正：當正常關閉時，使用狀態碼 0 (成功) 退出
    process.exit(0);
  });

  // 如果連接在 5 秒內未能關閉，則強制退出
  setTimeout(() => {
    console.error("❌ 強制關閉：連線未能及時關閉。");
    // 保持：當強制關閉時，使用狀態碼 1 (錯誤) 退出
    process.exit(1);
  }, 5000).unref();
}

// --------------------------------------------------------------------

// 1. 處理未被捕獲的同步錯誤 (最嚴重的錯誤)
process.on("uncaughtException", (err: Error) => {
  console.error("❌ FATAL: 未被捕獲的同步錯誤！伺服器關閉中...");
  console.error(err);
  shutdownGracefully(server, "uncaughtException");
});

// 2. 處理未被處理的 Promise 拒絕 (異步錯誤)
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("❌ FATAL: 未被處理的 Promise 錯誤！伺服器關閉中...");
  console.error(reason);
  shutdownGracefully(server, "unhandledRejection");
});

// --------------------------------------------------------------------

const port = +(process.env.PORT || "3002");
server.listen(port, () => {
  console.log(`Express + Prisma 啟動 http://localhost:${port}`);
});
