import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import TrailMap from './components/TrailMap';
import FloatingControls from './components/FloatingControls';
import SearchBar from './components/SearchBar';
import WeatherWidget from './components/WeatherWidget';
import AuthModal from './components/AuthModal';
import LogRideModal from './components/LogRideModal';
import MyRidesPanel from './components/MyRidesPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ACTIVITY_KEYS, ACTIVITY_CONFIG } from './config';
import './App.css';

const URL_PARAM_MAP = {
  mtb: 'mountain_bike',
  moto: 'dirt_bike',
  dirtbike: 'dirt_bike',
  roadbike: 'road_bike',
  gravelbike: 'gravel_bike',
  hiking: 'hiking',
  ohv: 'ohv',
  snowmobile: 'snowmobile',
  bikepath: 'bike_path',
};

function resolveStartActivity() {
  const params = new URLSearchParams(window.location.search);
  const param = params.get('activity');
  if (param && URL_PARAM_MAP[param]) return URL_PARAM_MAP[param];
  return null;
}

function makeFilters(activity) {
  if (!activity || activity === 'all') {
    return Object.fromEntries(ACTIVITY_KEYS.map(k => [k, true]));
  }
  return Object.fromEntries(ACTIVITY_KEYS.map(k => [k, k === activity]));
}

const startActivity = resolveStartActivity();
const showModal = startActivity === null;

const MODAL_ACTIVITIES = [
  { key: 'dirt_bike', desc: '' },
  { key: 'ohv', desc: '' },
  { key: 'snowmobile', desc: '' },
  { key: 'mountain_bike', desc: '' },
  { key: 'gravel_bike', desc: '' },
  { key: 'road_bike', desc: '' },
  { key: 'hiking', desc: '' },
  { key: 'horse', desc: '' },
];

function WelcomeModal({ onSelect, onCamp, onShops }) {
  // Camp/shop are opt-in overlays applied at the moment a card is tapped.
  const [withCamp, setWithCamp] = React.useState(false);
  const [withShops, setWithShops] = React.useState(false);

  // Tapping an activity enters immediately with just that activity, carrying
  // whatever camp/shop overlay choices are checked. No multi-select, no button.
  function enterWith(key) {
    if (onCamp) onCamp(withCamp);
    if (onShops) onShops(withShops);
    onSelect(key);
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <img src="/logo.svg" alt="RadCamp" className="welcome-logo" />
          <h2 className="welcome-title">What are you looking for?</h2>
          <p className="welcome-sub">Tap an activity to start exploring Colorado.</p>
          <p className="welcome-ai-note">✨ AI-powered trail descriptions on every trail</p>
        </div>
        <div className="welcome-grid">
          {MODAL_ACTIVITIES.map(({ key }) => {
            const cfg = ACTIVITY_CONFIG[key];
            if (!cfg) return null;
            return (
              <button
                key={key}
                className="welcome-card"
                style={{ '--card-color': cfg.color }}
                onClick={() => enterWith(key)}
              >
                <div className="welcome-card-dot" />
                <span className="welcome-card-label">{cfg.label}</span>
              </button>
            );
          })}
        </div>
        <label className="welcome-camp-check">
          <input type="checkbox" checked={withCamp} onChange={e => setWithCamp(e.target.checked)} />
          Also show campgrounds
        </label>
        <label className="welcome-camp-check">
          <input type="checkbox" checked={withShops} onChange={e => setWithShops(e.target.checked)} />
          Also show nearby shops
        </label>
      </div>
    </div>
  );
}

// Header auth control: "Sign In" button when logged out, an avatar initial
// with a dropdown (username + Sign Out) when logged in. Self-contained — owns
// the AuthModal open state and the dropdown state. Must render inside
// <AuthProvider> (it does — it lives in the header below).
function HeaderAuth() {
  const { user, signOut, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef(null);
  const menuRef = useRef(null);

  // Close the dropdown on a click/touch outside both the avatar and the
  // (portaled) menu, or on Escape. Ref-based containment checks so it works
  // even though the menu is rendered into document.body via a portal.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (avatarRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (loading) return <div className="header-auth-placeholder" aria-hidden="true" />;

  if (!user) {
    return (
      <>
        <button className="header-auth-btn" onClick={() => setModalOpen(true)}>Sign In</button>
        <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const email = user.email || '';
  // profiles.username isn't fetched yet (tomorrow) — derive a display name from
  // the email local-part, matching how the DB trigger seeds the username.
  const username = user.user_metadata?.username || email.split('@')[0] || 'rider';
  const initial = (username[0] || '?').toUpperCase();

  return (
    <div className="header-auth">
      <button
        ref={avatarRef}
        className="header-avatar"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={menuOpen}
      >{initial}</button>
      {/* Portaled into document.body so the menu escapes the header's stacking
          context (.app-header is a flex item with z-index, which traps any
          child z-index). This is what guarantees it sits above the map UI. */}
      {menuOpen && createPortal(
        <div className="header-menu" ref={menuRef} role="menu">
          <div className="header-menu-user">
            <div className="header-menu-username">{username}</div>
            <div className="header-menu-email">{email}</div>
          </div>
          <button
            className="header-menu-item"
            onClick={async () => { setMenuOpen(false); await signOut(); }}
          >Sign Out</button>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function App() {
  const [activeFilters, setActiveFilters] = useState(() => makeFilters(startActivity));
  const [modalVisible, setModalVisible] = useState(showModal);
  const [findSingletrack, setFindSingletrack] = useState(false);
  const [campActive, setCampActive] = useState(false);
  const [shopsActive, setShopsActive] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [routeTrails, setRouteTrails] = useState([]);
  const [routeInfo, setRouteInfo] = useState(''); // status text for the snapped-route flow
  // Ride logging
  const [logRideOpen, setLogRideOpen] = useState(false);
  const [ridesPanelOpen, setRidesPanelOpen] = useState(false);
  const [editRide, setEditRide] = useState(null);
  const [ridesRefresh, setRidesRefresh] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showRideHistory, setShowRideHistory] = useState(true); // ride pins on main map (ON by default)
  const [focusRideId, setFocusRideId] = useState(null); // ride to open in detail (from a map pin)

  const mapRef = useRef(null);

  const toggleFilter = useCallback((activity) => {
    // Single-select: tapping an activity makes it the ONLY active one.
    // Tapping the already-active one clears all (blank map). Camp/shop overlays
    // are separate state and unaffected.
    setActiveFilters(prev => {
      const onKeys = ACTIVITY_KEYS.filter(k => prev[k]);
      const isSoleActive = onKeys.length === 1 && onKeys[0] === activity;
      if (isSoleActive) {
        // Tapped the active one -> clear all. Find Singletrack is moto-only, so clear it too.
        setFindSingletrack(false);
        return Object.fromEntries(ACTIVITY_KEYS.map(k => [k, false]));
      }
      // Find Singletrack only applies to Moto; clear it when switching to anything else.
      if (activity !== 'dirt_bike') setFindSingletrack(false);
      return Object.fromEntries(ACTIVITY_KEYS.map(k => [k, k === activity]));
    });
  }, []);

  function handleModalSelect(activity) {
    setActiveFilters(makeFilters(activity));
    setModalVisible(false);
  }

  const handleToggleSingletrack = useCallback(() => setFindSingletrack(v => !v), []);
  const handleShowAllTrails = useCallback(() => setFindSingletrack(false), []);

  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handlePlaceSelect = useCallback(({ lat, lng, viewport }) => {
    if (!mapRef.current) return;
    if (viewport) {
      mapRef.current.fitBounds(viewport);
    } else {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(13);
    }
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="api-key-error">
        <div className="api-key-card">
          <div className="api-key-logo">
            <span className="mountain-icon">&#9968;</span>
            <h1>RadCamp Adventures</h1>
          </div>
          <h2>Google Maps API Key Required</h2>
          <p>Create a <code>.env.local</code> file in the project root:</p>
          <pre>VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</pre>
          <p className="api-key-hint">
            Get a key at{' '}
            <strong>console.cloud.google.com</strong> — enable the
            "Maps JavaScript API".
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
    <APIProvider apiKey={apiKey}>
      {modalVisible && <WelcomeModal onSelect={handleModalSelect} onCamp={setCampActive} onShops={setShopsActive} />}
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.svg" alt="RadCamp" className="brand-logo" />
            <span className="brand-name">RadCamp Adventures</span>
          </div>
          <SearchBar onPlaceSelect={handlePlaceSelect} />
          <div className="header-right">
            <span className="header-tagline">✨ AI-Powered Colorado Adventure Map</span>
            <HeaderAuth />
          </div>
        </header>

        <main className="app-main">
          <FloatingControls
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            findSingletrack={findSingletrack}
            onToggleSingletrack={handleToggleSingletrack}
            onShowAllTrails={handleShowAllTrails}
            mapRef={mapRef}
            externalCampActive={campActive}
            onCampChange={setCampActive}
            externalShopsActive={shopsActive}
            onShopsChange={setShopsActive}
            onRouteModeChange={setRouteMode}
            routeTrails={routeTrails}
            onRouteTrailsChange={setRouteTrails}
            routeInfo={routeInfo}
            onLogRide={() => { setEditRide(null); setLogRideOpen(true); }}
            onViewRides={() => setRidesPanelOpen(true)}
            onSignIn={() => setAuthModalOpen(true)}
            showRideHistory={showRideHistory}
            onToggleRideHistory={() => setShowRideHistory(v => !v)}
          />
          <TrailMap activeFilters={activeFilters} findSingletrack={findSingletrack} onMapReady={handleMapReady} routeMode={routeMode} onReplaceRoute={setRouteTrails} onRouteInfo={setRouteInfo} routeTrails={routeTrails} showRideHistory={showRideHistory} ridesRefresh={ridesRefresh} onViewRide={(id) => { setFocusRideId(id); setRidesPanelOpen(true); }} />
          <WeatherWidget mapRef={mapRef} />
          <div className={`singletrack-banner${findSingletrack ? ' visible' : ''}`} role="status" aria-hidden={!findSingletrack}>
            <span className="singletrack-banner-text">🔍 Showing singletrack only</span>
            <button className="singletrack-banner-link" onClick={handleShowAllTrails}>Show all trails</button>
          </div>
        </main>

        <LogRideModal
          open={logRideOpen}
          editRide={editRide}
          mapRef={mapRef}
          onClose={() => { setLogRideOpen(false); setEditRide(null); }}
          onSaved={() => setRidesRefresh(n => n + 1)}
        />
        <MyRidesPanel
          open={ridesPanelOpen}
          refreshSignal={ridesRefresh}
          initialRideId={focusRideId}
          onClose={() => { setRidesPanelOpen(false); setFocusRideId(null); }}
          onEdit={(ride) => { setEditRide(ride); setLogRideOpen(true); }}
        />
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    </APIProvider>
    </AuthProvider>
  );
}
