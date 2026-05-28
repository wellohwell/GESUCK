import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing
  app.use(express.json());

  // API route for proxying Google Sheets
  app.get("/api/pricelist", async (req, res) => {
    const { sheetId, sheetName } = req.query;
    if (!sheetId || !sheetName) {
        return res.status(400).json({ error: "Missing sheetId or sheetName" });
    }
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName as string)}`;
    try {
        const response = await fetch(sheetUrl);
        if (!response.ok) return res.status(response.status).json({ error: "External fetch failed" });
        const data = await response.text();
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    } catch (error) {
        res.status(500).json({ error: "Proxy failed" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
