// src/routes/m2/tripPlace-routes.ts
import { Router } from "express";
import { addPlaceToTripController } from "../../controllers/m2/tripPlace-controller";
import { requireAuth } from "../../middleware";

const router = Router();

router.post("/plan/:tripId/place", requireAuth, addPlaceToTripController);

export default router;
