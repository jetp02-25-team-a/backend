import type { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma-pagination';
import { jwtParseMiddleware, requireAuth } from '../middleware/jwt';

const likeRouter = Router();

/**
 * POST /post/:id/like
 * Toggle like/unlike for 1 post
 */
likeRouter.post(
  '/post/:id/like',
  jwtParseMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.id);
      const userId = req.user?.id;

      if (!postId || !userId) {
        return res.status(400).json({ message: 'Invalid postId or userId' });
      }

      const existingLike = await prisma.like.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      let message = '';
      if (existingLike) {
        await prisma.like.delete({ where: { id: existingLike.id } });
        message = 'Post unliked';
      } else {
        await prisma.like.create({ data: { userId, postId } });
        message = 'Post liked';
      }

      const likeCount = await prisma.like.count({ where: { postId } });

      return res.status(200).json({ message, likeCount });
    } catch (error) {
      console.error('❌ Error in POST /post/:id/like:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

/**
 * GET /post/:id/likes
 * Ambil jumlah total likes dari satu post
 */
likeRouter.get('/post/:id/likes', async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    if (!postId) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const likeCount = await prisma.like.count({ where: { postId } });

    return res.status(200).json({ postId, likeCount });
  } catch (error) {
    console.error('❌ Error in GET /post/:id/likes:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default likeRouter;