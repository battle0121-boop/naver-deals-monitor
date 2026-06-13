export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-naver-client-id,x-naver-client-secret");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { query, display = 20, sort = "asc" } = req.query;
  if (!query) return res.status(400).json({ error: "query 파라미터 필요" });

  const clientId = req.headers["x-naver-client-id"] || process.env.NAVER_CLIENT_ID;
  const clientSecret = req.headers["x-naver-client-secret"] || process.env.NAVER_CLIENT_SECRET;

  try {
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });
    const data = await response.json();

    const items = (data.items || []).map((item) => {
      const original = parseInt(item.hprice || 0);
      const sale = parseInt(item.lprice || 0);
      const discount = original > sale && original > 0
        ? Math.round(((original - sale) / original) * 100)
        : 0;
      return {
        ...item,
        originalPrice: original || sale,
        salePrice: sale,
        discount,
        title: item.title.replace(/<[^>]*>/g, ""),
      };
    }).filter(item => item.salePrice > 0);

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
