import { Router } from "express";

import { getFavoritesAcc, toggleFavoriteAcc } from "../../controllers/m3";

const router = Router();

router.get("/favorite", getFavoritesAcc);

router.post("/favorite/:id", toggleFavoriteAcc);

export default router;
