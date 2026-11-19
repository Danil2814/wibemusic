import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AudioLines, Search, Heart, Play, Pause, SkipBack, SkipForward, Shuffle,
  Repeat, Volume2, Home, Library, ListMusic, Plus, X, Music2, Headphones
} from "lucide-react";
import "./style.css";

const tg = window.Telegram?.WebApp;
const readStore = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const fmt = n => `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, "0")}`;

function App() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [favorites, setFavorites] = useState(() => readStore("wibe-favs", []));
  const [playlists, setPlaylists] = useState(() => readStore("wibe-playlists", [{ id: "liked", name: "Любимые треки", ids: [] }]));
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    tg?.ready?.();
    tg?.expand?.();
    tg?.setHeaderColor?.("#090a10");
    tg?.setBackgroundColor?.("#090a10");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onInstall = e => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function loadTracks(search = "") {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/tracks${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка каталога");
      setTracks(data.tracks || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTracks(); }, []);
  useEffect(() => { localStorage.setItem("wibe-favs", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("wibe-playlists", JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => {
    if (current && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: current.artist, album: current.album || "WibeMusic", artwork: current.image ? [{ src: current.image, sizes: "512x512", type: "image/jpeg" }] : [] });
      navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => nextTrack(-1));
      navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack(1));
    }
  }, [current]);
  useEffect(() => {
    if (!audioRef.current || !current) return;
    audioRef.current.src = current.audio;
    audioRef.current.load();
    audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [current]);

  const visibleTracks = useMemo(() => {
    if (activeTab === "liked") return tracks.filter(t => favorites.includes(t.id));
    if (activeTab.startsWith("playlist:")) {
      const p = playlists.find(x => x.id === activeTab.slice(9));
      return tracks.filter(t => p?.ids.includes(t.id));
    }
    return tracks;
  }, [tracks, favorites, activeTab, playlists]);

  function playTrack(track) { setCurrent(track); setPlaying(true); }
  function toggleFavorite(id) {
    setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  }
  function nextTrack(direction = 1) {
    if (!tracks.length) return;
    const index = Math.max(0, tracks.findIndex(t => t.id === current?.id));
    const next = shuffle ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[(index + direction + tracks.length) % tracks.length];
    setCurrent(next);
  }
  function togglePlay() {
    if (!current && tracks[0]) return playTrack(tracks[0]);
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  }
  function createPlaylist(e) {
    e.preventDefault();
    const name = playlistName.trim();
    if (!name) return;
    setPlaylists(p => [...p, { id: crypto.randomUUID(), name, ids: [] }]);
    setPlaylistName(""); setShowCreate(false);
  }
  function addToPlaylist(track, id) {
    setPlaylists(old => old.map(p => p.id === id ? { ...p, ids: [...new Set([...p.ids, track.id])] } : p));
  }
  const title = activeTab === "liked" ? "Избранное" :
    activeTab.startsWith("playlist:") ? playlists.find(p => p.id === activeTab.slice(9))?.name : "Открой свой вайб";

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-icon"><AudioLines size={22}/></div><span>Wibe<span>Music</span></span></div>
      <div className="header-actions">{installPrompt && <button className="install-button" onClick={async()=>{installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null);}}>Установить</button>}{installed && <span className="installed-label">Установлено</span>}<div className="avatar"><Headphones size={18}/></div></div>
    </header>

    <main>
      {activeTab === "home" && <section className="hero">
        <div className="hero-glow"></div>
        <div className="eyebrow"><span className="pulse"></span> ТВОЙ МУЗЫКАЛЬНЫЙ МИР</div>
        <h1>Поймай свой<br/><em>Wibe.</em></h1>
        <p>Новая музыка, новые эмоции.<br/>Включай и оставайся в моменте.</p>
        <button className="hero-button" onClick={() => tracks[0] && playTrack(tracks[0])}><Play size={17} fill="currentColor"/> Слушать музыку</button>
        <div className="hero-orb orb-one"></div><div className="hero-orb orb-two"></div>
      </section>}

      <section className="section-head">
        <div><div className="eyebrow">{activeTab === "home" ? "ПОДБОРКА ДЛЯ ТЕБЯ" : "ТВОЯ КОЛЛЕКЦИЯ"}</div><h2>{title}</h2></div>
        <span className="count">{visibleTracks.length} треков</span>
      </section>

      <div className="searchbar">
        <Search size={18}/>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && loadTracks(query)} placeholder="Трек, исполнитель или настроение"/>
        {query && <button className="clear" onClick={() => {setQuery(""); loadTracks("");}}><X size={16}/></button>}
        <button className="search-go" onClick={() => loadTracks(query)}>Найти</button>
      </div>

      <button className="search-go" style={{width:"100%",marginTop:10}} onClick={() => query.trim() ? window.open("https://vk.com/audio?q="+encodeURIComponent(query.trim()),"_blank") : alert("Введи название песни")}>Искать музыку во VK</button>
      {activeTab === "home" && <>
        <div className="chips">
          {["Все","Chill","Electronic","Jazz","Rock","Pop"].map((g,i)=><button key={g} className={i===0?"chip active":"chip"} onClick={() => {setQuery(""); loadTracks(i===0?"":g.toLowerCase());}}>{g}</button>)}
        </div>
        <section className="russian-picks">
          <div className="eyebrow">ПОИСК ПО ИСПОЛНИТЕЛЯМ</div>
          <h3>Русская музыка 🇷🇺</h3>
          <div className="artist-chips">{["Баста","MACAN","Miyagi","Егор Крид","Zivert","ANNA ASTI","JONY","NILETTO","Кино","Король и Шут","Три дня дождя","Мот"].map(name=><button key={name} className="artist-chip" onClick={()=>{setQuery(name);loadTracks(name);}}>{name}</button>)}</div>
          <small>Каталог Jamendo содержит независимую музыку: наличие конкретных популярных исполнителей не гарантируется.</small>
        </section>
      </>}

      {error && <div className="notice"><strong>Каталог пока не подключён</strong><span>{error}</span><small>Добавь ключ Jamendo в файл .env и перезапусти сервер.</small></div>}
      {loading ? <div className="loading"><div className="spinner"></div>Загружаем музыку...</div> :
        visibleTracks.length ? <div className="track-list">{visibleTracks.map((t,i)=>
          <div className={`track ${current?.id===t.id?"selected":""}`} key={t.id}>
            <button className="cover" onClick={() => playTrack(t)}><img src={t.image} onError={e=>e.currentTarget.src="https://placehold.co/100x100/191a28/ffffff?text=W"} /><span><Play size={17} fill="currentColor"/></span></button>
            <button className="track-info" onClick={() => playTrack(t)}><strong>{t.title}</strong><small>{t.artist}</small></button>
            <span className="track-time">{fmt(t.duration)}</span>
            <button className={`heart ${favorites.includes(t.id)?"liked":""}`} onClick={() => toggleFavorite(t.id)} aria-label="В избранное"><Heart size={18} fill={favorites.includes(t.id)?"currentColor":"none"}/></button>
            <button className="more" onClick={() => {const id=playlists[0]?.id; if(id) addToPlaylist(t,id);}} title="Добавить в любимые"><Plus size={17}/></button>
          </div>)}</div> : <div className="empty"><Music2 size={30}/><strong>Здесь пока тихо</strong><span>Найди музыку или добавь треки в избранное.</span></div>}
      {activeTab === "library" && <section className="playlist-area">
        <div className="playlist-head"><h3>Твои плейлисты</h3><button onClick={() => setShowCreate(true)}><Plus size={16}/> Создать</button></div>
        {playlists.map(p=><button className="playlist-row" key={p.id} onClick={() => setActiveTab(`playlist:${p.id}`)}><div className="playlist-icon"><ListMusic/></div><span><b>{p.name}</b><small>{p.ids.length} треков</small></span></button>)}
      </section>}
    </main>

    <nav className="bottom-nav">
      <button className={activeTab==="home"?"nav-active":""} onClick={()=>setActiveTab("home")}><Home/><span>Главная</span></button>
      <button className={activeTab==="liked"?"nav-active":""} onClick={()=>setActiveTab("liked")}><Heart/><span>Избранное</span></button>
      <button className={activeTab==="library"?"nav-active":""} onClick={()=>setActiveTab("library")}><Library/><span>Медиатека</span></button>
    </nav>

    {current && <div className="player">
      <div className="player-progress"><div style={{width:`${duration?progress/duration*100:0}%`}}/></div>
      <div className="player-main">
        <img className="player-cover" src={current.image}/>
        <div className="player-meta"><b>{current.title}</b><span>{current.artist}</span></div>
        <button className={`player-heart ${favorites.includes(current.id)?"liked":""}`} onClick={()=>toggleFavorite(current.id)}><Heart size={19} fill={favorites.includes(current.id)?"currentColor":"none"}/></button>
        <button className="control-main" onClick={togglePlay}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button>
      </div>
      <div className="player-extra">
        <span>{fmt(progress)}</span>
        <input aria-label="Позиция воспроизведения" type="range" min="0" max={duration||100} value={Math.min(progress,duration||100)} onChange={e=>{const v=Number(e.target.value); if(audioRef.current) audioRef.current.currentTime=v; setProgress(v);}}/>
        <span>{fmt(duration)}</span>
        <button onClick={()=>setShuffle(!shuffle)} className={shuffle?"control-on":""}><Shuffle size={15}/></button>
        <button onClick={()=>setRepeat(!repeat)} className={repeat?"control-on":""}><Repeat size={15}/></button>
        <Volume2 size={15}/><input className="volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/>
      </div>
      <div className="player-buttons"><button onClick={()=>nextTrack(-1)}><SkipBack/></button><button onClick={togglePlay} className="big-play">{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={()=>nextTrack(1)}><SkipForward/></button></div>
    </div>}
    <audio ref={audioRef} onTimeUpdate={e=>setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e=>setDuration(e.currentTarget.duration||current?.duration||0)} onEnded={()=>repeat?audioRef.current?.play():nextTrack(1)} onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)}/>

    {showCreate && <div className="modal-backdrop" onClick={()=>setShowCreate(false)}><form className="modal" onSubmit={createPlaylist} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setShowCreate(false)}><X/></button><h3>Новый плейлист</h3><p>Собери музыку под своё настроение.</p><input autoFocus value={playlistName} onChange={e=>setPlaylistName(e.target.value)} placeholder="Название плейлиста"/><button className="hero-button" type="submit">Создать плейлист</button></form></div>}
    <footer>Музыка предоставляется Jamendo · Проверяй условия лицензии перед коммерческим использованием</footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
