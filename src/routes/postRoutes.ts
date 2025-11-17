import express from 'express';
import { getTopLikedPosts } from '../controllers/postController';

const router = express.Router();

router.get('/top-liked', getTopLikedPosts);

export default router;