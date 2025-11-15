SELECT COUNT(*) num, post_id FROM `likes` GROUP BY post_id;


SELECT posts.post_id, posts.title, num_likes.num FROM posts JOIN (
    SELECT COUNT(*) num, post_id FROM `likes` GROUP BY post_id
) num_likes ON posts.post_id=num_likes.post_id
  ORDER BY num_likes.num DESC;