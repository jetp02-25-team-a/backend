import { Server } from "socket.io";
import { prisma } from "../utils/prisma-pagination";
// import { ms } from "zod/v4/locales";

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
      // socket.join(userId);//56號加入
      socket.join(String(userId));
    });
    //設定自己的房間
    // socket.on("setMyId", (userId) => {
    //   socket.data.userId = userId; // 建議存起來方便之後用
    //   socket.join(String(userId));
    // });
    socket.on("setMyId", (userId) => {
      socket.data.userId = userId;
      socket.join(String(userId)); // 自己加入自己的 ID 房間
    });

    // 傳遞 session 資料範例
    // const session = (socket.request as any).session;
    // console.log("目前使用者 session:", session?.id);

    // 接收訊息
    // socket.on("chat", async (msg, callback) => {
    //   let savedMessage;
    //   //收到訊息: { providerId: 4, acceptId: 7, content: 'wwwww' }
    //   try {
    //     //房間處理
    //     if (msg.roomId) {
    //       const message = await prisma.message.create({
    //         data: {
    //           senderId: msg.providerId,
    //           roomId: socket.data.friendId,
    //           content: msg.content,
    //           messageType: "text",
    //         },
    //       });
    //       savedMessage = message;
    //     } else {
    //       //處理個人
    //       const message = await prisma.message.create({
    //         data: {
    //           senderId: msg.providerId,
    //           receiverId: socket.data.userId,
    //           content: msg.content,
    //           messageType: "text",
    //         },
    //       });
    //       savedMessage = message;
    //       console.log("收到！！！個人訊息已儲存:", message);
    //     }
    //     io.emit("public", savedMessage); // 廣播給所有連線者
    //     //發送給前端觸發重新取得訊息
    //     io.emit("newMessage", {
    //       roomId: msg.roomId,
    //       friendId: msg.acceptId,
    //     });

    //     //  回傳成功訊息給前端 (這會觸發前端的 callback)
    //     if (callback) callback({ success: true, message: "訊息已送出" });
    //   } catch (err) {
    //     console.error("訊息儲存失敗:", err);
    //     if (callback) callback({ success: false, message: "伺服器錯誤" });
    //   }
    // });

    //行程相關

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

    // 處理時間調整事件
    socket.on("itinerary:timeChanged", (data) => {
      console.log("收到時間調整資料:", data);
      const {
        itineraryId,
        dayIndex,
        nodeIndex,
        newDuration,
        userId,
        userName,
      } = data;
      const roomName = `itinerary_${itineraryId}`;

      // 確保用戶在房間內
      if (socket.rooms.has(roomName)) {
        // 廣播給同一房間的其他用戶（排除發送者）
        socket.to(roomName).emit("itinerary:timeChanged", data);
        console.log(
          `✅ 時間調整事件已廣播到房間 ${roomName}，用戶 ${userId} 調整了節點時間為 ${newDuration} 分鐘`
        );
      } else {
        console.error(
          `❌ 用戶 ${userId} 不在房間 ${roomName} 內，無法廣播時間調整事件`
        );
      }

      // 可選：保存到資料庫
      // await updateNodeDuration(itineraryId, dayIndex, nodeIndex, newDuration);
    });

    // 設定聊天房間id（新增）
    socket.on("joinChatRoom", (roomId) => {
      const chatRoomName = `chat_${roomId}`;
      socket.join(chatRoomName);
      socket.data.chatRoomId = roomId; // 儲存聊天房間ID
      socket.emit("chat:roomJoined", { roomName: chatRoomName, roomId });
      console.log(`用戶加入聊天房間: ${chatRoomName}`);
    });

    //設定房間id（保持原本的邏輯，但改名避免混淆）
    // socket.on("joinRoomId", (roomId) => {
    //   console.log("接收到的 joinRoomId:", roomId);
    //   socket.data.friendId = roomId; // 建議存起來方便之後用
    // });

    // 接收訊息（整合後的版本）11_18
    socket.on("chat", async (msg, callback) => {
      // console.log("收到訊息:", msg);
      let savedMessage;
      try {
        //發送給團體聊天室
        if (msg.roomId) {
          const message = await prisma.message.create({
            data: {
              senderId: msg.providerId,
              roomId: msg.roomId,
              content: msg.content,
              messageType: "text",
            },
          });
          savedMessage = message;
          const chatRoomName = `chat_${msg.roomId}`;
          socket.to(chatRoomName).emit("newMessage", savedMessage);
          socket
            .to(chatRoomName)
            .emit("message:refetch", { roomId: msg.roomId });
        } else {
          //發送給個人聊天室
          const message = await prisma.message.create({
            data: {
              senderId: msg.providerId,
              receiverId: msg.acceptId,
              content: msg.content,
              messageType: "text",
            },
          });
          savedMessage = message;
          console.log("收到！！！個人訊息已儲存:", message);
          // 發送給特定用戶（這裡需要根據您的用戶-socket對應邏輯調整）
          // socket.to(msg.acceptId).emit("newMessage", savedMessage);
          // 取得所有房間列表
          const rooms = io.sockets.adapter.rooms;
          console.log("目前所有房間：", rooms);
          console.log("準備發縙給", msg.acceptId, "=>", savedMessage);
          // socket.to(msg.acceptId).emit("newMessage", savedMessage); //發送給25號
          // 發送給接收者
          socket.to(String(msg.acceptId)).emit("newMessage", savedMessage);
          // 也要回傳給自己 (避免只看到別人更新)
          io.to(String(msg.providerId)).emit("newMessage", savedMessage);

          socket
            .to(msg.acceptId)
            .emit("message:refetch", { friendId: msg.acceptId });
          // socket
          //   .to(socket.id)
          //   .emit("message:refetch", { friendId: msg.acceptId });
        }
        if (callback) callback({ success: true, message: "訊息已送出" });
      } catch (err) {
        console.error("訊息儲存失敗:", err);
        if (callback) callback({ success: false, message: "伺服器錯誤" });
      }
    });

    //11-18end
    // socket.on("chat", async (msg, callback) => {
    //   let savedMessage;

    //   try {
    //     // 房間聊天處理
    //     if (msg.roomId) {
    //       const message = await prisma.message.create({
    //         data: {
    //           senderId: msg.providerId,
    //           roomId: msg.roomId, // 使用傳入的 roomId 而不是 socket.data.friendId
    //           content: msg.content,
    //           messageType: "text",
    //         },
    //       });
    //       savedMessage = message;

    //       // 廣播給聊天房間內的所有用戶（排除發送者）
    //       const chatRoomName = `chat_${msg.roomId}`;
    //       socket.to(chatRoomName).emit("newMessage", savedMessage);
    //       socket
    //         .to(chatRoomName)
    //         .emit("message:refetch", { roomId: msg.roomId });

    //       console.log(`群組訊息已儲存並廣播到房間: ${chatRoomName}`);
    //     } else {
    //       // 個人聊天處理
    //       const message = await prisma.message.create({
    //         data: {
    //           senderId: msg.providerId,
    //           receiverId: msg.acceptId, // 使用傳入的 acceptId
    //           content: msg.content,
    //           messageType: "text",
    //         },
    //       });
    //       savedMessage = message;

    //       // 發送給特定用戶（這裡需要根據您的用戶-socket對應邏輯調整）
    //       socket.to(msg.acceptId).emit("newMessage", savedMessage);
    //       socket
    //         .to(msg.acceptId)
    //         .emit("message:refetch", { friendId: msg.acceptId });

    //       console.log("個人訊息已儲存:", message);
    //     }

    //     // 回傳成功訊息給前端
    //     if (callback) callback({ success: true, message: "訊息已送出" });
    //   } catch (err) {
    //     console.error("訊息儲存失敗:", err);
    //     if (callback) callback({ success: false, message: "伺服器錯誤" });
    //   }
    // });

    //
    // 後端需要支援聊天房間加入（與行程房間分開）
    // socket.on("joinChatRoom", (roomId) => {
    //   const chatRoomName = `chat_${roomId}`;
    //   socket.join(chatRoomName);
    //   socket.emit("chat:roomJoined", { roomName: chatRoomName, roomId });
    //   console.log(`用戶加入聊天房間: ${chatRoomName}`);
    // });

    // 監聽用戶上線/離線
    socket.on("itinerary:userJoined", (data) => {
      console.log("👋 用戶加入協作:", data);
    });

    socket.on("itinerary:userLeft", (data) => {
      console.log("👋 用戶離開協作:", data);
    });

    // 新增住宿 StayNode 的 socket 事件
    socket.on("itinerary:addStayNode", (data) => {
      const { itineraryId } = data;
      const roomName = `itinerary_${itineraryId}`;
      // 廣播給同房間其他用戶
      socket.to(roomName).emit("itinerary:addStayNode", data);
    });

    // 清理函數（正確移除監聽，避免 undefined 變數）
    socket.on("disconnect", () => {
      // 這裡可以根據 socket.data 取得房間資訊
      if (socket.data.currentItinerary) {
        const roomName = `itinerary_${socket.data.currentItinerary}`;
        console.log("🔌 離開行程協作房間:", roomName);
        socket.emit("itinerary:leave", {
          itineraryId: socket.data.currentItinerary,
          userId: socket.data.userId,
        });
      }
      // 移除所有自訂事件監聽
      socket.removeAllListeners("itinerary:nodeAdded");
      socket.removeAllListeners("itinerary:nodeDeleted");
      socket.removeAllListeners("itinerary:dayAdded");
      socket.removeAllListeners("itinerary:userJoined");
      socket.removeAllListeners("itinerary:userLeft");
      // 你也可以根據需要移除其他事件
    });

    //處理即時收到加入好友的通知
    socket.on("addFriend", (data) => {
      console.log("收到加入好友通知:", data);
      const { receiveId } = data;
      socket.to(String(receiveId)).emit("newFriend", data);
    });

    // 使用者離線
    socket.on("disconnect", () => {
      console.log("使用者離線:", socket.id);
    });
  });
};
