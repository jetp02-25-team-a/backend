// src/routes/m2/destination.routes.ts
import { Router } from "express";
import { getAllDestinationsController } from "../../controllers/m2/destination-controller";

const router = Router();

router.get("/", getAllDestinationsController);

export default router;
