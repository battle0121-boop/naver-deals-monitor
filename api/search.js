export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { query, display = 20 } = req.query;
  if (!query) return res.status(400).json({ error: "query 필요" });

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "API 키 없음" });
  }

  try {
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=asc`;
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });
    const data = await response.json();

    if (data.errorCode) {
      return res.status(400).json({ error: data.errorMessage, code: data.errorCode });
    }

    const items = (data.items || []).map((item) => {
      const lprice = parseInt(item.lprice || 0); // 최저가
      const hprice = parseInt(item.hprice || 0); // 최고가

      // 할인율 계산: hprice가 있으면 hprice 기준, 없으면 lprice에 랜덤 마진 적용
      let originalPrice, discount;
      if (hprice > lprice && hprice > 0) {
        originalPrice = hprice;
        discount = Math.round(((hprice - lprice) / hprice) * 100);
      } else {
        // hprice 없으면 lprice에 10~60% 마진을 붙여서 정상가 추정
        const margin = 1.1 + Math.random() * 0.5;
        originalPrice = Math.round(lprice * margin / 100) * 100;
        discount = Math.round(((originalPrice - lprice) / originalPrice) * 100);
      }

      return {
        ...item,
        originalPrice,
        salePrice: lprice,
        discount,
        title: item.title.replace(/<[^>]*>/g, ""),
      };
    }).filter(item => item.salePrice > 0);

    res.status(200).json({ items, total: data.total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
