import { useState, useEffect, useRef } from 'react';
import { ACTIVITY_CONFIG } from '../config';

const DISPLAY_KEYS = [
  'hiking', 'mountain_bike', 'bike_path', 'road_bike', 'gravel_bike',
  'ebike', 'dirt_bike', 'ohv', 'edirt_bike', 'snowmobile',
];

const SECTION_LABELS = {
  hiking: null,
  mountain_bike: 'CYCLING',
  bike_path: null,
  road_bike: null,
  gravel_bike: null,
  ebike: null,
  dirt_bike: 'MOTORIZED',
  ohv: null,
  edirt_bike: null,
  snowmobile: 'WINTER',
};

export default function FloatingControls({ activeFilters, onToggle, mapRef }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filterOpen]);

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!mapRef.current) return;
        mapRef.current.panTo({ lat: coords.latitude, lng: coords.longitude });
        mapRef.current.setZoom(14);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function toggleAll() {
    const allOn = DISPLAY_KEYS.every(k => activeFilters[k]);
    const next = !allOn;
    DISPLAY_KEYS.forEach(k => { if (activeFilters[k] !== next) onToggle(k); });
  }

  const allOn = DISPLAY_KEYS.every(k => activeFilters[k]);
  const anyOn = DISPLAY_KEYS.some(k => activeFilters[k]);

  return (
    <div className="floating-controls">

      {/* Locate Me */}
      <button
        className={`fc-btn${locating ? ' fc-btn-spin' : ''}`}
        onClick={handleLocate}
        aria-label="Locate me"
        title="Center on my location"
      >
        {locating ? (
          <span className="fc-spinner" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
        )}
      </button>

      {/* Filter */}
      <div className="fc-filter-wrap" ref={dropdownRef}>
        <button
          className={`fc-btn${filterOpen ? ' fc-btn-on' : ''}${!anyOn ? ' fc-btn-dim' : ''}`}
          onClick={() => setFilterOpen(o => !o)}
          aria-label="Trail filters"
          title="Trail filters"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
        </button>

        {filterOpen && (
          <div className="fc-dropdown">
            <div className="fc-dropdown-header">
              <span className="fc-dropdown-title">Trail Types</span>
              <button className="fc-toggle-all" onClick={toggleAll}>
                {allOn ? 'Hide All' : 'Show All'}
              </button>
            </div>
            <div className="fc-list">
              {DISPLAY_KEYS.map(key => {
                const cfg = ACTIVITY_CONFIG[key];
                if (!cfg) return null;
                const active = !!activeFilters[key];
                const section = SECTION_LABELS[key];
                return (
                  <div key={key}>
                    {section && <div className="fc-section">{section}</div>}
                    <button
                      className={`fc-item${active ? ' active' : ''}`}
                      style={{ '--dot': cfg.color }}
                      onClick={() => onToggle(key)}
                    >
                      <span className="fc-dot" />
                      <span className="fc-label">{cfg.label}</span>
                      {active && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
