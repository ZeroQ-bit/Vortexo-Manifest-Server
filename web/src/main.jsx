import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BadgeCheck,
  CircleAlert,
  Clapperboard,
  Database,
  Eye,
  LayoutDashboard,
  Library,
  ListChecks,
  Lock,
  Play,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import "./styles.css";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "addons", label: "Add-ons", icon: Sparkles },
  { id: "catalogs", label: "Catalogs", icon: Library },
  { id: "setup", label: "Setup", icon: ListChecks },
  { id: "watch", label: "Watch Sync", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings }
];

const emptyDashboard = {
  manifests: [],
  watch: {},
  server: {}
};

function App() {
  const [view, setView] = useState("overview");
  const [token, setToken] = useState(() => localStorage.getItem("vortexoToken") || "");
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [homeRows, setHomeRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [login, setLogin] = useState({ username: "vortexo", password: "vortexo" });
  const [manual, setManual] = useState({ name: "", url: "" });
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
    language: "English"
  });
  const [watchForm, setWatchForm] = useState({
    traktClientId: "",
    traktClientSecret: "",
    traktAccessToken: "",
    traktRefreshToken: "",
    plexServerUrl: "",
    plexToken: ""
  });

  const signedIn = Boolean(token);
  const serverUrl = typeof window === "undefined" ? "" : window.location.origin;

  const summary = useMemo(() => {
    const manifests = dashboard.manifests || [];
    const catalogs = manifests.reduce((sum, item) => sum + (item.catalogs?.length || 0), 0);
    const streamProviders = manifests.filter((item) => item.capabilities?.includes("stream")).length;
    const subtitleProviders = manifests.filter((item) => item.capabilities?.includes("subtitles")).length;
    const broken = manifests.filter((item) => item.status === "error").length;
    return {
      manifests: manifests.length,
      enabled: manifests.filter((item) => item.enabled).length,
      catalogs,
      streamProviders,
      subtitleProviders,
      broken,
      watchItems: dashboard.watch?.count || 0
    };
  }, [dashboard]);

  useEffect(() => {
    loadPublicHome();
    if (token) {
      loadDashboard(token);
      loadWatchSettings(token);
    }
  }, [token]);

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
        headers: { authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Dashboard failed");
      setDashboard(data);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadPublicHome() {
    try {
      const data = await fetch("/api/v1/vortexo/home?limit=8").then((res) => res.json());
      setHomeRows(data.rows || []);
    } catch {
      setHomeRows([]);
    }
  }

  async function loadWatchSettings(activeToken = token) {
    if (!activeToken) return;
    try {
      const res = await fetch("/api/v1/bridge/watch/settings", {
        headers: { authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) return;
      setWatchForm((current) => ({
        ...current,
        traktClientId: data.trakt?.client_id || "",
        plexServerUrl: data.plex?.server_url || ""
      }));
    } catch {
      // Optional panel; keep the dashboard usable.
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: login.username, password: login.password })
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
    setMessage("Signed out");
  }

  async function installManifest(event) {
    event.preventDefault();
    if (!manual.url.trim()) {
      setMessage("Paste a manifest URL first.");
      return;
    }
    setBusy(true);
    try {
      await request("/api/v1/bridge/manifests", {
        method: "POST",
        body: JSON.stringify({ name: manual.name.trim(), url: manual.url.trim(), enabled: true })
      });
      setManual({ name: "", url: "" });
      setMessage("Manifest installed");
      await loadDashboard();
      await loadPublicHome();
      setView("addons");
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
      setMessage("Manifest removed");
      await loadDashboard();
      await loadPublicHome();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
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
            rpdb_api_key: perfect.rpdbKey.trim()
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
            include_p2p: provider === "none"
          }
        })
      });
      setMessage("Setup generated and installed");
      await loadDashboard();
      await loadPublicHome();
      setView("overview");
    } catch (error) {
      setMessage(error.message);
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
          plex_server_url: watchForm.plexServerUrl.trim(),
          plex_token: watchForm.plexToken.trim()
        })
      });
      setWatchForm((current) => ({
        ...current,
        traktClientSecret: "",
        traktAccessToken: "",
        traktRefreshToken: "",
        plexToken: ""
      }));
      setMessage("Watch sync settings saved");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function syncWatch(kind) {
    setBusy(true);
    try {
      const path = kind === "trakt" ? "/api/v1/bridge/watch/trakt/sync" : "/api/v1/bridge/watch/plex/sync";
      const data = await request(path, { method: "POST" });
      setMessage(`${kind === "trakt" ? "Trakt" : "Plex"} imported ${data.imported || 0} items`);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
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
            <span>{signedIn ? "Dashboard controls enabled" : "Sign in to manage manifests"}</span>
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
            <button className="icon-button" title="Refresh" onClick={() => { loadDashboard(); loadPublicHome(); }} disabled={!signedIn || busy}>
              <RefreshCw size={18} />
            </button>
            <button className="server-pill" onClick={copyServerURL} title="Copy server URL">
              <Server size={17} />
              <span>{serverUrl.replace(/^https?:\/\//, "")}</span>
            </button>
          </div>
        </header>

        {message && (
          <div className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("error") ? "notice error" : "notice"}>
            {message}
          </div>
        )}

        {!signedIn && view !== "settings" ? (
          <SignInCard login={login} setLogin={setLogin} onSubmit={signIn} busy={busy} />
        ) : (
          <>
            {view === "overview" && <Overview summary={summary} dashboard={dashboard} homeRows={homeRows} />}
            {view === "addons" && (
              <Addons
                manifests={dashboard.manifests || []}
                manual={manual}
                setManual={setManual}
                onInstall={installManifest}
                onRemove={removeManifest}
                busy={busy}
              />
            )}
            {view === "catalogs" && <Catalogs manifests={dashboard.manifests || []} />}
            {view === "setup" && (
              <Setup perfect={perfect} setPerfect={setPerfect} onSubmit={generatePerfectSetup} busy={busy} />
            )}
            {view === "watch" && (
              <WatchSync
                watch={dashboard.watch || {}}
                form={watchForm}
                setForm={setWatchForm}
                onSave={saveWatch}
                onSync={syncWatch}
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
  const previewRows = (homeRows || []).slice(0, 4);
  return (
    <section className="stack">
      <div className="metric-grid">
        <Metric icon={Database} label="Installed add-ons" value={summary.manifests} detail={`${summary.enabled} enabled`} />
        <Metric icon={Library} label="Catalog rows" value={summary.catalogs} detail="Available to Vortexo" />
        <Metric icon={Play} label="Stream providers" value={summary.streamProviders} detail={`${summary.subtitleProviders} subtitle providers`} />
        <Metric icon={Eye} label="Watch items" value={summary.watchItems} detail={dashboard.watch?.trakt_connected ? "Trakt connected" : "Local state"} />
      </div>

      <div className="panel split-panel">
        <div>
          <p className="eyebrow">Health</p>
          <h2>Server output</h2>
          <p className="muted">
            {summary.broken === 0
              ? "Installed manifests are responding cleanly."
              : `${summary.broken} manifest needs attention.`}
          </p>
        </div>
        <div className="health-list">
          <HealthRow ok={summary.manifests > 0} label="Manifest registry" value={`${summary.manifests} installed`} />
          <HealthRow ok={summary.catalogs > 0} label="Catalogs" value={`${summary.catalogs} rows`} />
          <HealthRow ok={summary.streamProviders > 0} label="Streams" value={`${summary.streamProviders} providers`} />
          <HealthRow ok={summary.broken === 0} label="Errors" value={summary.broken === 0 ? "None" : `${summary.broken} found`} />
        </div>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>Home rows Vortexo can read</h2>
          </div>
        </div>
        {previewRows.length === 0 ? (
          <EmptyState icon={Library} title="No rows yet" text="Install a catalog manifest to populate the Vortexo home feed." />
        ) : (
          <div className="preview-rows">
            {previewRows.map((row) => (
              <div className="preview-row" key={row.id}>
                <div className="row-title">
                  <strong>{row.title}</strong>
                  <span>{row.reason || "Manifest catalog"}</span>
                </div>
                <div className="poster-strip">
                  {(row.items || []).slice(0, 6).map((item) => (
                    <div className="poster" key={item.id || item.ratingKey}>
                      {item.poster || item.thumb ? <img src={item.poster || item.thumb} alt="" /> : <Clapperboard size={20} />}
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

function Addons({ manifests, manual, setManual, onInstall, onRemove, busy }) {
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
                {item.message && <div className="inline-error">{item.message}</div>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Catalogs({ manifests }) {
  const catalogs = manifests.flatMap((manifest) =>
    (manifest.catalogs || []).map((catalog) => ({ ...catalog, manifest: manifest.name || manifest.id, status: manifest.status }))
  );
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Catalog manager</p>
          <h2>Rows coming from add-ons</h2>
        </div>
        <span className="count-pill">{catalogs.length}</span>
      </div>
      {catalogs.length === 0 ? (
        <EmptyState icon={Library} title="No catalogs" text="Install a catalog-capable manifest to see rows here." />
      ) : (
        <div className="catalog-list">
          {catalogs.map((catalog) => (
            <div className="catalog-row" key={`${catalog.manifest}-${catalog.type}-${catalog.id}`}>
              <div>
                <strong>{catalog.name || catalog.id}</strong>
                <span>{catalog.manifest}</span>
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

function Setup({ perfect, setPerfect, onSubmit, busy }) {
  return (
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
          ["easydebrid", "EasyDebrid"]
        ]} />
        <TextField label="Debrid API key" type="password" value={perfect.debridKey} onChange={(value) => setPerfect({ ...perfect, debridKey: value })} />
        <SelectField label="Language" value={perfect.language} onChange={(value) => setPerfect({ ...perfect, language: value })} options={[
          ["English", "English"],
          ["Croatian", "Croatian"],
          ["Arabic", "Arabic"],
          ["French", "French"],
          ["German", "German"],
          ["Spanish", "Spanish"]
        ]} />
        <SelectField label="AIOStreams" value={perfect.aiostreams} onChange={(value) => setPerfect({ ...perfect, aiostreams: value })} options={[
          ["https://aiostreams.fortheweak.cloud", "Fortheweak"],
          ["https://aiostreamsfortheweebsstable.midnightignite.me", "Midnight"],
          ["https://aiostreams.viren070.me", "Viren"]
        ]} />
        <SelectField label="AIOMetadata" value={perfect.aiometadata} onChange={(value) => setPerfect({ ...perfect, aiometadata: value })} options={[
          ["https://aiometadata.viren070.me", "Viren"],
          ["https://aiometadatafortheweebs.midnightignite.me", "Midnight"]
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
  );
}

function WatchSync({ watch, form, setForm, onSave, onSync, busy }) {
  return (
    <section className="stack">
      <div className="metric-grid two-cols">
        <Metric icon={Eye} label="Watch items" value={watch.count || 0} detail="Local normalized state" />
        <Metric icon={BadgeCheck} label="Connections" value={(watch.trakt_connected ? 1 : 0) + (watch.plex_connected ? 1 : 0)} detail="Trakt and Plex" />
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
          <TextField label="Plex server URL" value={form.plexServerUrl} onChange={(value) => setForm({ ...form, plexServerUrl: value })} />
          <TextField label="Plex token" type="password" value={form.plexToken} onChange={(value) => setForm({ ...form, plexToken: value })} />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>Save</button>
          <button type="button" className="secondary" onClick={() => onSync("trakt")} disabled={busy || !watch.trakt_client_config}>Sync Trakt</button>
          <button type="button" className="secondary" onClick={() => onSync("plex")} disabled={busy || !form.plexServerUrl}>Sync Plex</button>
        </div>
      </form>
    </section>
  );
}

function SettingsView({ signedIn, login, setLogin, onSignIn, onSignOut, serverUrl, onCopy, busy }) {
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

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
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
    addons: "Add-ons",
    catalogs: "Catalogs",
    setup: "Setup",
    watch: "Watch Sync",
    settings: "Settings"
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
    live_tv: "Live TV"
  }[value] || value;
}

createRoot(document.getElementById("root")).render(<App />);
