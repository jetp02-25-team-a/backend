// lib/api.ts
export async function getRanking(page = 1, limit = 10) {
  try {
    const res = await fetch(`/api/posts/ranking?page=${page}&limit=${limit}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch ranking posts: ${res.status}`);
    }

    const data = await res.json();

    // Pastikan data.data selalu array
    return {
      data: Array.isArray(data.data) ? data.data : [],
      page: data.page ?? page,
      limit: data.limit ?? limit,
    };
  } catch (err: any) {
    console.error("❌ getRanking error:", err);
    throw new Error(err.message || "Failed to fetch ranking posts");
  }
}
