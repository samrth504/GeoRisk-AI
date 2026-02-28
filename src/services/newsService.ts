export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  date: string;
  link: string;
}

export interface CachedAnalysis {
  id: string;
  headline: string;
  analysis: string; // JSON string
  risk_score: number;
  timestamp: string;
}

export const fetchNews = async (): Promise<NewsItem[]> => {
  const res = await fetch("/api/news");
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
};

export const fetchCache = async (): Promise<CachedAnalysis[]> => {
  const res = await fetch("/api/cache");
  if (!res.ok) throw new Error("Failed to fetch cache");
  return res.json();
};

export const saveToCache = async (id: string, headline: string, analysis: any, riskScore: number) => {
  await fetch("/api/cache", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, headline, analysis, risk_score: riskScore }),
  });
};
