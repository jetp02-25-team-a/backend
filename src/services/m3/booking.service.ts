import { prisma } from "../../utils/prisma-pagination";
import { BadRequestError } from "../../lib";

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
    select: { id: true, name: true },
  });

  const results = await Promise.all(
    roomTypes.map(async (roomType) => {
      const inventories = await prisma.roomInventory.findMany({
        where: {
          roomTypeId: roomType.id,
          date: { gte: checkInDate, lt: checkOutDate },
        },
        orderBy: { date: "asc" },
      });

      return {
        roomTypeId: roomType.id,
        name: roomType.name,
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
    items,
  } = data;

  const totalAmount = items.reduce((sum: number, item: any) => {
    const unitPrice = 2000; // TODO: 查房型價格
    return sum + unitPrice * item.quantity;
  }, 0);

  const booking = await prisma.booking.create({
    data: {
      userId,
      accommodationId,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      guestName,
      guestContact,
      status: "Pending",
      totalAmount,
      Items: {
        create: items.map((item: any) => ({
          roomTypeId: item.roomTypeId,
          quantity: item.quantity,
          unitPrice: 2000, // TODO: 查房型價格
        })),
      },
    },
    include: { Items: true },
  });

  return booking;
};

/**
 * 查詢訂單
 */
export const getBookingByIdService = async (
  bookingId: number,
  userId: number
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { Items: true },
  });

  if (!booking || booking.userId !== userId) {
    throw new BadRequestError("訂單不存在或無權限查詢。");
  }

  return booking;
};

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

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      checkInDate: data.checkInDate
        ? new Date(data.checkInDate)
        : booking.checkInDate,
      checkOutDate: data.checkOutDate
        ? new Date(data.checkOutDate)
        : booking.checkOutDate,
      guestName: data.guestName ?? booking.guestName,
      guestContact: data.guestContact ?? booking.guestContact,
      Items: data.items
        ? {
            deleteMany: {}, // 先刪除舊的 Items
            create: data.items.map((item: any) => ({
              roomTypeId: item.roomTypeId,
              quantity: item.quantity,
              unitPrice: 2000, // TODO: 查房型價格
            })),
          }
        : undefined,
    },
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
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking || booking.userId !== userId) {
    throw new BadRequestError("訂單不存在或無權限取消。");
  }

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
