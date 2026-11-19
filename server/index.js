import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: "Jamendo", configured: Boolean(CLIENT_ID) });
});

app.get("/api/tracks", async (req, res) => {
  if (!CLIENT_ID) {
    return res.status(503).json({
      error: "Добавьте JAMENDO_CLIENT_ID в .env. Получить ключ можно на devportal.jamendo.com"
    });
  }
  const search = String(req.query.search || "").slice(0, 100);
  const tag = String(req.query.tag || "").slice(0, 60);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: "json",
    limit: "30",
    audioformat: "mp32",
    include: "licenses",
    order: search ? "relevance" : "popularity_month"
  });
  if (search) params.set("search", search);
  if (tag) params.set("tags", tag);

  try {
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`);
    if (!response.ok) throw new Error(`Jamendo API returned ${response.status}`);
    const payload = await response.json();
    if (payload.headers?.status !== "success") {
      throw new Error(payload.headers?.error_message || "Jamendo API error");
    }
    const tracks = (payload.results || []).filter(t => t.audio).map(t => ({
      id: String(t.id),
      title: t.name,
      artist: t.artist_name,
      album: t.album_name || "Single",
      image: t.album_image || t.image,
      audio: t.audio,
      duration: Number(t.duration || 0),
      license: t.license_ccurl || "",
      audiodownloadAllowed: Boolean(t.audiodownload_allowed),
      source: "Jamendo"
    }));
    res.set("Cache-Control", "public, max-age=120");
    res.json({ tracks });
  } catch (error) {
    res.status(502).json({ error: "Не удалось загрузить каталог: " + error.message });
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => console.log(`WibeMusic server: http://localhost:${PORT}`));
