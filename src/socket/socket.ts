import { Server } from "socket.io";

// ---------- Socket.IO 設定 ----------
//宣告函式 匯入server 運行裡面的設定
export const chatSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("使用者連線:", socket.id);

    // 傳遞 session 資料範例
    // const session = (socket.request as any).session;
    // console.log("目前使用者 session:", session?.id);

    // 接收訊息
    socket.on("chat message", (msg) => {
      console.log("收到訊息:", msg);
      io.emit("chat message", msg); // 廣播給所有連線者
    });

    // 使用者離線
    socket.on("disconnect", () => {
      console.log("使用者離線:", socket.id);
    });
  });
};
