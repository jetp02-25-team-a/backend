export function computeRatingInfo(reviews: { rating: number }[]) {
  const count = reviews.length;
  const avg = count
    ? Number(
        (reviews.reduce((s, r) => s + Number(r.rating), 0) / count).toFixed(1)
      )
    : 0;

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => Number(r.rating) === star).length;
    const pct = count ? Math.round((n / count) * 100) : 0;
    return { star, pct };
  });

  return { avg, count, dist };
}
