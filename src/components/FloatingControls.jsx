import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { ACTIVITY_CONFIG } from '../config';

const DISPLAY_KEYS = [
  'dirt_bike', 'ohv', 'edirt_bike',
  'hiking', 'mountain_bike', 'road_bike', 'gravel_bike',
  'ebike', 'horse', 'snowmobile',
];

const SECTION_LABELS = {
  dirt_bike: 'MOTORIZED',
  ohv: null,
  edirt_bike: null,
  hiking: 'OTHER',
  mountain_bike: 'CYCLING',
  road_bike: null,
  gravel_bike: null,
  ebike: null,
  horse: 'OTHER',
  snowmobile: 'WINTER',
};

const SHOP_QUERIES = ['bicycle shop', 'motorcycle shop', 'snowmobile dealer'];

function SidebarContent({ activeFilters, onToggle, singletrackOnly, onToggleSingletrack, onClose, showClose }) {
  const allOn = DISPLAY_KEYS.every(k => activeFilters[k]);

  function toggleAll() {
    const next = !allOn;
    DISPLAY_KEYS.forEach(k => { if (activeFilters[k] !== next) onToggle(k); });
  }

  return (
    <>
      <div className="fc-sidebar-header">
        <span className="fc-sidebar-title">Trail Types</span>
        {showClose && (
          <button className="fc-sidebar-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>
            </svg>
          </button>
        )}
      </div>
      <div className="fc-sidebar-actions">
        <button className="fc-toggle-all" onClick={toggleAll}>{allOn ? 'Hide All' : 'Show All'}</button>
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
              {key === 'dirt_bike' && (
                <button
                  className={`fc-item fc-sub-toggle${singletrackOnly ? ' active' : ''}`}
                  onClick={onToggleSingletrack}
                >
                  <span className="fc-sub-dash">–</span>
                  <span className="fc-label">Singletrack Only</span>
                  {singletrackOnly && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function FloatingControls({ activeFilters, onToggle, singletrackOnly, onToggleSingletrack, mapRef }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [shopsActive, setShopsActive] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(false);
  const shopMarkersRef = useRef([]);
  const [campActive, setCampActive] = useState(false);
  const [campLoading, setCampLoading] = useState(false);
  const campMarkersRef = useRef([]);
  const placesLib = useMapsLibrary('places');

  const anyOn = DISPLAY_KEYS.some(k => activeFilters[k]);
  const allOn = DISPLAY_KEYS.every(k => activeFilters[k]);
  const activeCount = DISPLAY_KEYS.filter(k => activeFilters[k]).length;

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e) { if (e.key === 'Escape') setMobileOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

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

  function clearShopMarkers() {
    shopMarkersRef.current.forEach(m => m.setMap(null));
    shopMarkersRef.current = [];
  }

  useEffect(() => () => clearShopMarkers(), []);

  function clearCampMarkers() {
    campMarkersRef.current.forEach(m => m.setMap(null));
    campMarkersRef.current = [];
  }

  useEffect(() => () => clearCampMarkers(), []);

  function handleCamp() {
    if (campActive) { clearCampMarkers(); setCampActive(false); return; }
    if (!placesLib || !mapRef.current) return;
    setCampLoading(true);
    const map = mapRef.current;
    const center = map.getCenter();
    const service = new placesLib.PlacesService(map);
    const queries = ['campground', 'rv park', 'camping'];
    let pending = queries.length;
    const all = [];

    queries.forEach(query => {
      service.textSearch({ location: center, radius: 80467, query }, (results, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && results) all.push(...results.slice(0, 8));
        if (--pending === 0) {
          setCampLoading(false);
          if (all.length === 0) return;
          setCampActive(true);
          const seen = new Set();
          all.forEach(place => {
            if (seen.has(place.place_id) || !place.geometry?.location) return;
            seen.add(place.place_id);
            const marker = new google.maps.Marker({
              position: place.geometry.location,
              map,
              icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#22c55e', fillOpacity: 0.92, strokeColor: '#fff', strokeWeight: 2 },
              title: place.name,
              zIndex: 200,
            });
            marker.addListener('click', () => {
              new google.maps.InfoWindow({
                content: `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;padding:12px 14px;min-width:180px;max-width:260px">
                  <div style="font-size:13px;font-weight:700;color:#e8edf5;margin-bottom:4px">${place.name}</div>
                  <div style="font-size:11px;color:#8a9bb0;line-height:1.4;margin-bottom:6px">${place.vicinity || ''}</div>
                  ${place.rating ? `<div style="font-size:11px;color:#22c55e;margin-bottom:6px">${place.rating}★ ${place.user_ratings_total ? ' (' + place.user_ratings_total + ' reviews)' : ''}</div>` : ''}
                  <a href="https://www.google.com/maps/place/?q=place_id:${place.place_id}" target="_blank" style="font-size:11px;color:#22c55e;text-decoration:none">View &amp; Book →</a>
                </div>`,
              }).open(map, marker);
            });
            campMarkersRef.current.push(marker);
          });
        }
      });
    });
  }

  function handleShops() {
    if (shopsActive) { clearShopMarkers(); setShopsActive(false); return; }
    if (!placesLib || !mapRef.current) return;
    setShopsLoading(true);
    const map = mapRef.current;
    const center = map.getCenter();
    const service = new placesLib.PlacesService(map);
    let pending = SHOP_QUERIES.length;
    const all = [];
    SHOP_QUERIES.forEach(query => {
      service.textSearch({ location: center, radius: 80467, query }, (results, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && results) all.push(...results.slice(0, 5));
        if (--pending === 0) {
          setShopsLoading(false);
          if (all.length === 0) return;
          setShopsActive(true);
          const seen = new Set();
          all.forEach(place => {
            if (seen.has(place.place_id) || !place.geometry?.location) return;
            seen.add(place.place_id);
            const marker = new google.maps.Marker({
              position: place.geometry.location,
              map,
              icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#e67e22', fillOpacity: 0.92, strokeColor: '#fff', strokeWeight: 2 },
              title: place.name,
              zIndex: 200,
            });
            marker.addListener('click', () => {
              new google.maps.InfoWindow({
                content: `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;padding:10px 12px;min-width:160px;max-width:220px">
                  <div style="font-size:13px;font-weight:700;color:#e8edf5;margin-bottom:4px">${place.name}</div>
                  <div style="font-size:11px;color:#8a9bb0;line-height:1.4">${place.vicinity || ''}</div>
                  ${place.rating ? `<div style="font-size:11px;color:#e67e22;margin-top:5px">${place.rating}★ ${place.user_ratings_total ? `(${place.user_ratings_total})` : ''}</div>` : ''}
                </div>`,
              }).open(map, marker);
            });
            shopMarkersRef.current.push(marker);
          });
        }
      });
    });
  }

  return (
    <>
      {/* Desktop: permanent sidebar */}
      <aside className="fc-sidebar fc-sidebar-desktop">
        <SidebarContent
          activeFilters={activeFilters}
          onToggle={onToggle}
          singletrackOnly={singletrackOnly}
          onToggleSingletrack={onToggleSingletrack}
          onClose={() => {}}
          showClose={false}
        />
      </aside>

      {/* Floating buttons */}
      <div className="floating-controls">
        <button className={`fc-btn${locating ? ' fc-btn-spin' : ''}`} onClick={handleLocate} aria-label="Locate me">
          {locating ? <span className="fc-spinner" /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          )}
        </button>

        <button className={`fc-btn${shopsActive ? ' fc-btn-on' : ''}${shopsLoading ? ' fc-btn-spin' : ''}`} onClick={handleShops} aria-label="Nearby shops">
          {shopsLoading ? <span className="fc-spinner" /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l1.5-5h15L21 9"/>
              <path d="M3 9h18v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z"/>
              <path d="M5 12v8h14v-8"/>
              <path d="M10 20v-5h4v5"/>
            </svg>
          )}
        </button>

        {/* Campgrounds button */}
        <button
          className={`fc-btn${campActive ? ' fc-btn-on' : ''}${campLoading ? ' fc-btn-spin' : ''}`}
          onClick={handleCamp}
          aria-label="Campgrounds"
          title="Find campgrounds & camping spots"
        >
          {campLoading ? <span className="fc-spinner" /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l4-8 4 5 3-3 4 6"/>
              <path d="M3 20h18"/>
            </svg>
          )}
        </button>

        {/* Mobile-only filter button */}
        <button
          className={`fc-btn fc-mobile-only${mobileOpen ? ' fc-btn-on' : ''}${!anyOn ? ' fc-btn-dim' : ''}`}
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Trail filters"
          style={{ position: 'relative' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          {anyOn && !allOn && (
            <span className="fc-badge">{activeCount}</span>
          )}
        </button>
      </div>

      {/* Mobile overlay — portalled to body */}
      {mobileOpen && createPortal(
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'stretch',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '80vw', maxWidth: '300px',
              height: '100%',
              background: '#0f1117',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
              zIndex: 100000,
            }}
          >
            <SidebarContent
              activeFilters={activeFilters}
              onToggle={onToggle}
              singletrackOnly={singletrackOnly}
              onToggleSingletrack={onToggleSingletrack}
              onClose={() => setMobileOpen(false)}
              showClose={true}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
