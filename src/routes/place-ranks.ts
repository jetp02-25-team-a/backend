// src/routes/ranks.router.ts
import { Router } from "express";
import { z } from "zod";
import {
  deleteRank,
  createOrUpsertRank /* , upsertRank */,
} from "../services/rank";

const router = Router({ mergeParams: true });

/** POST /place/:id/ranks  建立評分（同一 userId 同一 place 建議只允許一筆） */
router.post("/:placeId/ranks", async (req, res) => {
  const placeId = Number(req.params.placeId);
  const { userId, score } = req.body;

  console.log("[POST /ranks] placeId, userId, score =", placeId, userId, score);
  const row = await createOrUpsertRank(userId, placeId, score);

  return res.json({
    success: true,
    data: row,
  });
});

export default router;
