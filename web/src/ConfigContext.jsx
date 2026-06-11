import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ConfigContext = createContext(null);

const emptyDashboard = {
  manifests: [],
  catalogs: [],
  artwork: {},
  watch: {},
  server: {},
  registry_url: 'https://stremio-addons.net/api/manifest.json',
};

export function ConfigProvider({ children }) {
  // Authentication - NO localStorage
  const [token, setToken] = useState('');
  
  // Dashboard data
  const [dashboard, setDashboard] = useState(emptyDashboard);

  // UI state
  const [view, setView] = useState('overview');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Form states
  const [login, setLogin] = useState({ username: 'vortexo', password: 'vortexo' });
  
  const [registry, setRegistry] = useState({
    url: 'https://stremio-addons.net/api/manifest.json',
    q: '',
    capability: 'all',
    type: 'all',
  });

  const [perfect, setPerfect] = useState({
    debridProvider: 'none',
    debridKey: '',
    aiostreams: 'https://aiostreams.fortheweak.cloud',
    aiometadata: 'https://aiometadata.viren070.me',
    tmdbKey: '',
    tmdbToken: '',
    tvdbKey: '',
    geminiKey: '',
    rpdbKey: '',
    language: 'English',
  });

  const [streamingCatalogs, setStreamingCatalogs] = useState({
    providers: ['nfx', 'dnp', 'amp', 'atp', 'hbm'],
    types: ['movie', 'series'],
    mergeProviders: false,
    mergeAll: false,
    sortBy: 'TRENDING',
    rpdbKey: '',
  });

  const [keywordRows, setKeywordRows] = useState({
    enabled: false,
    rowCount: 10,
    tmdbKey: '',
    tmdbToken: '',
    language: 'en-US',
    region: 'US',
    clearCredentials: false,
  });

  const [watchForm, setWatchForm] = useState({
    traktClientId: '',
    traktClientSecret: '',
    traktAccessToken: '',
    traktRefreshToken: '',
  });

  // Data loaded from endpoints
  const [homeRows, setHomeRows] = useState([]);
  const [liveRows, setLiveRows] = useState([]);
  const [registryAddons, setRegistryAddons] = useState([]);
  const [plexSettings, setPlexSettings] = useState({});
  const [plexPin, setPlexPin] = useState(null);
  const [plexAccessToken, setPlexAccessToken] = useState('');
  const [watchStatus, setWatchStatus] = useState('');
  const [registryLoading, setRegistryLoading] = useState(false);
  const [plexStatus, setPlexStatus] = useState('');

  // Derived state (memoized for performance)
  const signedIn = Boolean(token);
  const serverUrl = typeof window === 'undefined' ? '' : window.location.origin;

  const summary = useMemo(() => {
    const manifests = dashboard.manifests || [];
    const catalogs = dashboard.catalogs || manifests.flatMap((item) => item.catalogs || []);
    const streamProviders = manifests.filter((item) => item.capabilities?.includes('stream')).length;
    const subtitleProviders = manifests.filter((item) => item.capabilities?.includes('subtitles')).length;
    const liveProviders = manifests.filter((item) => item.capabilities?.includes('live_tv')).length;
    const broken = manifests.filter((item) => item.status === 'error').length;
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

  const resetDashboard = useCallback(() => {
    setDashboard(emptyDashboard);
    setHomeRows([]);
    setLiveRows([]);
    setRegistryAddons([]);
    setPlexSettings({});
    setWatchStatus('');
  }, []);

  const contextValue = useMemo(
    () => ({
      token,
      setToken,
      signedIn,
      serverUrl,
      dashboard,
      setDashboard,
      resetDashboard,
      summary,
      view,
      setView,
      message,
      setMessage,
      busy,
      setBusy,
      login,
      setLogin,
      registry,
      setRegistry,
      perfect,
      setPerfect,
      streamingCatalogs,
      setStreamingCatalogs,
      keywordRows,
      setKeywordRows,
      watchForm,
      setWatchForm,
      homeRows,
      setHomeRows,
      liveRows,
      setLiveRows,
      registryAddons,
      setRegistryAddons,
      plexSettings,
      setPlexSettings,
      plexPin,
      setPlexPin,
      plexAccessToken,
      setPlexAccessToken,
      watchStatus,
      setWatchStatus,
      registryLoading,
      setRegistryLoading,
      plexStatus,
      setPlexStatus,
    }),
    [token, signedIn, serverUrl, dashboard, resetDashboard, summary, view, message, busy, login, registry, perfect, streamingCatalogs, keywordRows, watchForm, homeRows, liveRows, registryAddons, plexSettings, plexPin, plexAccessToken, watchStatus, registryLoading, plexStatus]
  );

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
