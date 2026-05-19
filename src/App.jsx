import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import TrailMap from './components/TrailMap';
import ActivityFilter from './components/ActivityFilter';
import { ACTIVITY_KEYS } from './config';
import './App.css';

const initialFilters = Object.fromEntries(ACTIVITY_KEYS.map(k => [k, true]));

export default function App() {
  const [activeFilters, setActiveFilters] = useState(initialFilters);

  function toggleFilter(activity) {
    setActiveFilters(prev => ({ ...prev, [activity]: !prev[activity] }));
  }

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
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <span className="brand-icon">&#9968;</span>
            <span className="brand-name">RadCamp Adventures</span>
          </div>
          <span className="header-tagline">Colorado Trail Explorer</span>
        </header>

        <main className="app-main">
          <ActivityFilter activeFilters={activeFilters} onToggle={toggleFilter} />
          <TrailMap activeFilters={activeFilters} />
        </main>
      </div>
    </APIProvider>
  );
}
