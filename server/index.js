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
  res.json({
    ok: true,
    provider: "Jamendo + Audius + iTunes",
    jamendoConfigured: Boolean(CLIENT_ID),
    audiusConfigured: true,
    itunesConfigured: true
  });
});

async function getJamendoTracks(search, tag) {
  if (!CLIENT_ID) return [];

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

  const response = await fetch(
    `https://api.jamendo.com/v3.0/tracks/?${params}`
  );

  if (!response.ok) throw new Error("Jamendo: " + response.status);

  const payload = await response.json();

  if (payload.headers?.status !== "success") {
    throw new Error(payload.headers?.error_message || "Jamendo API error");
  }

  return (payload.results || [])
    .filter(t => t.audio)
    .map(t => ({
      id: "jamendo-" + t.id,
      title: t.name,
      artist: t.artist_name,
      album: t.album_name || "Single",
      image: t.album_image || t.image,
      audio: t.audio,
      duration: Number(t.duration || 0),
      license: t.license_ccurl || "",
      audiodownloadAllowed: Boolean(t.audiodownload_allowed),
      source: "Jamendo",
      isPreview: false
    }));
}

async function getITunesTracks(search) {
  if (!search) return [];

  const params = new URLSearchParams({
    term: search,
    entity: "song",
    media: "music",
    limit: "30",
    country: "US"
  });

  const response = await fetch(
    `https://itunes.apple.com/search?${params}`
  );

  if (!response.ok) throw new Error("iTunes: " + response.status);

  const payload = await response.json();

  return (payload.results || [])
    .filter(t => t.previewUrl && t.trackId)
    .map(t => ({
      id: "itunes-" + t.trackId,
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName || "Single",
      image: (t.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
      audio: t.previewUrl,
      duration: Math.round((t.trackTimeMillis || 30000) / 1000),
      license: "",
      audiodownloadAllowed: false,
      source: "iTunes",
      isPreview: true,
      trackUrl: t.trackViewUrl || ""
    }));
}


async function getAudiusTracks(search) {
  if (!search) return [];

  const params = new URLSearchParams({
    query: search,
    limit: "30",
    app_name: "WibeMusic"
  });

  const response = await fetch(
    `https://api.audius.co/v1/tracks/search?${params}`
  );

  if (!response.ok) throw new Error("Audius: " + response.status);

  const payload = await response.json();

  return (payload.data || [])
    .filter(t => t.id && t.is_streamable && !t.is_stream_gated)
    .map(t => ({
      id: "audius-" + t.id,
      title: t.title,
      artist: t.user?.name || "Audius",
      album: "Audius",
      image: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
      audio: `https://api.audius.co/v1/tracks/${encodeURIComponent(t.id)}/stream?app_name=WibeMusic`,
      duration: Number(t.duration || 0),
      license: t.license || "Не указана",
      audiodownloadAllowed: false,
      source: "Audius",
      isPreview: false,
      trackUrl: t.permalink ? "https://audius.co" + t.permalink : ""
    }));
}

app.get("/api/tracks", async (req, res) => {
  const search = String(req.query.search || "").slice(0, 100);
  const tag = String(req.query.tag || "").slice(0, 60);

  try {
    const results = await Promise.allSettled([
      getJamendoTracks(search, tag),
      getAudiusTracks(search),
      getITunesTracks(search)
    ]);

    const jamendo = results[0].status === "fulfilled"
      ? results[0].value : [];

    const audius = results[1].status === "fulfilled"
      ? results[1].value : [];

    const itunes = results[2].status === "fulfilled"
      ? results[2].value : [];

    const tracks = [...jamendo, ...audius, ...itunes];

    if (!tracks.length && results.every(r => r.status === "rejected")) {
      throw new Error("Не удалось подключиться к музыкальным каталогам");
    }

    res.set("Cache-Control", "public, max-age=120");
    res.json({
      tracks,
      sources: {
        jamendo: jamendo.length,
        audius: audius.length,
        itunes: itunes.length
      }
    });
  } catch (error) {
    res.status(502).json({
      error: "Не удалось загрузить музыку: " + error.message
    });
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`WibeMusic server: http://localhost:${PORT}`);
});
