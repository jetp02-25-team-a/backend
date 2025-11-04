// src/routes/comments.router.ts
import { Router } from "express";
import { z } from "zod";
import {
  createComment,
  updateComment,
  deleteComment,
  getUserCommentForPlace,
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
    // userName: z.string().min(1).max(50),
    userId: z.coerce.number().int().positive(),
    content: z.string().trim().min(1, "內容不可為空").max(1000),
    // userAvatar: z.string().url().optional(),
  });

  const parsed = Body.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
  }

  const { userId, content } = parsed.data;

  // 可選：若你不想允許重複，先查有沒有舊的
  const existing = await getUserCommentForPlace(placeId, userId);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: [
        {
          path: "comment",
          message: "Comment already exists for this user/place",
        },
      ],
      existing,
    });
  }

  const created = await createComment(placeId, userId, content);
  return res.status(201).json({ success: true, data: created });
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

  const Body = z.object({
    content: z.string().min(1).optional(),
  });
  // .refine((d) => d.content !== undefined, {
  //   message: "Nothing to update",
  // });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, error: errors });
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

  return res.json({ success: true, data: { id: commentId } });
});

export default router;
