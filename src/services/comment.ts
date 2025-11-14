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

export async function updateComment(
  placeId: number,
  commentId: number,
  content: string
) {
  return prisma.comment.update({
    where: { id: commentId, placeId },
    data: content,
    select: {
      id: true,
      placeId: true,
      content: true,
      updatedAt: true,
    },
  });
}

export async function deleteComment(placeId: number, commentId: number) {
  await prisma.comment.delete({ where: { id: commentId, placeId } });
  return { id: commentId };
}

/** DELETE /places/:id/comments/:commentId  刪除留言和評分 */
export async function deleteReview(
  userId: number,
  placeId: number,
  commentId: number
) {
  console.log("[deleteReview] params =", { userId, placeId, commentId });

  return prisma.$transaction(async (tx) => {
    // 1. 刪 Rank（這個人對這個地點的評分）
    await tx.rank.deleteMany({
      where: {
        userId, // 👈 這裡都是 number，不要再包一層 {}
        placeId,
      },
    });

    // 2. 刪 Comment（保護一下，只刪自己的那筆）
    await tx.comment.deleteMany({
      where: {
        id: commentId,
        userId,
        placeId,
      },
    });

    return { commentId };
  });
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
