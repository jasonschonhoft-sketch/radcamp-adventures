import { useState, useRef, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import TrailMap from './components/TrailMap';
import ActivityFilter from './components/ActivityFilter';
import SearchBar from './components/SearchBar';
import { ACTIVITY_KEYS, ACTIVITY_CONFIG } from './config';
import './App.css';

const URL_PARAM_MAP = {
  mtb: 'mountain_bike',
  dirtbike: 'dirt_bike',
  roadbike: 'road_bike',
  gravelbike: 'gravel_bike',
  ebike: 'ebike',
  hiking: 'hiking',
  ohv: 'ohv',
  snowmobile: 'snowmobile',
  bikepath: 'bike_path',
  edirtbike: 'edirt_bike',
};

function resolveStartActivity() {
  const params = new URLSearchParams(window.location.search);
  const param = params.get('activity');
  if (param && URL_PARAM_MAP[param]) return URL_PARAM_MAP[param];
  return localStorage.getItem('radcamp_activity') || null;
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
  { key: 'mountain_bike', desc: 'Singletrack' },
  { key: 'dirt_bike', desc: 'Motorcycle trails' },
  { key: 'road_bike', desc: 'Paved roads' },
  { key: 'gravel_bike', desc: 'Mixed surface' },
  { key: 'ebike', desc: 'Electric bikes' },
  { key: 'hiking', desc: 'Foot trails' },
  { key: 'ohv', desc: 'Off-highway vehicles' },
  { key: 'snowmobile', desc: 'Winter trails' },
  { key: 'bike_path', desc: 'Paved bike paths' },
  { key: 'edirt_bike', desc: 'Electric dirt bikes' },
];

function WelcomeModal({ onSelect }) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <span className="welcome-icon">&#9968;</span>
          <h2 className="welcome-title">What are you looking for?</h2>
          <p className="welcome-sub">Select an activity to show matching Colorado trails</p>
        </div>
        <div className="welcome-grid">
          {MODAL_ACTIVITIES.map(({ key, desc }) => {
            const cfg = ACTIVITY_CONFIG[key];
            if (!cfg) return null;
            return (
              <button
                key={key}
                className="welcome-card"
                style={{ '--card-color': cfg.color }}
                onClick={() => onSelect(key)}
              >
                <div className="welcome-card-dot" />
                <span className="welcome-card-label">{cfg.label}</span>
                <span className="welcome-card-desc">{desc}</span>
              </button>
            );
          })}
        </div>
        <button className="welcome-skip" onClick={() => onSelect(null)}>
          Show all trails
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeFilters, setActiveFilters] = useState(() => makeFilters(startActivity));
  const [modalVisible, setModalVisible] = useState(showModal);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mapRef = useRef(null);

  function toggleFilter(activity) {
    setActiveFilters(prev => ({ ...prev, [activity]: !prev[activity] }));
  }

  function handleModalSelect(activity) {
    localStorage.setItem('radcamp_activity', activity ?? 'all');
    setActiveFilters(makeFilters(activity));
    setModalVisible(false);
  }

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
      {modalVisible && <WelcomeModal onSelect={handleModalSelect} />}
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <span className="brand-icon">&#9968;</span>
            <span className="brand-name">RadCamp Adventures</span>
          </div>
          <SearchBar onPlaceSelect={handlePlaceSelect} />
          <span className="header-tagline">Colorado Trail Explorer</span>
        </header>

        <main className="app-main">
          {sidebarOpen && (
            <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} />
          )}
          <ActivityFilter
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <button
            className="mobile-filter-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle filters"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <TrailMap activeFilters={activeFilters} onMapReady={handleMapReady} />
        </main>
      </div>
    </APIProvider>
  );
}
