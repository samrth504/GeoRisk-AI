import express from "express";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser();
const db = new Database("georisk.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_cache (
    id TEXT PRIMARY KEY,
    headline TEXT,
    analysis TEXT,
    risk_score INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/news", async (req, res) => {
    try {
      const feed = await parser.parseURL(
        "https://news.google.com/rss/search?q=geopolitics+conflict+economy+trade+when:1d&hl=en-IN&gl=IN&ceid=IN:en"
      );
      res.json(feed.items.map(item => ({
        id: item.guid || item.link,
        headline: item.title,
        source: item.source || "Google News",
        date: item.pubDate,
        link: item.link
      })));
    } catch (error) {
      console.error("RSS Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/cache", (req, res) => {
    try {
      const data = db.prepare("SELECT * FROM analysis_cache ORDER BY timestamp DESC LIMIT 50").all();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cache" });
    }
  });

  app.post("/api/cache", (req, res) => {
    const { id, headline, analysis, risk_score } = req.body;
    try {
      db.prepare(
        "INSERT OR REPLACE INTO analysis_cache (id, headline, analysis, risk_score) VALUES (?, ?, ?, ?)"
      ).run(id, headline, JSON.stringify(analysis), risk_score);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save cache" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
