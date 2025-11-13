import { Server } from "socket.io";
import { prisma } from "../utils/prisma-pagination";
import { ms } from "zod/v4/locales";

// ---------- Socket.IO 設定 ----------
//宣告函式 匯入server 運行裡面的設定
export const chatSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("使用者連線:", socket.id);

    //設定房間id
    socket.on("joinRoomId", (roomId) => {
      console.log("接收到的 joinRoomId:", roomId);
      socket.data.friendId = roomId; // 建議存起來方便之後用
    });

    //設定對象id
    socket.on("friendID", (userId) => {
      console.log("接收到的 friendID:", userId);

      // 你可以在這裡保存、綁定、加入房間、驗證等等
      socket.data.userId = userId; // 建議存起來方便之後用
    });

    // 傳遞 session 資料範例
    // const session = (socket.request as any).session;
    // console.log("目前使用者 session:", session?.id);

    // 接收訊息
    socket.on("chat", async (msg, callback) => {
      let savedMessage;
      //收到訊息: { providerId: 4, acceptId: 7, content: 'wwwww' }
      try {
        //房間處理
        if (msg.roomId) {
          const message = await prisma.message.create({
            data: {
              senderId: msg.providerId,
              roomId: socket.data.friendId,
              content: msg.content,
              messageType: "text",
            },
          });
          savedMessage = message;
        } else {
          //處理個人
          const message = await prisma.message.create({
            data: {
              senderId: msg.providerId,
              receiverId: socket.data.userId,
              content: msg.content,
              messageType: "text",
            },
          });
          savedMessage = message;
          console.log("收到！！！個人訊息已儲存:", message);
        }
        io.emit("public", savedMessage); // 廣播給所有連線者
        //發送給前端觸發重新取得訊息
        io.emit("newMessage", {
          roomId: msg.roomId,
          friendId: msg.acceptId,
        });

        //  回傳成功訊息給前端 (這會觸發前端的 callback)
        if (callback) callback({ success: true, message: "訊息已送出" });
      } catch (err) {
        console.error("訊息儲存失敗:", err);
        if (callback) callback({ success: false, message: "伺服器錯誤" });
      }
    });

    // 使用者離線
    socket.on("disconnect", () => {
      console.log("使用者離線:", socket.id);
    });
  });
};
