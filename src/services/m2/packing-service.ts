// src/services/m2/packing-service.ts
import { PrismaClient } from "../../generated/prisma";
import type {
  PackingCreateDTO,
  PackingUpdateDTO,
} from "../../interfaces/m2/packing-interface";

const prisma = new PrismaClient();

export const getPackingItemsService = async (tripId: number) => {
  return prisma.packingItem.findMany({
    where: { TripPlanId: tripId },
    orderBy: { id: "asc" },
  });
};

export const createPackingItemService = async (data: PackingCreateDTO) => {
  return prisma.packingItem.create({
    data,
    select: {
      id: true,
      TripPlanId: true,
      templateId: true,
      userId: true,
      name: true,
      isChecked: true,
    },
  });
};

export const updatePackingItemService = async (
  id: number,
  data: PackingUpdateDTO
) => {
  return prisma.packingItem.update({
    where: { id },
    data,
  });
};

export const deletePackingItemService = async (id: number) => {
  return prisma.packingItem.delete({ where: { id } });
};
