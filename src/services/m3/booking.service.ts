import { prisma } from "../../utils/prisma-pagination";
import { BadRequestError } from "../../lib";

// ------------------------------------------
// 庫存相關服務
// ------------------------------------------

/**
 * 查住宿房型庫存
 */
export const getInventoriesByAccommodation = async (
  accommodationId: number,
  checkInDate: Date,
  checkOutDate: Date
) => {
  const roomTypes = await prisma.roomType.findMany({
    where: { accommodationId },
    select: { id: true, name: true, basePrice: true },
  });

  const results = await Promise.all(
    roomTypes.map(async (roomType) => {
      const inventories = await prisma.roomInventory.findMany({
        where: {
          roomTypeId: roomType.id,
          // date 範圍為 [checkInDate, checkOutDate)
          date: { gte: checkInDate, lt: checkOutDate },
        },
        orderBy: { date: "asc" },
      });

      return {
        roomTypeId: roomType.id,
        name: roomType.name,
        basePrice: roomType.basePrice,
        availability: inventories.map((inv) => ({
          date: inv.date,
          availableCount: inv.availableCount,
        })),
      };
    })
  );

  return { accommodationId, checkInDate, checkOutDate, roomTypes: results };
};

/**
 * 查房型庫存
 */
export const getInventoriesByRoomType = async (
  roomTypeId: number,
  checkInDate: Date,
  checkOutDate: Date
) => {
  const inventories = await prisma.roomInventory.findMany({
    where: { roomTypeId, date: { gte: checkInDate, lt: checkOutDate } },
    orderBy: { date: "asc" },
  });

  return {
    roomTypeId,
    checkInDate,
    checkOutDate,
    availability: inventories.map((inv) => ({
      date: inv.date,
      availableCount: inv.availableCount,
    })),
  };
};

// ------------------------------------------
// 價格與訂單核心邏輯
// ------------------------------------------

/**
 * 針對單晚預訂獲取房型價格。
 * @interface
 */
interface PricingDetail {
  unitPrice: number; // 單間房的總費用 (即單晚價格)
  pricePerNight: number; // 單晚價格
}

const getPricingDetails = async (
  roomTypeId: number,
  checkInDate: Date,
  checkOutDate: Date
): Promise<PricingDetail> => {
  // 由於假設永遠是單晚預訂，我們只需從 RoomType 查詢 basePrice。
  // ⚠️ 注意：此處應加入日期驗證，確保 checkOutDate 確實是 checkInDate 的下一天。
  //           如果不是，則應拋出錯誤，或使用多晚邏輯。

  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    select: { basePrice: true },
  });

  if (!roomType || roomType.basePrice === null) {
    throw new Error(`RoomType ID ${roomTypeId} not found or price is missing.`);
  }

  const pricePerNight = roomType.basePrice;
  const unitPrice = pricePerNight; // 單晚預訂，單房總價 = 單晚價格

  return {
    unitPrice,
    pricePerNight,
  };
};

export const getAllUserBookingsService = async (userId: number) => {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { bookingDate: "desc" }, // 通常按預訂日期降序排列
    select: {
      id: true,
      checkInDate: true,
      checkOutDate: true,
      totalAmount: true,
      status: true,
      bookingDate: true,
      Accommodation: {
        // 只選取住宿名稱
        select: { name: true },
      },
    },
  });

  // 轉換 totalAmount 類型 (如果它在 DB 是 Decimal 或 String)
  // 並且確保數據結構與前端 Booking interface 匹配
  const formattedBookings = bookings.map((booking) => ({
    ...booking,
    totalAmount: booking.totalAmount.toString(), // 確保回傳字串
  }));

  return formattedBookings;
};

/**
 * 建立訂單
 */
export const createBookingService = async (userId: number, data: any) => {
  const {
    accommodationId,
    checkInDate,
    checkOutDate,
    guestName,
    guestContact,
    items, // [{ roomTypeId: number, quantity: number }]
  } = data;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  let finalTotalAmount = 0;

  // 1. 遍歷所有預訂項目，查詢價格並計算單房總價
  const itemsWithPricing = await Promise.all(
    items.map(async (item: any) => {
      const pricing = await getPricingDetails(
        item.roomTypeId,
        checkIn,
        checkOut
      );

      // itemSubtotal = 單晚價格 * 房間數量
      const itemSubtotal = pricing.unitPrice * item.quantity;
      finalTotalAmount += itemSubtotal;

      return {
        roomTypeId: item.roomTypeId,
        quantity: item.quantity,
        unitPrice: pricing.unitPrice, // 儲存單間房的總費用（即單晚價）
      };
    })
  );

  // 2. 🌟 執行庫存檢查 🌟
  // 由於是單晚預訂，只需檢查 checkInDate 的庫存
  await Promise.all(
    itemsWithPricing.map(async (item) => {
      const inventory = await prisma.roomInventory.findUnique({
        where: {
          roomTypeId_date: {
            roomTypeId: item.roomTypeId,
            date: checkIn,
          },
        },
        select: { availableCount: true },
      });

      if (!inventory || inventory.availableCount < item.quantity) {
        throw new BadRequestError(
          `房型 ${item.roomTypeId} 在 ${
            checkIn.toISOString().split("T")[0]
          } 庫存不足。`
        );
      }
    })
  );

  // 3. 創建訂單
  const booking = await prisma.booking.create({
    data: {
      userId,
      accommodationId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestName,
      guestContact,
      status: "Pending", // 初始狀態為待付款
      totalAmount: finalTotalAmount, // 使用計算出的最終總金額
      Items: {
        create: itemsWithPricing.map((item) => ({
          roomTypeId: item.roomTypeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice, // 儲存單間房的總價 (即單晚價)
        })),
      },
    },
    include: { Items: true },
  });

  // ⚠️ 注意：庫存扣除操作 (availableCount - quantity) 應該在支付成功後，將 status 改為 Confirmed 時執行。

  return booking;
};

// ------------------------------------------
// 訂單查詢服務
// ------------------------------------------

/**
 * 查詢訂單
 */
export const getBookingByIdService = async (
  bookingId: number,
  userId: number
) => {
  const detailedBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      accommodationId: true,
      checkInDate: true,
      checkOutDate: true,
      totalAmount: true,
      status: true,
      guestName: true,
      guestContact: true,
      bookingDate: true,
      updatedAt: true,
      cancellationDate: true,

      Items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          RoomType: {
            select: {
              name: true,
              basePrice: true,
              maxCapacity: true,
              bedType: true,
            },
          },
        },
      },

      User: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },

      Accommodation: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },

      Review: true,
    },
  });

  if (!detailedBooking || detailedBooking.userId !== userId) {
    throw new BadRequestError("訂單不存在或無權限查詢。");
  }

  const {
    userId: _,
    accommodationId: __,
    ...responseBooking
  } = detailedBooking;

  return responseBooking;
};

// ------------------------------------------
// 訂單編輯服務 (已修正價格和總金額計算)
// ------------------------------------------

/**
 * 編輯訂單
 */
export const updateBookingService = async (
  bookingId: number,
  userId: number,
  data: any
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { Items: true },
  });

  if (!booking || booking.userId !== userId) {
    throw new BadRequestError("訂單不存在或無權限編輯。");
  }

  // 必須是可修改的狀態 (例如: Pending, Confirmed)
  if (booking.status === "Cancelled") {
    throw new BadRequestError("已取消的訂單無法編輯。");
  }

  // 1. 決定最終的日期和聯繫資訊
  let updateData: any = {};

  const checkIn = data.checkInDate
    ? new Date(data.checkInDate)
    : booking.checkInDate;
  const checkOut = data.checkOutDate
    ? new Date(data.checkOutDate)
    : booking.checkOutDate;

  if (data.checkInDate) updateData.checkInDate = checkIn;
  if (data.checkOutDate) updateData.checkOutDate = checkOut;

  updateData.guestName = data.guestName ?? booking.guestName;
  updateData.guestContact = data.guestContact ?? booking.guestContact;
  updateData.updatedAt = new Date();

  // 2. 處理 Items 更新 (如果 data.items 存在，則需要重新計算價格和總金額)
  if (data.items && data.items.length > 0) {
    let newTotalAmount = 0;

    // 遍歷所有新的預訂項目，查詢價格並計算單房總價
    const itemsWithPricing = await Promise.all(
      data.items.map(async (item: any) => {
        const pricing = await getPricingDetails(
          item.roomTypeId,
          checkIn,
          checkOut
        );

        const itemSubtotal = pricing.unitPrice * item.quantity;
        newTotalAmount += itemSubtotal;

        return {
          roomTypeId: item.roomTypeId,
          quantity: item.quantity,
          unitPrice: pricing.unitPrice,
        };
      })
    );

    // 3. 🌟 執行庫存檢查 (針對新的 Items) 🌟
    await Promise.all(
      itemsWithPricing.map(async (item) => {
        const inventory = await prisma.roomInventory.findUnique({
          where: {
            roomTypeId_date: {
              roomTypeId: item.roomTypeId,
              date: checkIn,
            },
          },
          select: { availableCount: true },
        });

        // ⚠️ 檢查時必須考慮：如果是 Confirmed 訂單，這次編輯並沒有扣除庫存，
        //                    但由於我們假設在庫存扣除後不會有編輯操作，
        //                    或在庫存操作中處理舊訂單庫存釋放，這裡只做簡單的可用性檢查。
        if (!inventory || inventory.availableCount < item.quantity) {
          throw new BadRequestError(
            `房型 ${item.roomTypeId} 在 ${
              checkIn.toISOString().split("T")[0]
            } 庫存不足。`
          );
        }
      })
    );

    // 4. 賦予更新數據
    updateData.totalAmount = newTotalAmount; // 更新總金額

    updateData.Items = {
      deleteMany: {}, // 刪除舊的 Items
      create: itemsWithPricing.map((item) => ({
        // 建立新的 Items
        roomTypeId: item.roomTypeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice, // 🌟 使用計算後的新價格
      })),
    };
  }

  // 5. 執行資料庫更新
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: updateData,
    include: { Items: true },
  });

  return updatedBooking;
};

/**
 * 取消訂單
 */
export const cancelBookingService = async (
  bookingId: number,
  userId: number
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      status: true,
      Items: { select: { roomTypeId: true, quantity: true } },
      checkInDate: true,
    },
  });

  if (!booking || booking.userId !== userId) {
    throw new BadRequestError("訂單不存在或無權限取消。");
  }

  if (booking.status === "Cancelled") {
    // 已經是取消狀態，無需再次取消
    return booking;
  }

  // 1. 如果訂單狀態是 Confirmed (已確認/已付款)，取消時必須釋放庫存
  if (booking.status === "Confirmed") {
    // 由於是單晚預訂，只需更新 checkInDate 的庫存
    await prisma.$transaction(
      booking.Items.map((item) =>
        prisma.roomInventory.update({
          where: {
            roomTypeId_date: {
              roomTypeId: item.roomTypeId,
              date: booking.checkInDate,
            },
          },
          data: {
            // 釋放庫存 (availableCount + 數量)
            availableCount: {
              increment: item.quantity,
            },
          },
        })
      )
    );
  }

  // 2. 更新訂單狀態
  const cancelled = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "Cancelled",
      cancellationDate: new Date(),
    },
    include: { Items: true },
  });

  return cancelled;
};
