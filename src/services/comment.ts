import prisma from "../utils/prisma-pagination-place";

export async function createComment(
  placeId: number,
  userId: number,
  data: {
    content: string;
    createdAt: Date;
  }
) {
  return prisma.comment.create({
    data: {
      placeId,
      userId,
      content: data.content,
      createdAt: data.createdAt,
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
  commentId: number,
  data: {
    content?: string;
    updatedAt: Date;
  }
) {
  return prisma.comment.update({
    where: { id: commentId },
    data: {
      ...(data.content !== undefined
        ? { content: data.content, updatedAt: data.updatedAt }
        : {}),
    },
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

export async function getCommentById(commentId: number) {
  return prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      placeId: true,
      content: true,
    },
  });
}
