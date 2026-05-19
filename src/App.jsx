import React, { useState, useRef, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import TrailMap from './components/TrailMap';
import FloatingControls from './components/FloatingControls';
import SearchBar from './components/SearchBar';
import WeatherWidget from './components/WeatherWidget';
import { ACTIVITY_KEYS, ACTIVITY_CONFIG } from './config';
import './App.css';

const URL_PARAM_MAP = {
  mtb: 'mountain_bike',
  moto: 'dirt_bike',
  dirtbike: 'dirt_bike',
  roadbike: 'road_bike',
  gravelbike: 'gravel_bike',
  ebike: 'ebike',
  emoto: 'edirt_bike',
  edirtbike: 'edirt_bike',
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
  { key: 'edirt_bike', desc: '' },
  { key: 'ohv', desc: '' },
  { key: 'snowmobile', desc: '' },
  { key: 'ebike', desc: '' },
  { key: 'mountain_bike', desc: '' },
  { key: 'gravel_bike', desc: '' },
  { key: 'road_bike', desc: '' },
  { key: 'hiking', desc: '' },
  { key: 'horse', desc: '' },
];

function WelcomeModal({ onSelect, onCamp }) {
  const [selected, setSelected] = React.useState([]);
  const [withCamp, setWithCamp] = React.useState(false);

  function toggleActivity(key) {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function handleGo() {
    if (selected.length === 0) {
      onSelect(null);
    } else if (selected.length === 1) {
      onSelect(selected[0]);
    } else {
      onSelect(null, selected);
    }
    if (withCamp && onCamp) onCamp(true);
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <img src="/logo.svg" alt="RadCamp" className="welcome-logo" />
          <h2 className="welcome-title">What are you looking for?</h2>
          <p className="welcome-sub">Select one or more — find your next Colorado adventure!</p>
        </div>
        <div className="welcome-grid">
          {MODAL_ACTIVITIES.map(({ key }) => {
            const cfg = ACTIVITY_CONFIG[key];
            if (!cfg) return null;
            const active = selected.includes(key);
            return (
              <button
                key={key}
                className={`welcome-card${active ? ' selected' : ''}`}
                style={{ '--card-color': cfg.color }}
                onClick={() => toggleActivity(key)}
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
        <button className="welcome-go" onClick={handleGo}>
          Let's Ride →
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeFilters, setActiveFilters] = useState(() => makeFilters(startActivity));
  const [modalVisible, setModalVisible] = useState(showModal);
  const [singletrackOnly, setSingletrackOnly] = useState(false);
  const [campActive, setCampActive] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const mapRef = useRef(null);
  const addToRouteRef = useRef(null);

  const toggleFilter = useCallback((activity) => {
    setActiveFilters(prev => ({ ...prev, [activity]: !prev[activity] }));
  }, []);

  function handleModalSelect(activity, multiKeys) {
    if (multiKeys && Array.isArray(multiKeys)) {
      const filters = Object.fromEntries(ACTIVITY_KEYS.map(k => [k, multiKeys.includes(k)]));
      setActiveFilters(filters);
    } else {
      setActiveFilters(makeFilters(activity));
    }
    setModalVisible(false);
  }

  const handleToggleSingletrack = useCallback(() => setSingletrackOnly(v => !v), []);

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
    <APIProvider apiKey={apiKey}>
      {modalVisible && <WelcomeModal onSelect={handleModalSelect} onCamp={setCampActive} />}
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.svg" alt="RadCamp" className="brand-logo" />
            <span className="brand-name">RadCamp Adventures</span>
          </div>
          <SearchBar onPlaceSelect={handlePlaceSelect} />
          <span className="header-tagline">Colorado Trail Explorer</span>
        </header>

        <main className="app-main">
          <FloatingControls
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            singletrackOnly={singletrackOnly}
            onToggleSingletrack={handleToggleSingletrack}
            mapRef={mapRef}
            externalCampActive={campActive}
            onCampChange={setCampActive}
            onRouteModeChange={setRouteMode}
            onAddToRoute={fn => { addToRouteRef.current = fn; }}
          />
          <TrailMap activeFilters={activeFilters} singletrackOnly={singletrackOnly} onMapReady={handleMapReady} routeMode={routeMode} addToRouteRef={addToRouteRef} />
          <WeatherWidget mapRef={mapRef} />
        </main>
      </div>
    </APIProvider>
  );
}
