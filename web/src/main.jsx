import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clapperboard,
  Database,
  ExternalLink,
  Eye,
  Globe2,
  LayoutDashboard,
  Library,
  ListChecks,
  Lock,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import "./styles.css";

const DEFAULT_REGISTRY_URL = "https://stremio-addons.net/api/manifest.json";
const STREAMING_CATALOG_PROVIDERS = [
  ["nfx", "Netflix"],
  ["hbm", "HBO Max"],
  ["dnp", "Disney+"],
  ["amp", "Prime Video"],
  ["atp", "Apple TV+"],
  ["pmp", "Paramount+"],
  ["pcp", "Peacock"],
  ["hlu", "Hulu"],
  ["nfk", "Netflix Kids"],
  ["cru", "Crunchyroll"],
  ["jhs", "JioHotstar"],
  ["zee", "Zee5"],
  ["mgl", "MagellanTV"],
  ["cts", "Curiosity Stream"],
  ["mbi", "Mubi"],
  ["shd", "Shudder"],
  ["bbo", "BritBox"],
  ["act", "Acorn TV"],
  ["itv", "ITVX"],
  ["bbc", "BBC iPlayer"],
  ["al4", "Channel 4"],
];
const STREAMING_CATALOG_TYPES = [
  ["movie", "Movies"],
  ["series", "Shows"],
];
const STREAMING_CATALOG_SORTS = [
  ["TRENDING", "Trending"],
  ["POPULAR", "Popular"],
  ["NEW", "New"],
];

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "discover", label: "Discover", icon: Search },
  { id: "addons", label: "Add-ons", icon: Sparkles },
  { id: "catalogs", label: "Catalogs", icon: Library },
  { id: "live", label: "Live TV", icon: Radio },
  { id: "setup", label: "Setup", icon: ListChecks },
  { id: "watch", label: "Watch Sync", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

const emptyDashboard = {
  manifests: [],
  catalogs: [],
  artwork: {},
  watch: {},
  server: {},
  registry_url: DEFAULT_REGISTRY_URL,
};

const emptyPlexPublicRows = {
  enabled: false,
  selectedRows: [],
  rowCount: 8,
  itemLimit: 24,
  section: "home",
  rows: [],
  hasPlexToken: false,
  error: "",
  maxRowCount: 40,
  maxItemLimit: 50,
  defaultRowCount: 8,
  defaultItemLimit: 24,
};

function App() {
  const [view, setView] = useState("overview");
  const [token, setToken] = useState(() => localStorage.getItem("vortexoToken") || "");
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [homeRows, setHomeRows] = useState([]);
  const [liveRows, setLiveRows] = useState([]);
  const [registryAddons, setRegistryAddons] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [watchStatus, setWatchStatus] = useState("");
  const [plexSettings, setPlexSettings] = useState({});
  const [plexAccessToken, setPlexAccessToken] = useState("");
  const [plexStatus, setPlexStatus] = useState("");
  const [plexPublicRows, setPlexPublicRows] = useState(emptyPlexPublicRows);
  const [plexPublicRowsStatus, setPlexPublicRowsStatus] = useState("");
  const [plexPin, setPlexPin] = useState(() => {
    const id = Number(localStorage.getItem("vortexoPlexPinID") || 0);
    return id > 0 ? { id } : null;
  });
  const [login, setLogin] = useState({ username: "vortexo", password: "vortexo" });
  const [manual, setManual] = useState({ name: "", url: "" });
  const [registry, setRegistry] = useState({
    url: DEFAULT_REGISTRY_URL,
    q: "",
    capability: "all",
    type: "all",
  });
  const [perfect, setPerfect] = useState({
    debridProvider: "none",
    debridKey: "",
    aiostreams: "https://aiostreams.fortheweak.cloud",
    aiometadata: "https://aiometadata.viren070.me",
    tmdbKey: "",
    tmdbToken: "",
    tvdbKey: "",
    geminiKey: "",
    rpdbKey: "",
    language: "English",
  });
  const [streamingCatalogs, setStreamingCatalogs] = useState({
    providers: ["nfx", "dnp", "amp", "atp", "hbm"],
    types: ["movie", "series"],
    mergeProviders: false,
    mergeAll: false,
    sortBy: "TRENDING",
    rpdbKey: "",
  });
  const [keywordRows, setKeywordRows] = useState({
    enabled: false,
    rowCount: 10,
    tmdbKey: "",
    tmdbToken: "",
    language: "en-US",
    region: "US",
    clearCredentials: false,
  });
  const [watchForm, setWatchForm] = useState({
    traktClientId: "",
    traktClientSecret: "",
    traktAccessToken: "",
    traktRefreshToken: "",
  });

  const signedIn = Boolean(token);
  const serverUrl = typeof window === "undefined" ? "" : window.location.origin;

  const summary = useMemo(() => {
    const manifests = dashboard.manifests || [];
    const catalogs = dashboard.catalogs || manifests.flatMap((item) => item.catalogs || []);
    const streamProviders = manifests.filter((item) => item.capabilities?.includes("stream")).length;
    const subtitleProviders = manifests.filter((item) => item.capabilities?.includes("subtitles")).length;
    const liveProviders = manifests.filter((item) => item.capabilities?.includes("live_tv")).length;
    const broken = manifests.filter((item) => item.status === "error").length;
    return {
      manifests: manifests.length,
      enabled: manifests.filter((item) => item.enabled).length,
      catalogs: catalogs.length,
      activeCatalogs: catalogs.filter((item) => item.enabled !== false).length,
      streamProviders,
      subtitleProviders,
      liveProviders,
      broken,
      watchItems: dashboard.watch?.count || 0,
      artworkClean: dashboard.artwork?.clean_landscape || 0,
    };
  }, [dashboard]);

  useEffect(() => {
    loadPublicHome();
    loadLiveRows();
    if (token) {
      loadDashboard(token);
      loadWatchSettings(token);
      loadPlexSettings(token);
    }
  }, [token]);

  useEffect(() => {
    setRegistry((current) => ({
      ...current,
      url: dashboard.registry_url || current.url || DEFAULT_REGISTRY_URL,
    }));
  }, [dashboard.registry_url]);

  useEffect(() => {
    const config = dashboard.tmdb_keyword_rows;
    if (!config) return;
    setKeywordRows((current) => ({
      ...current,
      enabled: Boolean(config.enabled),
      rowCount: config.row_count || current.rowCount || 10,
      language: config.language || current.language || "en-US",
      region: config.region || current.region || "US",
    }));
  }, [dashboard.tmdb_keyword_rows]);

  useEffect(() => {
    const config = dashboard.plex_public_rows;
    if (!config) return;
    setPlexPublicRows((current) => mergePlexPublicRowsState(current, config));
  }, [dashboard.plex_public_rows]);

  useEffect(() => {
    if (signedIn && view === "discover" && registryAddons.length === 0 && !registryLoading) {
      loadRegistry();
    }
    if (view === "live") {
      loadLiveRows();
    }
  }, [signedIn, view]);

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function loadDashboard(activeToken = token) {
    if (!activeToken) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/bridge/dashboard", {
        headers: { authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Dashboard failed");
      setDashboard({ ...emptyDashboard, ...data });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadPublicHome() {
    try {
      const data = await fetch("/api/v1/vortexo/home?row_limit=8&item_limit=12").then((res) => res.json());
      setHomeRows(data.rows || []);
    } catch {
      setHomeRows([]);
    }
  }

  async function loadLiveRows() {
    try {
      const data = await fetch("/api/v1/vortexo/live-tv/rows?limit=80").then((res) => res.json());
      setLiveRows(data.rows || []);
    } catch {
      setLiveRows([]);
    }
  }

  async function loadWatchSettings(activeToken = token) {
    if (!activeToken) return;
    try {
      const res = await fetch("/api/v1/bridge/watch/settings", {
        headers: { authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok) return;
      setWatchForm((current) => ({
        ...current,
        traktClientId: data.trakt?.client_id || "",
      }));
    } catch {
      // Optional panel; keep the dashboard usable.
    }
  }

  async function loadPlexSettings(activeToken = token) {
    if (!activeToken) return;
    try {
      const res = await fetch("/api/v1/bridge/plex/settings", {
        headers: { authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok) return;
      setPlexSettings(data.plex || {});
    } catch {
      // Optional panel; keep the dashboard usable.
    }
  }

  async function loadRegistry() {
    if (!token) return;
    setRegistryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "120");
      if (registry.url) params.set("registry_url", registry.url);
      if (registry.q.trim()) params.set("q", registry.q.trim());
      if (registry.capability !== "all") params.set("capability", registry.capability);
      if (registry.type !== "all") params.set("type", registry.type);
      const data = await request(`/api/v1/bridge/addon-registry?${params.toString()}`);
      setRegistryAddons(data.addons || []);
      setRegistry((current) => ({ ...current, url: data.registry_url || current.url }));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
      setRegistryAddons([]);
    } finally {
      setRegistryLoading(false);
    }
  }

  async function saveRegistryURL(event) {
    event?.preventDefault();
    setBusy(true);
    try {
      const data = await request("/api/v1/bridge/addon-registry", {
        method: "POST",
        body: JSON.stringify({ registry_url: registry.url.trim() || DEFAULT_REGISTRY_URL }),
      });
      setRegistry((current) => ({ ...current, url: data.registry_url || current.url }));
      setMessage("Add-on registry saved");
      await loadDashboard();
      await loadRegistry();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: login.username, password: login.password }),
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "Sign in failed");
        return body;
      });
      const nextToken = data.token || data.access_token;
      localStorage.setItem("vortexoToken", nextToken);
      setToken(nextToken);
      setMessage("Signed in");
      setView("overview");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem("vortexoToken");
    setToken("");
    setDashboard(emptyDashboard);
    setRegistryAddons([]);
    setMessage("Signed out");
  }

  async function installManifest(event) {
    event.preventDefault();
    if (!manual.url.trim()) {
      setMessage("Paste a manifest URL first.");
      return;
    }
    await installManifestURL(manual.url.trim(), manual.name.trim(), "Manifest installed");
    setManual({ name: "", url: "" });
    setView("addons");
  }

  async function installManifestURL(url, name, successMessage = "Add-on installed") {
    setBusy(true);
    try {
      await request("/api/v1/bridge/manifests", {
        method: "POST",
        body: JSON.stringify({ name, url, enabled: true }),
      });
      setMessage(successMessage);
      await loadDashboard();
      await loadPublicHome();
      await loadLiveRows();
      if (view === "discover") await loadRegistry();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateManifest(id, patch) {
    setBusy(true);
    try {
      await request(`/api/v1/bridge/manifests/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      setMessage("Add-on updated");
      await loadDashboard();
      await loadPublicHome();
      await loadLiveRows();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeManifest(id) {
    setBusy(true);
    try {
      await request(`/api/v1/bridge/manifests/${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("Add-on removed");
      await loadDashboard();
      await loadPublicHome();
      await loadLiveRows();
      if (view === "discover") await loadRegistry();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCatalogList(nextCatalogs, successMessage = "Catalogs saved") {
    setBusy(true);
    try {
      const normalized = nextCatalogs.map((catalog, index) => ({
        key: catalog.key,
        manifest_id: catalog.manifest_id,
        catalog_type: catalog.type,
        catalog_id: catalog.id,
        name: (catalog.name || "").trim(),
        enabled: catalog.enabled !== false,
        sort_order: index,
      }));
      await request("/api/v1/bridge/catalogs", {
        method: "POST",
        body: JSON.stringify({ catalogs: normalized }),
      });
      setMessage(successMessage);
      await loadDashboard();
      await loadPublicHome();
      await loadLiveRows();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateCatalog(key, patch) {
    const catalogs = sortedCatalogs(dashboard.catalogs || []).map((catalog) =>
      catalog.key === key ? { ...catalog, ...patch } : catalog
    );
    await saveCatalogList(catalogs, "Catalog updated");
  }

  async function moveCatalog(key, direction) {
    const catalogs = sortedCatalogs(dashboard.catalogs || []);
    const index = catalogs.findIndex((catalog) => catalog.key === key);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= catalogs.length) return;
    const next = [...catalogs];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await saveCatalogList(next, "Catalog order saved");
  }

  async function generatePerfectSetup(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const provider = perfect.debridProvider;
      await request("/api/v1/bridge/perfect-setup", {
        method: "POST",
        body: JSON.stringify({
          install: true,
          replace_existing: true,
          aiometadata: {
            enabled: true,
            instance: perfect.aiometadata,
            language: "en-US",
            tmdb_api_key: perfect.tmdbKey.trim(),
            tmdb_access_token: perfect.tmdbToken.trim(),
            tvdb_api_key: perfect.tvdbKey.trim(),
            gemini_api_key: perfect.geminiKey.trim(),
            rpdb_api_key: perfect.rpdbKey.trim(),
          },
          aiostreams: {
            enabled: true,
            instance: perfect.aiostreams,
            debrid_provider: provider === "none" ? "" : provider,
            debrid_api_key: perfect.debridKey.trim(),
            tmdb_api_key: perfect.tmdbKey.trim(),
            tmdb_access_token: perfect.tmdbToken.trim(),
            tvdb_api_key: perfect.tvdbKey.trim(),
            rpdb_api_key: perfect.rpdbKey.trim(),
            languages: [perfect.language],
            timeout_ms: 5000,
            include_p2p: provider === "none",
          },
        }),
      });
      setMessage("Setup generated and installed");
      await loadDashboard();
      await loadPublicHome();
      await loadLiveRows();
      setView("overview");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function installStreamingCatalogs(event) {
    event.preventDefault();
    if (streamingCatalogs.providers.length === 0) {
      setMessage("Choose at least one streaming provider.");
      return;
    }
    if (streamingCatalogs.types.length === 0) {
      setMessage("Choose at least one catalog row type.");
      return;
    }
    setBusy(true);
    try {
      await request("/api/v1/bridge/streaming-catalogs", {
        method: "POST",
        body: JSON.stringify({
          install: true,
          providers: streamingCatalogs.providers,
          types: streamingCatalogs.types,
          merge_providers: streamingCatalogs.mergeProviders,
          merge_all: streamingCatalogs.mergeAll,
          sort_by: streamingCatalogs.sortBy,
          rpdb_key: streamingCatalogs.rpdbKey.trim(),
        }),
      });
      setMessage("Streaming Catalogs installed");
      await loadDashboard();
      await loadPublicHome();
      await loadLiveRows();
      setView("catalogs");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveKeywordRows(event) {
    event.preventDefault();
    const hasSavedCredential = Boolean(dashboard.tmdb_keyword_rows?.has_api_key || dashboard.tmdb_keyword_rows?.has_access_token);
    if (keywordRows.enabled && !keywordRows.tmdbKey.trim() && !keywordRows.tmdbToken.trim() && !hasSavedCredential) {
      setMessage("Add a TMDB key or read access token first.");
      return;
    }
    setBusy(true);
    try {
      await request("/api/v1/bridge/tmdb-keyword-rows", {
        method: "POST",
        body: JSON.stringify({
          enabled: keywordRows.enabled,
          row_count: Number(keywordRows.rowCount) || 10,
          tmdb_api_key: keywordRows.tmdbKey.trim(),
          tmdb_access_token: keywordRows.tmdbToken.trim(),
          language: keywordRows.language.trim(),
          region: keywordRows.region.trim(),
          clear_credentials: keywordRows.clearCredentials,
        }),
      });
      setKeywordRows((current) => ({ ...current, tmdbKey: "", tmdbToken: "", clearCredentials: false }));
      setMessage(keywordRows.enabled ? "Random keyword rows saved" : "Random keyword rows disabled");
      await loadDashboard();
      await loadPublicHome();
      setView("overview");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadPlexPublicRows(overrides = {}) {
    if (!token) return;
    const section = overrides.section || plexPublicRows.section || "home";
    const itemLimit = overrides.itemLimit || plexPublicRows.itemLimit || emptyPlexPublicRows.itemLimit;
    const params = new URLSearchParams();
    params.set("section", section);
    params.set("item_limit", String(itemLimit));
    setBusy(true);
    setPlexPublicRowsStatus("Loading Plex row choices...");
    try {
      const data = await request(`/api/v1/bridge/plex-public-rows?${params.toString()}`);
      setPlexPublicRows((current) => mergePlexPublicRowsState(current, data));
      setPlexPublicRowsStatus(data.error || `Loaded ${(data.rows || []).length} Plex row choices.`);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
      setPlexPublicRowsStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePlexPublicRows(event) {
    event.preventDefault();
    if (plexPublicRows.enabled && !plexPublicRows.hasPlexToken && !plexSettings?.has_access_token) {
      setPlexPublicRowsStatus("Plex account token is required.");
      return;
    }
    if (plexPublicRows.enabled && (plexPublicRows.selectedRows || []).length === 0) {
      setPlexPublicRowsStatus("Select at least one Plex row to publish.");
      return;
    }
    setBusy(true);
    setPlexPublicRowsStatus("Saving Plex public rows...");
    try {
      const data = await request("/api/v1/bridge/plex-public-rows", {
        method: "POST",
        body: JSON.stringify({
          enabled: plexPublicRows.enabled,
          selected_rows: plexPublicRows.selectedRows || [],
          row_count: Number(plexPublicRows.rowCount) || emptyPlexPublicRows.rowCount,
          item_limit: Number(plexPublicRows.itemLimit) || emptyPlexPublicRows.itemLimit,
          section: plexPublicRows.section || "home",
        }),
      });
      setPlexPublicRows((current) => mergePlexPublicRowsState(current, data));
      setMessage(plexPublicRows.enabled ? "Plex public rows saved" : "Plex public rows disabled");
      setPlexPublicRowsStatus(data.error || "Plex public rows saved.");
      await loadDashboard();
      await loadPublicHome();
    } catch (error) {
      setMessage(error.message);
      setPlexPublicRowsStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveWatch(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await request("/api/v1/bridge/watch/settings", {
        method: "POST",
        body: JSON.stringify({
          trakt_client_id: watchForm.traktClientId.trim(),
          trakt_client_secret: watchForm.traktClientSecret.trim(),
          trakt_access_token: watchForm.traktAccessToken.trim(),
          trakt_refresh_token: watchForm.traktRefreshToken.trim(),
        }),
      });
      setWatchForm((current) => ({
        ...current,
        traktClientSecret: "",
        traktAccessToken: "",
        traktRefreshToken: "",
      }));
      await loadDashboard();
      await loadWatchSettings();
      setMessage("Watch sync settings saved");
      setWatchStatus("Watch sync settings saved");
    } catch (error) {
      setMessage(error.message);
      setWatchStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function syncWatch() {
    setBusy(true);
    setWatchStatus("Syncing Trakt watch history...");
    try {
      const data = await request("/api/v1/bridge/watch/trakt/sync", { method: "POST" });
      await loadDashboard();
      await loadWatchSettings();
      await loadPublicHome();
      const imported = data.imported || 0;
      const total = data.total || 0;
      const nextMessage = imported > 0
        ? `Trakt imported ${imported} items. Total watch items: ${total}.`
        : `Trakt sync completed but imported 0 new items. Total watch items: ${total}.`;
      setMessage(nextMessage);
      setWatchStatus(nextMessage);
    } catch (error) {
      setMessage(error.message);
      setWatchStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearWatchHistory() {
    const count = dashboard.watch?.count || 0;
    const warning = count > 0
      ? `Delete ${count} watch history item${count === 1 ? "" : "s"} from Vortexo Server?`
      : "Delete watch history from Vortexo Server?";
    if (!window.confirm(`${warning}\n\nThis clears local Continue Watching/recommendation state but keeps your Trakt and Plex connections.`)) {
      return;
    }

    setBusy(true);
    setWatchStatus("Clearing watch history...");
    try {
      const data = await request("/api/v1/bridge/watch/history", { method: "DELETE" });
      await loadDashboard();
      await loadWatchSettings();
      await loadPublicHome();
      const removed = data.removed || 0;
      const nextMessage = `Deleted ${removed} watch history item${removed === 1 ? "" : "s"}.`;
      setMessage(nextMessage);
      setWatchStatus(nextMessage);
    } catch (error) {
      setMessage(error.message);
      setWatchStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePlexToken(event) {
    event.preventDefault();
    const accessToken = plexAccessToken.trim();
    if (!accessToken) {
      setPlexStatus("Paste a Plex token or use PIN login.");
      return;
    }
    setBusy(true);
    setPlexStatus("Saving Plex token...");
    try {
      const data = await request("/api/v1/bridge/plex/settings", {
        method: "POST",
        body: JSON.stringify({ access_token: accessToken }),
      });
      setPlexSettings(data.plex || {});
      setPlexAccessToken("");
      await loadDashboard();
      setMessage("Plex connected");
      setPlexStatus("Plex connected. Discover landscapes and public rows can now use this account.");
    } catch (error) {
      setMessage(error.message);
      setPlexStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearPlexToken() {
    setBusy(true);
    setPlexStatus("Clearing Plex token...");
    try {
      const data = await request("/api/v1/bridge/plex/settings", {
        method: "POST",
        body: JSON.stringify({ clear_token: true }),
      });
      setPlexSettings(data.plex || {});
      setPlexAccessToken("");
      setPlexPin(null);
      localStorage.removeItem("vortexoPlexPinID");
      setPlexPublicRows(emptyPlexPublicRows);
      await loadDashboard();
      await loadPublicHome();
      setMessage("Plex disconnected");
      setPlexStatus("Plex token cleared. Cards will fall back to public artwork and background-plus-logo layouts.");
    } catch (error) {
      setMessage(error.message);
      setPlexStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function startPlexLogin() {
    setBusy(true);
    setPlexStatus("Requesting Plex PIN...");
    try {
      const data = await request("/api/v1/bridge/plex/pin", { method: "POST" });
      setPlexPin(data);
      localStorage.setItem("vortexoPlexPinID", String(data.id || ""));
      setPlexStatus(`Open Plex login and enter code ${data.code || ""}. Then click Check Login.`);
    } catch (error) {
      setMessage(error.message);
      setPlexStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkPlexLogin() {
    const pinID = Number(plexPin?.id || localStorage.getItem("vortexoPlexPinID") || 0);
    if (!pinID) {
      setPlexStatus("Start Plex PIN login first.");
      return;
    }
    setBusy(true);
    setPlexStatus("Checking Plex login...");
    try {
      const data = await request("/api/v1/bridge/plex/pin/token", {
        method: "POST",
        body: JSON.stringify({ pin_id: pinID }),
      });
      if (!data.authenticated) {
        setPlexStatus("Still waiting for Plex approval.");
        return;
      }
      setPlexSettings(data.plex || {});
      setPlexPin(null);
      localStorage.removeItem("vortexoPlexPinID");
      await loadDashboard();
      setMessage("Plex connected");
      setPlexStatus("Plex connected. Discover landscapes and public rows can now use this account.");
    } catch (error) {
      setMessage(error.message);
      setPlexStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshArtwork() {
    setBusy(true);
    setPlexStatus("Starting forced artwork repair...");
    try {
      const data = await request("/api/v1/artwork/refresh", {
        method: "POST",
        body: JSON.stringify({ limit: 2000, force: true }),
      });
      setMessage(data.message || "Artwork refresh started");
      setPlexStatus(`${data.message || "Artwork refresh started"}. Rechecking missing and backdrop-only Plex art.`);
    } catch (error) {
      setMessage(error.message);
      setPlexStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyServerURL() {
    await navigator.clipboard?.writeText(serverUrl);
    setMessage("Server URL copied");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>Vortexo</strong>
            <span>Add-on Server</span>
          </div>
        </div>
        <nav className="nav-list">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "nav-item active" : "nav-item"}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <span className={signedIn ? "status-dot ok" : "status-dot"} />
          <div>
            <strong>{signedIn ? "Signed in" : "Signed out"}</strong>
            <span>{signedIn ? "Dashboard controls enabled" : "Sign in to manage add-ons"}</span>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Self-hosted control room</p>
            <h1>{pageTitle(view)}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" title="Refresh" onClick={() => { loadDashboard(); loadPublicHome(); loadLiveRows(); }} disabled={!signedIn || busy}>
              <RefreshCw size={18} />
            </button>
            <button className="server-pill" onClick={copyServerURL} title="Copy server URL">
              <Server size={17} />
              <span>{serverUrl.replace(/^https?:\/\//, "")}</span>
            </button>
          </div>
        </header>

        {message && (
          <div className={isErrorMessage(message) ? "notice error" : "notice"}>
            {message}
          </div>
        )}

        {!signedIn && view !== "settings" ? (
          <SignInCard login={login} setLogin={setLogin} onSubmit={signIn} busy={busy} />
        ) : (
          <>
            {view === "overview" && <Overview summary={summary} dashboard={dashboard} homeRows={homeRows} />}
            {view === "discover" && (
              <Discover
                registry={registry}
                setRegistry={setRegistry}
                addons={registryAddons}
                loading={registryLoading}
                busy={busy}
                onSearch={loadRegistry}
                onSaveRegistry={saveRegistryURL}
                onInstall={(addon) => installManifestURL(addon.url, addon.name, `${addon.name} installed`)}
              />
            )}
            {view === "addons" && (
              <Addons
                manifests={dashboard.manifests || []}
                manual={manual}
                setManual={setManual}
                onInstall={installManifest}
                onUpdate={updateManifest}
                onRemove={removeManifest}
                busy={busy}
              />
            )}
            {view === "catalogs" && (
              <Catalogs
                catalogs={dashboard.catalogs || []}
                onUpdate={updateCatalog}
                onMove={moveCatalog}
                busy={busy}
              />
            )}
            {view === "live" && <LiveTV rows={liveRows} summary={summary} />}
            {view === "setup" && (
              <Setup
                perfect={perfect}
                setPerfect={setPerfect}
                streamingCatalogs={streamingCatalogs}
                setStreamingCatalogs={setStreamingCatalogs}
                keywordRows={keywordRows}
                setKeywordRows={setKeywordRows}
                keywordRowsStatus={dashboard.tmdb_keyword_rows || {}}
                onSubmit={generatePerfectSetup}
                onStreamingSubmit={installStreamingCatalogs}
                onKeywordRowsSubmit={saveKeywordRows}
                busy={busy}
              />
            )}
            {view === "watch" && (
              <WatchSync
                watch={dashboard.watch || {}}
                form={watchForm}
                setForm={setWatchForm}
                status={watchStatus}
                onSave={saveWatch}
                onSync={syncWatch}
                onClearHistory={clearWatchHistory}
                plex={plexSettings}
                artwork={dashboard.artwork || {}}
                plexAccessToken={plexAccessToken}
                setPlexAccessToken={setPlexAccessToken}
                plexPin={plexPin}
                plexStatus={plexStatus}
                plexPublicRows={plexPublicRows}
                setPlexPublicRows={setPlexPublicRows}
                plexPublicRowsStatus={plexPublicRowsStatus}
                onSavePlex={savePlexToken}
                onClearPlex={clearPlexToken}
                onStartPlex={startPlexLogin}
                onCheckPlex={checkPlexLogin}
                onRefreshArtwork={refreshArtwork}
                onLoadPlexPublicRows={loadPlexPublicRows}
                onSavePlexPublicRows={savePlexPublicRows}
                busy={busy}
              />
            )}
            {view === "settings" && (
              <SettingsView
                signedIn={signedIn}
                login={login}
                setLogin={setLogin}
                onSignIn={signIn}
                onSignOut={signOut}
                serverUrl={serverUrl}
                registry={registry}
                setRegistry={setRegistry}
                onSaveRegistry={saveRegistryURL}
                onCopy={copyServerURL}
                busy={busy}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Overview({ summary, dashboard, homeRows }) {
  const previewRows = (homeRows || []).slice(0, 5);
  const artwork = dashboard.artwork || {};
  const artworkGaps = (artwork.miss || 0) + (artwork.error || 0);
  const artworkStatus = artwork.running ? "sync running" : artwork.has_plex_token ? "Plex connected" : "Plex missing";
  return (
    <section className="stack">
      <div className="metric-grid overview-grid">
        <Metric icon={Database} label="Installed add-ons" value={summary.manifests} detail={`${summary.enabled} enabled`} />
        <Metric icon={Library} label="Catalog rows" value={summary.activeCatalogs} detail={`${summary.catalogs} managed`} />
        <Metric icon={Play} label="Stream providers" value={summary.streamProviders} detail={`${summary.subtitleProviders} subtitle providers`} />
        <Metric icon={Eye} label="Watch items" value={summary.watchItems} detail={dashboard.watch?.trakt_connected ? "Trakt connected" : "Local state"} />
        <Metric icon={Clapperboard} label="Plex artwork" value={summary.artworkClean} detail={`${artwork.total || 0} cached · ${artworkStatus}`} />
      </div>

      <div className="panel split-panel">
        <div>
          <p className="eyebrow">Health</p>
          <h2>Server output</h2>
          <p className="muted">
            {summary.broken === 0
              ? "Installed add-ons are responding cleanly."
              : `${summary.broken} add-on needs attention.`}
          </p>
        </div>
        <div className="health-list">
          <HealthRow ok={summary.manifests > 0} label="Add-ons" value={`${summary.manifests} installed`} />
          <HealthRow ok={summary.activeCatalogs > 0} label="Catalogs" value={`${summary.activeCatalogs} active`} />
          <HealthRow ok={summary.streamProviders > 0} label="Streams" value={`${summary.streamProviders} providers`} />
          <HealthRow ok={summary.broken === 0} label="Errors" value={summary.broken === 0 ? "None" : `${summary.broken} found`} />
          <HealthRow ok={(artwork.clean_landscape || 0) > 0} label="Clean landscapes" value={`${artwork.clean_landscape || 0} items`} />
          <HealthRow ok={(artwork.backdrop_only || 0) === 0} label="Backdrop-only" value={`${artwork.backdrop_only || 0} items`} />
          <HealthRow ok={artworkGaps === 0} label="Artwork gaps" value={artworkGaps === 0 ? "None" : `${artworkGaps} items`} />
          <HealthRow ok={(artwork.signed_discover || 0) > 0} label="Signed Discover" value={`${artwork.signed_discover || 0} hits`} />
        </div>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Home</p>
            <h2>Rows Vortexo can read</h2>
          </div>
        </div>
        {previewRows.length === 0 ? (
          <EmptyState icon={Library} title="No rows yet" text="Install a catalog add-on or run the guided setup to populate the Vortexo home feed." />
        ) : (
          <div className="preview-rows">
            {previewRows.map((row) => (
              <div className="preview-row" key={row.id}>
                <div className="row-title">
                  <strong>{row.title}</strong>
                  <span>{row.reason || "Catalog row"}</span>
                </div>
                <div className="poster-strip">
                  {(row.items || []).slice(0, 7).map((item) => (
                    <div className="poster" key={item.id || item.ratingKey || item.title}>
                      {imageForItem(item) ? <img src={imageForItem(item)} alt="" /> : <Clapperboard size={20} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Discover({ registry, setRegistry, addons, loading, busy, onSearch, onSaveRegistry, onInstall }) {
  return (
    <section className="stack">
      <form className="panel compact-form" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Registry</p>
            <h2>Browse add-ons</h2>
          </div>
          <Globe2 size={22} />
        </div>
        <div className="form-grid registry-form">
          <label className="wide-field">
            <span>Registry manifest URL</span>
            <input value={registry.url} onChange={(event) => setRegistry({ ...registry, url: event.target.value })} />
          </label>
          <TextField label="Search" value={registry.q} onChange={(value) => setRegistry({ ...registry, q: value })} />
          <SelectField label="Capability" value={registry.capability} onChange={(value) => setRegistry({ ...registry, capability: value })} options={[
            ["all", "All"],
            ["catalog", "Catalogs"],
            ["meta", "Metadata"],
            ["stream", "Streams"],
            ["subtitles", "Subtitles"],
            ["live_tv", "Live TV"],
          ]} />
          <SelectField label="Type" value={registry.type} onChange={(value) => setRegistry({ ...registry, type: value })} options={[
            ["all", "All"],
            ["movie", "Movies"],
            ["series", "Series"],
            ["tv", "TV"],
            ["channel", "Live channels"],
          ]} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading || busy}>{loading ? "Loading" : "Search"}</button>
          <button type="button" className="secondary" onClick={onSaveRegistry} disabled={busy}>Save registry</button>
        </div>
      </form>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Available</p>
            <h2>Add-ons from registry</h2>
          </div>
          <span className="count-pill">{addons.length}</span>
        </div>
        {loading ? (
          <EmptyState icon={RefreshCw} title="Loading registry" text="Fetching available add-ons from the configured registry." />
        ) : addons.length === 0 ? (
          <EmptyState icon={Search} title="No add-ons found" text="Try clearing the filters or checking the registry URL." />
        ) : (
          <div className="addon-grid">
            {addons.map((addon) => (
              <article className="addon-card" key={addon.url || addon.id}>
                <div className="addon-top">
                  <div className="addon-icon">{initials(addon.name || addon.id)}</div>
                  <div>
                    <h3>{addon.name || addon.id}</h3>
                    <span className={addon.installed ? "small-status ok" : addon.configuration_required ? "small-status warn" : "small-status"}>
                      {addon.installed ? "installed" : addon.configuration_required ? "configure first" : "available"}
                    </span>
                  </div>
                  {addon.config_url ? (
                    <a className="icon-link" href={addon.config_url} target="_blank" rel="noreferrer" title="Configure">
                      <ExternalLink size={17} />
                    </a>
                  ) : (
                    <span />
                  )}
                </div>
                {addon.description && <p className="muted clamp">{addon.description}</p>}
                <div className="chip-row">
                  {(addon.capabilities || []).slice(0, 5).map((capability) => <span className="chip" key={capability}>{labelCapability(capability)}</span>)}
                  {addon.configurable && <span className="chip amber">Configurable</span>}
                </div>
                <div className="addon-meta">
                  <span>{addon.catalogs?.length || 0} catalogs</span>
                  <span>{(addon.types || []).join(", ") || "Any type"}</span>
                </div>
                <div className="form-actions compact-actions">
                  <button type="button" disabled={busy || addon.installed || !addon.url} onClick={() => onInstall(addon)}>
                    {addon.installed ? "Installed" : "Install"}
                  </button>
                  {addon.url && (
                    <a className="text-link" href={addon.url} target="_blank" rel="noreferrer">Manifest</a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Addons({ manifests, manual, setManual, onInstall, onUpdate, onRemove, busy }) {
  const [draftNames, setDraftNames] = useState({});

  useEffect(() => {
    const next = {};
    for (const item of manifests) next[item.id] = item.name || "";
    setDraftNames(next);
  }, [manifests]);

  return (
    <section className="stack">
      <form className="panel compact-form" onSubmit={onInstall}>
        <div>
          <p className="eyebrow">Install</p>
          <h2>Add manifest URL</h2>
        </div>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} placeholder="Optional display name" />
          </label>
          <label>
            <span>Manifest URL</span>
            <input value={manual.url} onChange={(event) => setManual({ ...manual, url: event.target.value })} placeholder="https://example.com/.../manifest.json" />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>Install</button>
        </div>
      </form>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Installed</p>
            <h2>Add-ons</h2>
          </div>
          <span className="count-pill">{manifests.length}</span>
        </div>
        {manifests.length === 0 ? (
          <EmptyState icon={Sparkles} title="No add-ons installed" text="Install a catalog, stream, subtitle, or Live TV manifest to start feeding Vortexo." />
        ) : (
          <div className="addon-grid">
            {manifests.map((item) => (
              <article className="addon-card" key={item.id}>
                <div className="addon-top">
                  <div className="addon-icon">{initials(item.name || item.id)}</div>
                  <div>
                    <h3>{item.name || item.id}</h3>
                    <span className={item.status === "ok" ? "small-status ok" : item.status === "error" ? "small-status error" : "small-status"}>
                      {item.status || (item.enabled ? "enabled" : "disabled")}
                    </span>
                  </div>
                  <button className="icon-button danger" title="Remove" onClick={() => onRemove(item.id)} disabled={busy}>
                    <Trash2 size={17} />
                  </button>
                </div>
                {item.description && <p className="muted clamp">{item.description}</p>}
                <div className="chip-row">
                  {(item.capabilities || []).map((capability) => <span className="chip" key={capability}>{labelCapability(capability)}</span>)}
                  {item.capabilities?.length === 0 && <span className="chip muted-chip">No capabilities</span>}
                </div>
                <div className="addon-meta">
                  <span>{item.catalogs?.length || 0} catalogs</span>
                  <span>{(item.types || []).join(", ") || "Any type"}</span>
                </div>
                <div className="field-actions">
                  <input
                    value={draftNames[item.id] || ""}
                    onChange={(event) => setDraftNames({ ...draftNames, [item.id]: event.target.value })}
                    aria-label={`${item.name} display name`}
                  />
                  <button type="button" className="secondary" disabled={busy} onClick={() => onUpdate(item.id, { name: draftNames[item.id] || item.name })}>Rename</button>
                  <button type="button" className="secondary" disabled={busy} onClick={() => onUpdate(item.id, { enabled: !item.enabled })}>
                    {item.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
                {item.message && <div className="inline-error">{item.message}</div>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Catalogs({ catalogs, onUpdate, onMove, busy }) {
  const sorted = sortedCatalogs(catalogs || []);
  const [names, setNames] = useState({});

  useEffect(() => {
    const next = {};
    for (const catalog of sorted) next[catalog.key] = catalog.name || "";
    setNames(next);
  }, [catalogs]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Catalog manager</p>
          <h2>Rows coming from add-ons</h2>
        </div>
        <span className="count-pill">{sorted.length}</span>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={Library} title="No catalogs" text="Install a catalog-capable add-on to see rows here." />
      ) : (
        <div className="catalog-list managed">
          {sorted.map((catalog, index) => (
            <div className={catalog.enabled === false ? "catalog-row disabled" : "catalog-row"} key={catalog.key}>
              <div>
                <strong>{catalog.original_name || catalog.id}</strong>
                <span>{catalog.manifest_name}</span>
              </div>
              <div className="catalog-controls">
                <input
                  value={names[catalog.key] || ""}
                  onChange={(event) => setNames({ ...names, [catalog.key]: event.target.value })}
                  aria-label={`${catalog.original_name || catalog.id} display name`}
                />
                <button type="button" className="secondary" disabled={busy} onClick={() => onUpdate(catalog.key, { name: names[catalog.key] || catalog.original_name || catalog.name })}>Save</button>
                <button type="button" className="secondary compact-icon" disabled={busy || index === 0} onClick={() => onMove(catalog.key, -1)} title="Move up">
                  <ChevronUp size={17} />
                </button>
                <button type="button" className="secondary compact-icon" disabled={busy || index === sorted.length - 1} onClick={() => onMove(catalog.key, 1)} title="Move down">
                  <ChevronDown size={17} />
                </button>
                <button type="button" className="secondary" disabled={busy} onClick={() => onUpdate(catalog.key, { enabled: catalog.enabled === false })}>
                  {catalog.enabled === false ? "Enable" : "Disable"}
                </button>
              </div>
              <div className="chip-row tight">
                <span className="chip">{catalog.type}</span>
                {catalog.search && <span className="chip">Search</span>}
                {catalog.required_extras?.map((extra) => <span className="chip amber" key={extra}>{extra}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LiveTV({ rows, summary }) {
  const channels = rows.flatMap((row) => row.items || []);
  return (
    <section className="stack">
      <div className="metric-grid two-cols">
        <Metric icon={Radio} label="Live providers" value={summary.liveProviders} detail="Add-ons with live catalogs" />
        <Metric icon={Eye} label="Channels" value={channels.length} detail={`${rows.length} rows available`} />
      </div>
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Live TV</p>
            <h2>Channels Vortexo can read</h2>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Radio} title="No live channels" text="Install a Live TV manifest add-on to populate the Live TV tab in Vortexo." />
        ) : (
          <div className="live-list">
            {rows.map((row) => (
              <div className="live-row" key={row.id}>
                <div className="row-title">
                  <strong>{row.title}</strong>
                  <span>{row.reason}</span>
                </div>
                <div className="channel-strip">
                  {(row.items || []).slice(0, 10).map((channel) => (
                    <div className="channel-card" key={channel.id}>
                      {channel.logo ? <img src={channel.logo} alt="" /> : <Radio size={18} />}
                      <span>{channel.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Setup({
  perfect,
  setPerfect,
  streamingCatalogs,
  setStreamingCatalogs,
  keywordRows,
  setKeywordRows,
  keywordRowsStatus,
  onSubmit,
  onStreamingSubmit,
  onKeywordRowsSubmit,
  busy,
}) {
  const streamingLayout = streamingCatalogs.mergeAll ? "all" : streamingCatalogs.mergeProviders ? "provider" : "separate";
  const setStreamingLayout = (layout) => setStreamingCatalogs({
    ...streamingCatalogs,
    mergeProviders: layout === "provider",
    mergeAll: layout === "all",
    sortBy: layout === "all" ? "NEW" : streamingCatalogs.sortBy,
  });

  return (
    <section className="stack">
      <form className="panel" onSubmit={onStreamingSubmit}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Built-in catalogs</p>
            <h2>Streaming Catalogs</h2>
          </div>
          <Clapperboard size={22} />
        </div>
        <div className="choice-block">
          <span>Providers</span>
          <div className="choice-grid">
            {STREAMING_CATALOG_PROVIDERS.map(([id, label]) => (
              <label className={streamingCatalogs.providers.includes(id) ? "choice-chip selected" : "choice-chip"} key={id}>
                <input
                  type="checkbox"
                  checked={streamingCatalogs.providers.includes(id)}
                  onChange={() => setStreamingCatalogs({
                    ...streamingCatalogs,
                    providers: toggleArrayValue(streamingCatalogs.providers, id),
                  })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-grid two">
          <div className="choice-block">
            <span>Rows</span>
            <div className="choice-grid compact-choice-grid">
              {STREAMING_CATALOG_TYPES.map(([id, label]) => (
                <label className={streamingCatalogs.types.includes(id) ? "choice-chip selected" : "choice-chip"} key={id}>
                  <input
                    type="checkbox"
                    checked={streamingCatalogs.types.includes(id)}
                    onChange={() => setStreamingCatalogs({
                      ...streamingCatalogs,
                      types: toggleArrayValue(streamingCatalogs.types, id),
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="choice-block">
            <span>Layout</span>
            <div className="choice-grid single-choice-grid">
              {[
                ["separate", "Separate rows"],
                ["provider", "Merge movies + shows"],
                ["all", "Latest Releases"],
              ].map(([id, label]) => (
                <label className={streamingLayout === id ? "choice-chip selected" : "choice-chip"} key={id}>
                  <input
                    type="radio"
                    name="streaming-layout"
                    checked={streamingLayout === id}
                    onChange={() => setStreamingLayout(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="form-grid two">
          <SelectField
            label="Sort by"
            value={streamingCatalogs.sortBy}
            onChange={(value) => setStreamingCatalogs({ ...streamingCatalogs, sortBy: value })}
            options={STREAMING_CATALOG_SORTS}
          />
          <TextField
            label="RPDB key"
            value={streamingCatalogs.rpdbKey}
            onChange={(value) => setStreamingCatalogs({ ...streamingCatalogs, rpdbKey: value })}
            placeholder="Optional"
          />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>Install Streaming Catalogs</button>
        </div>
      </form>

      <form className="panel" onSubmit={onKeywordRowsSubmit}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Native Home</p>
            <h2>Random Keyword Rows</h2>
          </div>
          <Sparkles size={22} />
        </div>
        <div className="form-grid two">
          <div className="choice-block">
            <span>Status</span>
            <div className="choice-grid single-choice-grid">
              <label className={keywordRows.enabled ? "choice-chip selected" : "choice-chip"}>
                <input
                  type="checkbox"
                  checked={keywordRows.enabled}
                  onChange={() => setKeywordRows({ ...keywordRows, enabled: !keywordRows.enabled })}
                />
                Enable hourly rows
              </label>
            </div>
          </div>
          <SelectField
            label="Row count"
            value={String(keywordRows.rowCount)}
            onChange={(value) => setKeywordRows({ ...keywordRows, rowCount: Number(value) })}
            options={[
              ["10", "10 Rows"],
              ["20", "20 Rows"],
              ["30", "30 Rows"],
              ["40", "40 Rows"],
              ["50", "50 Rows"],
            ]}
          />
        </div>
        <div className="form-grid two">
          <TextField
            label="TMDB key"
            type="password"
            value={keywordRows.tmdbKey}
            onChange={(value) => setKeywordRows({ ...keywordRows, tmdbKey: value })}
            placeholder={keywordRowsStatus.has_api_key ? "Saved" : "Required"}
          />
          <TextField
            label="TMDB token"
            type="password"
            value={keywordRows.tmdbToken}
            onChange={(value) => setKeywordRows({ ...keywordRows, tmdbToken: value })}
            placeholder={keywordRowsStatus.has_access_token ? "Saved" : "Optional"}
          />
        </div>
        <div className="form-grid three">
          <TextField
            label="Language"
            value={keywordRows.language}
            onChange={(value) => setKeywordRows({ ...keywordRows, language: value })}
          />
          <TextField
            label="Region"
            value={keywordRows.region}
            onChange={(value) => setKeywordRows({ ...keywordRows, region: value })}
          />
          <div className="choice-block">
            <span>Credentials</span>
            <div className="choice-grid single-choice-grid">
              <label className={keywordRows.clearCredentials ? "choice-chip selected" : "choice-chip"}>
                <input
                  type="checkbox"
                  checked={keywordRows.clearCredentials}
                  onChange={() => setKeywordRows({ ...keywordRows, clearCredentials: !keywordRows.clearCredentials })}
                />
                Clear saved keys
              </label>
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>Save Keyword Rows</button>
        </div>
      </form>

      <form className="panel" onSubmit={onSubmit}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Guided install</p>
            <h2>Generate a clean setup</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className="form-grid three">
          <SelectField label="Debrid provider" value={perfect.debridProvider} onChange={(value) => setPerfect({ ...perfect, debridProvider: value })} options={[
            ["none", "None / P2P only"],
            ["realdebrid", "Real-Debrid"],
            ["torbox", "TorBox"],
            ["premiumize", "Premiumize"],
            ["alldebrid", "AllDebrid"],
            ["debridlink", "Debrid-Link"],
            ["easydebrid", "EasyDebrid"],
          ]} />
          <TextField label="Debrid API key" type="password" value={perfect.debridKey} onChange={(value) => setPerfect({ ...perfect, debridKey: value })} />
          <SelectField label="Language" value={perfect.language} onChange={(value) => setPerfect({ ...perfect, language: value })} options={[
            ["English", "English"],
            ["Croatian", "Croatian"],
            ["Arabic", "Arabic"],
            ["French", "French"],
            ["German", "German"],
            ["Spanish", "Spanish"],
          ]} />
          <SelectField label="AIOStreams" value={perfect.aiostreams} onChange={(value) => setPerfect({ ...perfect, aiostreams: value })} options={[
            ["https://aiostreams.fortheweak.cloud", "Fortheweak"],
            ["https://aiostreamsfortheweebsstable.midnightignite.me", "Midnight"],
            ["https://aiostreams.viren070.me", "Viren"],
          ]} />
          <SelectField label="AIOMetadata" value={perfect.aiometadata} onChange={(value) => setPerfect({ ...perfect, aiometadata: value })} options={[
            ["https://aiometadata.viren070.me", "Viren"],
            ["https://aiometadatafortheweebs.midnightignite.me", "Midnight"],
          ]} />
          <TextField label="RPDB key" value={perfect.rpdbKey} onChange={(value) => setPerfect({ ...perfect, rpdbKey: value })} />
          <TextField label="TMDB key" type="password" value={perfect.tmdbKey} onChange={(value) => setPerfect({ ...perfect, tmdbKey: value })} />
          <TextField label="TMDB token" type="password" value={perfect.tmdbToken} onChange={(value) => setPerfect({ ...perfect, tmdbToken: value })} />
          <TextField label="TVDB key" type="password" value={perfect.tvdbKey} onChange={(value) => setPerfect({ ...perfect, tvdbKey: value })} />
          <TextField label="Gemini key" type="password" value={perfect.geminiKey} onChange={(value) => setPerfect({ ...perfect, geminiKey: value })} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>Generate and install</button>
        </div>
      </form>
    </section>
  );
}

function WatchSync({
  watch,
  form,
  setForm,
  status,
  onSave,
  onSync,
  onClearHistory,
  plex,
  artwork,
  plexAccessToken,
  setPlexAccessToken,
  plexPin,
  plexStatus,
  plexPublicRows,
  setPlexPublicRows,
  plexPublicRowsStatus,
  onSavePlex,
  onClearPlex,
  onStartPlex,
  onCheckPlex,
  onRefreshArtwork,
  onLoadPlexPublicRows,
  onSavePlexPublicRows,
  busy,
}) {
  const hasTraktConfig = Boolean(watch.trakt_client_config || form.traktClientId.trim());
  const connectedAccounts = [
    watch.trakt_connected ? "Trakt" : "",
    plex?.has_access_token ? "Plex" : "",
  ].filter(Boolean);
  const plexName = plex?.username || plex?.title || plex?.email || "";
  const plexLink = plexPin?.authorization_url || plexPin?.verification_url || "https://plex.tv/link";
  const artworkGaps = (artwork?.miss || 0) + (artwork?.error || 0);
  const hasPlexToken = Boolean(plexPublicRows?.hasPlexToken || plex?.has_access_token);
  const plexRows = plexPublicRows?.rows || [];
  const selectedPlexRows = plexPublicRows?.selectedRows || [];
  const plexRowCountOptions = uniqueOptions([plexPublicRows?.rowCount || 8, 4, 8, 12, 20, 30, 40].filter((count) => count <= (plexPublicRows?.maxRowCount || 40)));
  const plexItemLimitOptions = uniqueOptions([plexPublicRows?.itemLimit || 24, 12, 24, 36, 50].filter((count) => count <= (plexPublicRows?.maxItemLimit || 50)));
  return (
    <section className="stack">
      <div className="metric-grid two-cols">
        <Metric icon={Eye} label="Watch items" value={watch.count || 0} detail="Local normalized state" />
        <Metric icon={BadgeCheck} label="Connections" value={connectedAccounts.length} detail={connectedAccounts.join(", ") || "None"} />
      </div>
      <form className="panel" onSubmit={onSave}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Accounts</p>
            <h2>Watch history sync</h2>
          </div>
        </div>
        <div className="form-grid two">
          <TextField label="Trakt client ID" value={form.traktClientId} onChange={(value) => setForm({ ...form, traktClientId: value })} />
          <TextField label="Trakt client secret" type="password" value={form.traktClientSecret} onChange={(value) => setForm({ ...form, traktClientSecret: value })} />
          <TextField label="Trakt access token" type="password" value={form.traktAccessToken} onChange={(value) => setForm({ ...form, traktAccessToken: value })} />
          <TextField label="Trakt refresh token" type="password" value={form.traktRefreshToken} onChange={(value) => setForm({ ...form, traktRefreshToken: value })} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>Save</button>
          <button type="button" className="secondary" onClick={onSync} disabled={busy || !hasTraktConfig}>Sync Trakt</button>
          <button type="button" className="secondary danger-action" onClick={onClearHistory} disabled={busy || !(watch.count > 0)}>
            <Trash2 size={16} />
            Clear history
          </button>
        </div>
        {status && <div className={isErrorMessage(status) ? "inline-error" : "inline-note"}>{status}</div>}
      </form>
      <form className="panel" onSubmit={onSavePlex}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Artwork</p>
            <h2>Plex Discover landscapes</h2>
            <p className="muted">
              {plex?.has_access_token
                ? `Connected${plexName ? ` as ${plexName}` : ""}.`
                : "Connect Plex so add-on media can use enhanced Discover 16:9 art."}
            </p>
            <p className="muted">
              Clean landscapes: <strong>{artwork?.clean_landscape || 0}</strong>
              {" "}· cached: <strong>{artwork?.total || 0}</strong>
              {" "}· backdrop-only: <strong>{artwork?.backdrop_only || 0}</strong>
              {" "}· gaps: <strong>{artworkGaps}</strong>
              {artwork?.running ? " · sync running" : ""}
            </p>
          </div>
          <span className={plex?.has_access_token ? "small-status ok" : "small-status warn"}>
            {plex?.has_access_token ? "Connected" : "Missing"}
          </span>
        </div>
        <TextField
          label="Plex access token"
          type="password"
          value={plexAccessToken}
          onChange={setPlexAccessToken}
          placeholder="Paste token, or use PIN login"
          help="The server stores the token locally and uses it only for Plex Discover artwork lookup."
        />
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onStartPlex} disabled={busy}>Plex PIN Login</button>
          <button type="button" className="secondary" onClick={onCheckPlex} disabled={busy || !plexPin?.id}>Check Login</button>
          <button type="submit" disabled={busy || !plexAccessToken.trim()}>Save Token</button>
          <button type="button" className="secondary" onClick={onRefreshArtwork} disabled={busy || !plex?.has_access_token}>Refresh Artwork</button>
          <button type="button" className="secondary" onClick={onClearPlex} disabled={busy || !plex?.has_access_token}>Clear</button>
        </div>
        {plexPin?.code && (
          <div className="inline-note">
            Open <a className="text-link" href={plexLink} target="_blank" rel="noreferrer">Plex login <ExternalLink size={14} /></a>
            {" "}and enter code <strong>{plexPin.code}</strong>. Then click Check Login.
          </div>
        )}
        {plexStatus && <div className={isErrorMessage(plexStatus) ? "inline-error" : "inline-note"}>{plexStatus}</div>}
      </form>

      <form className="panel" onSubmit={onSavePlexPublicRows}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Native Home</p>
            <h2>Plex public rows</h2>
            <p className="muted">
              {hasPlexToken
                ? `${plexRows.length} selectable hub${plexRows.length === 1 ? "" : "s"} loaded from Plex Discover.`
                : "Connect Plex above to load public hub rows."}
            </p>
          </div>
          <span className={plexPublicRows?.enabled ? "small-status ok" : hasPlexToken ? "small-status" : "small-status warn"}>
            {plexPublicRows?.enabled ? "Enabled" : hasPlexToken ? "Ready" : "Missing Plex"}
          </span>
        </div>

        <div className="form-grid four">
          <div className="choice-block">
            <span>Status</span>
            <div className="choice-grid single-choice-grid">
              <label className={plexPublicRows?.enabled ? "choice-chip selected" : "choice-chip"}>
                <input
                  type="checkbox"
                  checked={Boolean(plexPublicRows?.enabled)}
                  onChange={() => setPlexPublicRows({ ...plexPublicRows, enabled: !plexPublicRows?.enabled })}
                />
                Publish selected rows
              </label>
            </div>
          </div>
          <SelectField
            label="Hub section"
            value={plexPublicRows?.section || "home"}
            onChange={(value) => setPlexPublicRows({ ...plexPublicRows, section: value, selectedRows: [], rows: [] })}
            options={[
              ["home", "Home"],
              ["watchlist", "Watchlist"],
            ]}
          />
          <SelectField
            label="Maximum rows"
            value={String(plexPublicRows?.rowCount || 8)}
            onChange={(value) => setPlexPublicRows({ ...plexPublicRows, rowCount: Number(value) })}
            options={plexRowCountOptions.map((count) => [String(count), `${count} Rows`])}
          />
          <SelectField
            label="Items per row"
            value={String(plexPublicRows?.itemLimit || 24)}
            onChange={(value) => setPlexPublicRows({ ...plexPublicRows, itemLimit: Number(value), rows: [] })}
            options={plexItemLimitOptions.map((count) => [String(count), `${count} Items`])}
          />
        </div>

        {!hasPlexToken ? (
          <EmptyState icon={Library} title="Plex account needed" text="Use Plex PIN Login or paste a token in the card above." />
        ) : plexPublicRows?.error ? (
          <div className="inline-error">{plexPublicRows.error}</div>
        ) : plexRows.length === 0 ? (
          <EmptyState icon={RefreshCw} title="No rows loaded" text="Refresh row choices after selecting a hub section." />
        ) : (
          <div className="plex-row-list">
            {plexRows.map((row) => {
              const checked = selectedPlexRows.includes(row.id);
              return (
                <label className={checked ? "choice-chip plex-row-choice selected" : "choice-chip plex-row-choice"} key={row.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setPlexPublicRows({
                      ...plexPublicRows,
                      selectedRows: toggleArrayValue(selectedPlexRows, row.id),
                    })}
                  />
                  <span>
                    <strong>{row.title || row.id}</strong>
                    <small>{row.source || "Plex Discover"} · {row.item_count || 0} playable items</small>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => onLoadPlexPublicRows()} disabled={busy || !hasPlexToken}>Refresh Row Choices</button>
          <button type="submit" disabled={busy || (plexPublicRows?.enabled && (!hasPlexToken || selectedPlexRows.length === 0))}>Save Plex Rows</button>
        </div>
        {plexPublicRowsStatus && <div className={isErrorMessage(plexPublicRowsStatus) ? "inline-error" : "inline-note"}>{plexPublicRowsStatus}</div>}
      </form>
    </section>
  );
}

function SettingsView({ signedIn, login, setLogin, onSignIn, onSignOut, serverUrl, registry, setRegistry, onSaveRegistry, onCopy, busy }) {
  return (
    <section className="stack">
      <div className="panel split-panel">
        <div>
          <p className="eyebrow">Apple TV</p>
          <h2>Server URL</h2>
          <p className="server-url">{serverUrl}</p>
        </div>
        <button onClick={onCopy}>Copy URL</button>
      </div>
      <form className="panel split-panel" onSubmit={onSaveRegistry}>
        <div className="settings-field">
          <p className="eyebrow">Add-ons</p>
          <h2>Registry URL</h2>
          <input value={registry.url} onChange={(event) => setRegistry({ ...registry, url: event.target.value })} />
        </div>
        <button type="submit" disabled={!signedIn || busy}>Save</button>
      </form>
      {signedIn ? (
        <div className="panel split-panel">
          <div>
            <p className="eyebrow">Session</p>
            <h2>Signed in</h2>
            <p className="muted">Dashboard management is active in this browser.</p>
          </div>
          <button className="secondary" onClick={onSignOut}>Sign out</button>
        </div>
      ) : (
        <SignInCard login={login} setLogin={setLogin} onSubmit={onSignIn} busy={busy} />
      )}
    </section>
  );
}

function SignInCard({ login, setLogin, onSubmit, busy }) {
  return (
    <form className="panel sign-in-card" onSubmit={onSubmit}>
      <div className="lock-icon"><Lock size={22} /></div>
      <div>
        <p className="eyebrow">Admin</p>
        <h2>Sign in to manage the server</h2>
      </div>
      <div className="form-grid two">
        <TextField label="Username" value={login.username} onChange={(value) => setLogin({ ...login, username: value })} />
        <TextField label="Password" type="password" value={login.password} onChange={(value) => setLogin({ ...login, password: value })} />
      </div>
      <div className="form-actions">
        <button type="submit" disabled={busy}>Sign in</button>
      </div>
    </form>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="metric-card">
      <Icon size={21} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function HealthRow({ ok, label, value }) {
  return (
    <div className="health-row">
      {ok ? <BadgeCheck size={18} /> : <CircleAlert size={18} />}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "", help = "" }) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {help && <small className="field-help">{help}</small>}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function pageTitle(view) {
  return {
    overview: "Dashboard",
    discover: "Discover",
    addons: "Add-ons",
    catalogs: "Catalogs",
    live: "Live TV",
    setup: "Setup",
    watch: "Watch Sync",
    settings: "Settings",
  }[view] || "Dashboard";
}

function initials(value) {
  return String(value || "V").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function labelCapability(value) {
  return {
    catalog: "Catalogs",
    meta: "Metadata",
    stream: "Streams",
    subtitles: "Subtitles",
    live_tv: "Live TV",
  }[value] || value;
}

function imageForItem(item) {
  return item?.poster_path || item?.poster || item?.thumb || item?.art || item?.background || item?.backdrop_path || item?.landscape_path || item?.logo_path || item?.logo || "";
}

function sortedCatalogs(catalogs) {
  return [...catalogs].sort((a, b) => {
    const left = Number.isFinite(a.sort_order) ? a.sort_order : 0;
    const right = Number.isFinite(b.sort_order) ? b.sort_order : 0;
    if (left !== right) return left - right;
    return String(a.name || a.id).localeCompare(String(b.name || b.id));
  });
}

function mergePlexPublicRowsState(current, data = {}) {
  return {
    ...current,
    enabled: Boolean(data.enabled),
    selectedRows: Array.isArray(data.selected_rows) ? data.selected_rows : current.selectedRows || [],
    rowCount: data.row_count || data.default_row_count || current.rowCount || emptyPlexPublicRows.rowCount,
    itemLimit: data.item_limit || data.default_item_limit || current.itemLimit || emptyPlexPublicRows.itemLimit,
    section: data.section || current.section || "home",
    rows: Array.isArray(data.rows) ? data.rows : current.rows || [],
    hasPlexToken: Boolean(data.has_plex_token),
    error: data.error || "",
    maxRowCount: data.max_row_count || current.maxRowCount || emptyPlexPublicRows.maxRowCount,
    maxItemLimit: data.max_item_limit || current.maxItemLimit || emptyPlexPublicRows.maxItemLimit,
    defaultRowCount: data.default_row_count || current.defaultRowCount || emptyPlexPublicRows.defaultRowCount,
    defaultItemLimit: data.default_item_limit || current.defaultItemLimit || emptyPlexPublicRows.defaultItemLimit,
  };
}

function uniqueOptions(values) {
  return Array.from(new Set(values.filter((value) => Number(value) > 0)));
}

function toggleArrayValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function isErrorMessage(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("failed") || text.includes("error") || text.includes("invalid") || text.includes("required");
}

createRoot(document.getElementById("root")).render(<App />);
