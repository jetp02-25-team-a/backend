import { Router } from "express";

import { getFavoritesAcc, toggleFavoriteAcc } from "../../controllers/m3";
import { jwtParseMiddleware, requireAuth } from "../../middleware";

const router = Router();

// router.get("/favorite", jwtParseMiddleware, requireAuth, getFavoritesAcc);
router.get("/favorite", jwtParseMiddleware, requireAuth, getFavoritesAcc);

router.post(
  "/favorite/:accId/toggle",
  jwtParseMiddleware,
  requireAuth,
  toggleFavoriteAcc
);

export default router;
