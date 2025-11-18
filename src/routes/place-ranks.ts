import { Router } from "express";
import { z } from "zod";
import {
  deleteRank,
  createOrUpsertRank /* , upsertRank */,
} from "../services/rank";
import { requireAuth } from "../middleware/jwt";

const router = Router({ mergeParams: true });

/** POST /place/:id/ranks  建立評分（同一 userId 同一 place 建議只允許一筆） */
router.post("/:placeId/ranks", requireAuth, async (req, res) => {
  const userId = req.user!.user_id;
  const placeId = Number(req.params.placeId);
  const { score } = req.body;

  console.log("[POST /ranks] placeId, userId, score =", placeId, userId, score);
  const row = await createOrUpsertRank(userId, placeId, score);

  return res.json({
    success: true,
    data: row,
  });
});

export default router;
