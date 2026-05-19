import React from 'react';

const ACTIVITY_KEYS = ['hiking', 'mountain_bike', 'ebike', 'bike_path', 'dirt_bike', 'edirt_bike', 'ohv', 'snowmobile'];

const ACTIVITY_CONFIG = {
  hiking: { color: '#22c55e', label: 'Hiking' },
  mountain_bike: { color: '#3b82f6', label: 'MTB' },
  ebike: { color: '#a855f7', label: 'E-Bike', note: 'Class 1/2' },
  bike_path: { color: '#06b6d4', label: 'Bike Path', note: 'Paved' },
  dirt_bike: { color: '#f97316', label: 'Dirt Bike' },
  edirt_bike: { color: '#d946ef', label: 'E-Dirt Bike', note: 'Surron/Segway' },
  ohv: { color: '#eab308', label: 'OHV / Side-by-Side' },
  snowmobile: { color: '#14b8a6', label: 'Snowmobile' }
};

const SECTION_LABELS = {
  hiking: null,
  mountain_bike: 'CYCLING',
  ebike: null,
  bike_path: null,
  dirt_bike: 'MOTORIZED',
  edirt_bike: null,
  ohv: null,
  snowmobile: 'WINTER',
};

export default function ActivityFilter({ activeFilters, onToggle }) {
  const allOn = ACTIVITY_KEYS.every(k => activeFilters[k]);

  function toggleAll() {
    const targetState = !allOn;
    ACTIVITY_KEYS.forEach(k => {
      if (activeFilters[k] !== targetState) onToggle(k);
    });
  }

  return (
    <div className="activity-filter">
      <div className="filter-header">
        <span className="filter-title">TRAIL TYPES</span>
        <button className="filter-all-btn" onClick={toggleAll}>
          {allOn ? 'Hide All' : 'Show All'}
        </button>
      </div>

      <div className="filter-list">
        {ACTIVITY_KEYS.map(key => {
          const config = ACTIVITY_CONFIG[key];
          const active = activeFilters[key];
          const sectionLabel = SECTION_LABELS[key];

          return (
            <div key={key}>
              {sectionLabel && (
                <div className="filter-section-label">{sectionLabel}</div>
              )}
              <button
                className={`filter-item ${active ? 'active' : 'inactive'}`}
                style={{ '--activity-color': config.color }}
                onClick={() => onToggle(key)}
                aria-pressed={active}
                title={config.note || config.label}
              >
                <span className="filter-label">
                  {config.label}
                </span>
                <span className="filter-toggle">{active ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
