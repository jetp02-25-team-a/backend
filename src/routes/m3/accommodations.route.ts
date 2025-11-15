import { Router } from "express";
import {
  listAccommodations,
  listPopularAccommodations,
  listHighRatedAccommodations,
  searchAccommodations,
  getAccommodationById,
} from "../../controllers/m3";

const router = Router();

router.get("/accommodations", listAccommodations);
router.get("/accommodations/popular", listPopularAccommodations);
router.get("/accommodations/highRated", listHighRatedAccommodations);
router.get("/accommodations/search", searchAccommodations);
router.get("/accommodations/:id", getAccommodationById);

export default router;
