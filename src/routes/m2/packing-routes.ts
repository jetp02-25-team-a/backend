import { Router } from "express";

import {
  getPackingList,
  createPackingItem,
  updatePackingItem,
  deletePackingItem,
} from "../../controllers/m2/packing-controller";

const router = Router();

router.get("/:tripId", getPackingList);
router.post("/", createPackingItem);
router.put("/:id", updatePackingItem);
router.delete("/:id", deletePackingItem);

export default router;
