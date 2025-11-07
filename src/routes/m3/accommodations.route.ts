import { Router } from "express";
import {
  getAccommodations,
  getAccommodationById,
  getAccommodationList,
  getAccommodationSearch,
} from "../../controllers/m3";

const router = Router();

router.get("/accommodations", getAccommodationList);
router.get("/accommodations/search", getAccommodationSearch);

router.get("/accommodations/:id", getAccommodationById);

export default router;
