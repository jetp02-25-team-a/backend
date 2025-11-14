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

    //行程相關

    // if (!socket || !itineraryId || !user) return;

    // console.log("🔌 加入行程協作房間:", itineraryId);

    //------------------------------------------    // 加入行程協作房間
    socket.on("itinerary:join", (data) => {
      const { itineraryId, userId, userName } = data;
      const roomName = `itinerary_${itineraryId}`;
      socket.join(roomName); // 加入特定行程房間
      socket.data.currentItinerary = itineraryId;

      // 📌 添加這行：確認加入成功
      socket.emit("itinerary:joined", {
        roomName,
        itineraryId,
        userId,
        userName,
      });

      // 通知房間內其他用戶有新用戶加入
      socket.to(roomName).emit("itinerary:userJoined", { userId, userName });

      console.log(`用戶 ${userId} 加入房間 ${roomName}`); // 添加除錯輸出
    });

    // 後端需要添加測試廣播
    socket.on("test:broadcast", (data) => {
      console.log("收到廣播測試:", data);
      socket.broadcast.emit("test:broadcast", data); // 廣播給所有其他用戶
    });
    //------------------------------------------
    //監聽事件--node
    //------------------------------------------
    //
    // 監聽其他用戶的節點增加 ＝> 收到的資訊完整發送給其他用戶
    // socket.on("itinerary:addNode", (data) => {
    //   const { itineraryId, dayIndex, nodeData, userId, userName, timestamp } =
    //     data;
    //   const roomName = `itinerary_${itineraryId}`;
    //   socket.to(roomName).emit("itinerary:addNode", data);
    // });

    // 監聽其他用戶的節點刪除 ＝> 收到的資訊完整發送給其他用戶
    // socket.on("itinerary:nodeDeleted", (data) => {
    //   const { itineraryId, dayIndex, nodeData, userId, userName, timestamp } =
    //     data;
    //   const roomName = `itinerary_${itineraryId}`;
    //   //發送給其他房間的使用者有節點刪除
    //   socket.to(roomName).emit("itinerary:nodeDeleted", data);
    // });
    //------------------------------------------
    //監聽事件--天數
    //------------------------------------------
    // 監聽其他用戶的天數新增
    socket.on("itinerary:addDay", (data) => {
      const { itineraryId, dayData, userId, userName, timestamp } = data;
      console.log("收到的資料＝＝", {
        itineraryId,
        dayData,
        userId,
        userName,
        timestamp,
      });
      const roomName = `itinerary_${itineraryId}`;
      //發送給其他房間的使用者有天數新增
      socket.to(roomName).emit("itinerary:addDay", data);
    });
    // 監聽其他用戶的天數刪除
    socket.on("itinerary:deleteDay", (data) => {
      const { itineraryId, dayIndex, userId, userName, timestamp } = data;
      const roomName = `itinerary_${itineraryId}`;
      //發送給其他房間的使用者有天數刪除
      socket.to(roomName).emit("itinerary:deleteDay", data);
    });

    //監聽其他用戶的node 新增
    socket.on("itinerary:addNode", (data) => {
      console.log("收到的node新增資料＝＝", data);
      const { itineraryId, dayIndex, nodeData, timestamp } = data;

      // const { itineraryId, dayIndex, userId, userName, timestamp } = data;
      const roomName = `itinerary_${itineraryId}`;
      // //發送給其他房間的使用者有node新增
      socket.to(roomName).emit("itinerary:addNode", data);
    });

    //監聽其他用戶刪除 node
    socket.on("itinerary:nodeDeleted", (data) => {
      console.log("收到的node刪除資料＝＝", data);
      const { itineraryId, dayIndex, nodeData, timestamp } = data;
      const roomName = `itinerary_${itineraryId}`;
      // //發送給其他房間的使用者有node刪除
      socket.to(roomName).emit("itinerary:nodeDeleted", data);
    });

    socket.on("itinerary:nodeDragged", (data) => {
      console.log("收到的node拖曳資料＝＝", data);
      const roomName = `itinerary_${data.itineraryId}`;

      // 確保用戶在房間內
      if (socket.rooms.has(roomName)) {
        socket.to(roomName).emit("itinerary:nodeDragged", data);
        console.log(`廣播拖曳事件到房間 ${roomName}`);
      } else {
        console.error(`用戶不在房間 ${roomName} 內`);
      }
    });

    // 監聽用戶上線/離線
    socket.on("itinerary:userJoined", (data) => {
      console.log("👋 用戶加入協作:", data);
    });

    socket.on("itinerary:userLeft", (data) => {
      console.log("👋 用戶離開協作:", data);
    });

    // 清理函數
    // return () => {
    //   console.log('🔌 離開行程協作房間:', itineraryId);
    //   socket.emit('itinerary:leave', { itineraryId, userId: user.id });
    //   socket.off('itinerary:nodeAdded');
    //   socket.off('itinerary:nodeDeleted');
    //   socket.off('itinerary:dayAdded');
    //   socket.off('itinerary:userJoined');
    //   socket.off('itinerary:userLeft');
    // };

    // 使用者離線
    socket.on("disconnect", () => {
      console.log("使用者離線:", socket.id);
    });
  });
};
