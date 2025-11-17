// import { prisma } from '../utils/prisma-pagination',
// // const prisma = new PrismaClient();

// export const getTopLikedPosts = async (
//   req: Request,
//   res: Response,
  
// ) =>
//     try {
//     const topLiked = await prisma.like.groupBy({
//       by: ['postId'],
//       _count: {
//         postId: true,
//       },
//       orderBy: {
//         _count: {
//           postId: 'desc',
//         },
//       },
//       take: 3,
//     });

//     const postIds = topLiked.map(item => item.postId);

//     const posts = await prisma.post.findMany({
//       where: {
//         id: { in: postIds },
//       },
//       include: {
//         Location: true,
//         User: true,
//         _count: {
//           select: { Likes: true },
//         },
//       },
//     });

//     res.json(posts);
//   } catch (error) {
//     console.error('Error fetching top liked posts:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };
import express from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma-pagination';

export const getTopLikedPosts = async (req: Request, res: Response) => {
  try {
    const topLiked = await prisma.like.groupBy({
      by: ['postId'],
      _count: { postId: true },
      orderBy: { _count: { postId: 'desc' } },
      take: 3,
    });

    const postIds = topLiked.map(item => item.postId);

    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        Location: true,
        User: true,
        _count: { select: { Likes: true } },
      },
    });

    // Sort posts by like count
    const sortedPosts = postIds.map(id => posts.find(p => p.id === id)).filter(Boolean);

    res.json(sortedPosts);
  } catch (error) {
    console.error('Error fetching top liked posts:', error);
    res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};