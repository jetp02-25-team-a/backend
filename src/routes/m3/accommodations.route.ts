import { Router } from "express";
import {
  getAccommodations,
  getAccommodationById,
  getAccommodationList,
} from "../../controllers/m3";

const router = Router();

router.get("/accommodations", getAccommodationList);
router.get("/accommodations/:id", getAccommodationById);

export default router;
