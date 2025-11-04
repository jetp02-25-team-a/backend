// src/routes/comments.router.ts
import { Router } from "express";
import { z } from "zod";
import {
  createComment,
  updateComment,
  deleteComment,
} from "../services/comment";

// ★ 這行很關鍵：讓子路由吃得到父層的 :id
const router = Router({ mergeParams: true });

/** POST /places/:id/comments  新增留言 */
router.post("/", async (req, res) => {
  const placeId = Number(req.params.id);
  if (!Number.isInteger(placeId)) {
    return res
      .status(400)
      .json({ success: false, error: { message: "Invalid place id" } });
  }

  const Body = z.object({
    userName: z.string().min(1).max(50),
    content: z.string().min(1),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    userAvatar: z.string().url().optional(),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.flatten() });
  }

  const userId = req.user?.id ?? 0;
  const created = await createComment(placeId, userId, parsed.data);
  res.status(201).json({ success: true, data: created });
});

/** PATCH /places/:id/comments/:commentId  更新留言 */
router.patch("/:commentId", async (req, res) => {
  const placeId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(placeId) || !Number.isInteger(commentId)) {
    return res
      .status(400)
      .json({ success: false, error: { message: "Invalid ids" } });
  }

  const Body = z
    .object({
      content: z.string().min(1).optional(),
      rating: z.coerce.number().int().min(1).max(5).optional(),
    })
    .refine((d) => d.content !== undefined || d.rating !== undefined, {
      message: "Nothing to update",
    });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.flatten() });
  }

  const updated = await updateComment(placeId, commentId, parsed.data);
  if (!updated) {
    return res
      .status(404)
      .json({ success: false, error: { message: "Comment not found" } });
  }

  res.json({ success: true, data: updated });
});

/** DELETE /places/:id/comments/:commentId  刪除留言 */
router.delete("/:commentId", async (req, res) => {
  const placeId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(placeId) || !Number.isInteger(commentId)) {
    return res
      .status(400)
      .json({ success: false, error: { message: "Invalid ids" } });
  }

  const ok = await deleteComment(placeId, commentId);
  if (!ok) {
    return res
      .status(404)
      .json({ success: false, error: { message: "Comment not found" } });
  }

  res.json({ success: true, data: { id: commentId } });
});

export default router;
