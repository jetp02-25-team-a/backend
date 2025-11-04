import prisma from "../utils/prisma-pagination-place";

export async function createComment(
  placeId: number,
  userId: number,
  content: string
) {
  return prisma.comment.create({
    data: {
      placeId,
      userId,
      content,
    },
    select: {
      id: true,
      placeId: true,
      userId: true,
      content: true,
      createdAt: true,
    },
  });
}

export async function updateComment(commentId: number, content?: string) {
  return prisma.comment.update({
    where: { id: commentId },
    data: content !== undefined ? { content } : {},
    select: {
      id: true,
      placeId: true,
      content: true,
      updatedAt: true,
    },
  });
}

export async function deleteComment(commentId: number) {
  await prisma.comment.delete({ where: { id: commentId } });
  return { id: commentId };
}

/** 依 place + user 取得該使用者對此地點的comment（方便前端顯示 “我的comment”） */
export function getUserCommentForPlace(placeId: number, userId: number) {
  return prisma.comment.findUnique({
    where: { userId_placeId: { userId, placeId } },
    select: {
      id: true,
      placeId: true,
      userId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
