import type { Router, Request, Response } from 'express';

// Definisi Interface untuk Article
interface Article {
  id: number;
  title: string;
  author: string;
  content: string;
}

const router = Router();

// Data artikel dengan tipe Article[]
let articles: Article[] = [
  { id: 1, title: 'Menjelajah Gunung Fuji', author: 'Nobi', content: 'Pengalaman tak terlupakan di Jepang.' },
  { id: 2, title: 'Taipei101 night', author: 'Mira', content: 'Makanan malam terbaik di Shilin Night Market.' },
];

// Interface untuk body request POST
interface PostArticleRequestBody {
  title: string;
  author: string;
  content: string; // Opsional, tergantung implementasi
}

// GET all articles
router.get('/', (req: Request, res: Response) => {
  // TypeScript mengetahui bahwa `articles` adalah Article[]
  res.json(articles);
});

// POST new article
router.post('/', (req: Request<{}, {}, PostArticleRequestBody>, res: Response) => {
  // Mengambil tipe dari body request
  const { title, author, content } = req.body;
  
  if (!title || !author) {
    return res.status(400).json({ error: 'title dan author wajib diisi' });
  }

  // Membuat Article baru
  const newArticle: Article = { 
    id: articles.length > 0 ? articles[articles.length - 1].id + 1 : 1, // Pastikan id unik
    title, 
    author, 
    content: content || '', // Berikan nilai default jika content tidak ada
  };
  
  articles.push(newArticle);
  res.status(201).json(newArticle);
});

export default router; 
// Menggunakan 'export default' untuk modul ES6, ini lebih umum di TS.
// Jika Anda tetap ingin menggunakan 'module.exports', cukup ganti baris ini dengan:
// module.exports = router;