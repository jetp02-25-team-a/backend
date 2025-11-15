import { Router } from "express";

import { getFavoritesAcc, toggleFavoriteAcc } from "../../controllers/m3";
import { m3RequireAuth } from "../../middleware";

const router = Router();

// GET /api/m3/favorite
router.get("/favorite", m3RequireAuth, getFavoritesAcc);

// POST /api/m3/favorite/:accId/toggle
router.post("/favorite/:accId/toggle", m3RequireAuth, toggleFavoriteAcc);

export default router;
