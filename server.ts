import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Express Server ───────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "local-storage", time: new Date().toISOString() });
  });

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const possiblePaths = [
      path.join(process.cwd(), "dist"),
      path.join(__dirname, "dist"),
      path.join(__dirname, "..", "dist")
    ];
    
    let distPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    
    console.log("Using dist path:", distPath);

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Frontend build not found. Please run 'npm run build'.");
        }
      });
    } else {
      app.get("*", (req, res) => {
        res.status(404).send("Dist directory not found. Please run 'npm run build'.");
      });
    }
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

let cachedApp: any = null;
export default async (req: any, res: any) => {
  try {
    if (!cachedApp) {
      cachedApp = await startServer();
    }
    return cachedApp(req, res);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error", details: String(err) });
  }
};
