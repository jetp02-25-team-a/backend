import { Router } from "express";
import {
  listAccommodations,
  listPopularAccommodations,
  listHighRatedAccommodations,
  searchAccommodations,
  getAccommodationById,
  listAccommodationReviews,
  addAccommodationReviews,
} from "../../controllers/m3";
import { m3RequireAuth } from "../../middleware";

const router = Router();

router.get("/accommodations", listAccommodations);
router.get("/accommodations/popular", listPopularAccommodations);
router.get("/accommodations/highRated", listHighRatedAccommodations);
router.get("/accommodations/search", searchAccommodations);
router.get("/accommodations/:id", getAccommodationById);

router.get("/accommodations/:id/reviews", listAccommodationReviews);
router.post(
  "/accommodations/:id/reviews",
  m3RequireAuth,
  addAccommodationReviews
);

export default router;
