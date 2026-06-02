import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { ACTIVITY_CONFIG } from '../config';
import { useAuth } from '../contexts/AuthContext';

const DISPLAY_KEYS = [
  'dirt_bike', 'ohv',
  'hiking', 'mountain_bike', 'road_bike', 'gravel_bike',
  'horse', 'snowmobile',
];

const SHOP_QUERIES = ['bicycle shop', 'motorcycle shop', 'snowmobile dealer'];

const RIDB_URL = 'https://ridb.recreation.gov/api/v1/facilities';

// Fetch official federal campgrounds from the Recreation.gov RIDB API near a
// center point. Always resolves to an array (never throws): on any failure
// (network error, non-200, malformed body) it logs and returns [] so the map
// stays clean and the app never crashes.
async function fetchRecGovCampgrounds(centerLat, centerLng) {
  const apikey = import.meta.env.VITE_RECGOV_API_KEY;
  if (!apikey) {
    console.warn('[RecGov] VITE_RECGOV_API_KEY is not set — skipping campground fetch.');
    return [];
  }
  const params = new URLSearchParams({
    activity: 'CAMPING',
    state: 'CO',
    limit: '500',
    latitude: String(centerLat),
    longitude: String(centerLng),
    radius: '50',
  });
  try {
    const res = await fetch(`${RIDB_URL}?${params}`, { headers: { apikey } });
    if (!res.ok) {
      console.error(`[RecGov] RIDB request failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    const records = Array.isArray(data?.RECDATA) ? data.RECDATA : [];
    return records
      .map(f => ({
        id: f.FacilityID,
        name: f.FacilityName,
        lat: Number(f.FacilityLatitude),
        lng: Number(f.FacilityLongitude),
        type: f.FacilityTypeDescription || '',
        description: f.FacilityDescription || '',
        phone: f.FacilityPhone || '',
        email: f.FacilityEmail || '',
        reservationUrl: f.FacilityReservationURL || '',
        directions: f.FacilityDirections || '',
      }))
      // Drop anything without a usable coordinate (missing or zero).
      .filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng) && f.lat !== 0 && f.lng !== 0);
  } catch (err) {
    console.error('[RecGov] RIDB fetch error:', err);
    return [];
  }
}

// Strip HTML tags from RIDB descriptions, collapse whitespace, truncate.
function stripAndTruncate(html, max = 150) {
  if (!html) return '';
  const text = String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// Minimal HTML escaping for text injected into the popup markup.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Great-circle distance in miles between two lat/lng points (haversine).
function milesBetween(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function SidebarContent({
  activeFilters, onToggle, findSingletrack, onToggleSingletrack, onShowAllTrails,
  onClose, showClose,
  campActive, onToggleCamp, campLoading,
  shopsActive, onToggleShops,
  routeMode, onToggleRoute, routeTrails,
  onClearRoute, onRemoveTrail, onOpenInMaps, onShareRoute,
  user, onLogRide, onViewRides, onSignIn,
  showRideHistory, onToggleRideHistory,
}) {
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
        {/* My Rides */}
        <div className="fc-section">MY RIDES</div>
        {user ? (
          <div className="fc-rides">
            <button className="fc-ride-log" onClick={onLogRide}>Log a Ride</button>
            <button className="fc-ride-view" onClick={onViewRides}>View My Rides</button>
            <button
              className={`fc-item fc-ride-history${showRideHistory ? ' active' : ''}`}
              style={{ '--dot': '#06b6d4' }}
              onClick={onToggleRideHistory}
              role="switch"
              aria-checked={!!showRideHistory}
            >
              <span className="fc-dot" />
              <span className="fc-label">Show ride history on map</span>
              {showRideHistory && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <button className="fc-ride-signin" onClick={onSignIn}>Sign in to track rides</button>
        )}

        <div className="fc-section">TRAIL TYPES</div>
        {DISPLAY_KEYS.map(key => {
          const cfg = ACTIVITY_CONFIG[key];
          if (!cfg) return null;
          const active = !!activeFilters[key];
          return (
            <div key={key}>
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
                <button className={`fc-item fc-sub-toggle${findSingletrack ? ' active' : ''}`} onClick={onToggleSingletrack}>
                  <div className="fc-singletrack-swatch" style={{ width: '18px', height: '3px', background: '#a3e635', borderRadius: '1.5px', flexShrink: 0, marginRight: '2px' }} />
                  <span className="fc-label">Find Singletrack</span>
                  {findSingletrack && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {/* Route Planning */}
        <div className="fc-section">ROUTE PLANNING</div>
        <button className={`fc-item${routeMode ? ' active' : ''}`} style={{ '--dot': '#e67e22' }} onClick={onToggleRoute}>
          <span className="fc-dot" />
          <span className="fc-label">{routeMode ? 'Planning Mode ON' : 'Plan a Route'}</span>
          {routeMode && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>

        {routeMode && (
          <div className="fc-route-panel">
            {findSingletrack && (
              <div className="fc-route-note">
                Connector trails are hidden.{' '}
                <button className="fc-route-note-link" onClick={onShowAllTrails}>Show all trails</button>
              </div>
            )}
            {routeTrails.length === 0 ? (
              <div className="fc-route-empty">Tap trails on the map to add them</div>
            ) : (
              <>
                <div className="fc-route-list">
                  {routeTrails.map((t, i) => (
                    <div key={i} className="fc-route-item">
                      <span className="fc-route-num">{i + 1}</span>
                      <span className="fc-route-name">{t.name || 'Unnamed'}</span>
                      <span className="fc-route-dist">{t.miles ? t.miles.toFixed(1) + 'mi' : ''}</span>
                      <button className="fc-route-remove" onClick={() => onRemoveTrail(i)}>×</button>
                    </div>
                  ))}
                </div>
                <div className="fc-route-total">
                  Total: {routeTrails.reduce((s, t) => s + (t.miles || 0), 0).toFixed(1)} miles
                </div>
                <div className="fc-route-actions">
                  <button className="fc-route-btn" onClick={onOpenInMaps}>Open in Maps</button>
                  <button className="fc-route-btn fc-route-btn-share" onClick={onShareRoute}>Share</button>
                </div>
                <button className="fc-route-clear" onClick={onClearRoute}>Clear Route</button>
              </>
            )}
          </div>
        )}

        {/* Nearby */}
        <div className="fc-section">NEARBY</div>
        <button className={`fc-item${campActive ? ' active' : ''}`} style={{ '--dot': '#22c55e' }} onClick={onToggleCamp}>
          <span className="fc-dot" />
          <span className="fc-label">{campLoading ? 'Loading...' : 'Campgrounds'}</span>
          {campActive && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
        <button className={`fc-item${shopsActive ? ' active' : ''}`} style={{ '--dot': '#e67e22' }} onClick={onToggleShops}>
          <span className="fc-dot" />
          <span className="fc-label">Nearby Shops</span>
          {shopsActive && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="fc-check"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      </div>
    </>
  );
}

export default function FloatingControls({ activeFilters, onToggle, findSingletrack, onToggleSingletrack, onShowAllTrails, mapRef, externalCampActive, onCampChange, externalShopsActive, onShopsChange, onRouteModeChange, routeTrails: externalRouteTrails, onRouteTrailsChange, onLogRide, onViewRides, onSignIn, showRideHistory, onToggleRideHistory }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [shopsActive, setShopsActive] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(false);
  const shopMarkersRef = useRef([]);
  const userDotRef = useRef(null);
  const [campActive, setCampActiveInternal] = useState(false);
  const [campLoading, setCampLoading] = useState(false);
  const campMarkersRef = useRef([]);
  const campLastCoordsRef = useRef(null);   // last fetched {lat, lng}
  const campDebounceRef = useRef(null);     // debounce timer for map moves
  const campMoveListenerRef = useRef(null); // google maps center_changed listener
  const campReqIdRef = useRef(0);           // guard against stale in-flight responses
  const [routeMode, setRouteMode] = useState(false);
  const [routeTrailsInternal, setRouteTrailsInternal] = useState([]);
  const routeTrails = externalRouteTrails ?? routeTrailsInternal;
  function setRouteTrails(fn) {
    const next = typeof fn === "function" ? fn(routeTrails) : fn;
    setRouteTrailsInternal(next);
    if (onRouteTrailsChange) onRouteTrailsChange(next);
  }
  const placesLib = useMapsLibrary('places');

  const anyOn = DISPLAY_KEYS.some(k => activeFilters[k]);
  const allOn = DISPLAY_KEYS.every(k => activeFilters[k]);
  const activeCount = DISPLAY_KEYS.filter(k => activeFilters[k]).length;

  function setCampActive(val) {
    setCampActiveInternal(val);
    if (onCampChange) onCampChange(val);
  }

  useEffect(() => {
    if (externalCampActive && !campActive) handleCamp();
  }, [externalCampActive]);

  useEffect(() => {
    if (externalShopsActive && !shopsActive) handleShops();
  }, [externalShopsActive]);

  useEffect(() => {
    if (onRouteModeChange) onRouteModeChange(routeMode);
  }, [routeMode]);

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
        const map = mapRef.current;
        if (!map) return;
        const pos = { lat: coords.latitude, lng: coords.longitude };
        map.panTo(pos);
        map.setZoom(14);
        if (userDotRef.current) {
          userDotRef.current.dot.setMap(null);
          userDotRef.current.circle.setMap(null);
        }
        const dot = new google.maps.Marker({
          position: pos, map, zIndex: 99999,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8, fillColor: '#4285F4', fillOpacity: 1,
            strokeColor: '#ffffff', strokeWeight: 3,
          },
        });
        const circle = new google.maps.Circle({
          map, center: pos, radius: coords.accuracy || 30,
          strokeColor: '#4285F4', strokeOpacity: 0.4, strokeWeight: 1,
          fillColor: '#4285F4', fillOpacity: 0.12, zIndex: 99998,
        });
        userDotRef.current = { dot, circle };
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function clearShopMarkers() { shopMarkersRef.current.forEach(m => m.setMap(null)); shopMarkersRef.current = []; }
  function clearCampMarkers() { campMarkersRef.current.forEach(m => m.setMap(null)); campMarkersRef.current = []; }
  function stopCampWatch() {
    if (campMoveListenerRef.current) { google.maps.event.removeListener(campMoveListenerRef.current); campMoveListenerRef.current = null; }
    if (campDebounceRef.current) { clearTimeout(campDebounceRef.current); campDebounceRef.current = null; }
  }
  useEffect(() => () => clearShopMarkers(), []);
  useEffect(() => () => { clearCampMarkers(); stopCampWatch(); }, []);

  // Build the dark-themed campground popup HTML (matches the trail popups).
  function campPopupContent(f) {
    const desc = stripAndTruncate(f.description, 150);
    const btn = 'display:inline-block;font-size:11px;font-weight:600;text-decoration:none;padding:6px 10px;border-radius:8px;text-align:center';
    const reserve = f.reservationUrl
      ? `<a href="${escapeHtml(f.reservationUrl)}" target="_blank" rel="noopener noreferrer" style="${btn};background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.4);color:#22c55e">Reserve on Recreation.gov</a>`
      : '';
    const directions = `<a href="https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}" target="_blank" rel="noopener noreferrer" style="${btn};background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#c7d0dd">Get Directions</a>`;
    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;padding:12px 14px;min-width:200px;max-width:280px">
      <div style="font-size:14px;font-weight:700;color:#e8edf5;margin-bottom:2px;line-height:1.3">${escapeHtml(f.name || 'Campground')}</div>
      ${f.type ? `<div style="font-size:10px;color:#22c55e;font-weight:600;letter-spacing:0.5px;margin-bottom:6px">${escapeHtml(f.type)}</div>` : ''}
      ${desc ? `<div style="font-size:11px;line-height:1.45;color:#c7d0dd;margin-bottom:8px">${escapeHtml(desc)}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px">${reserve}${directions}</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.25);margin-top:8px">Data: Recreation.gov</div>
    </div>`;
  }

  // Fetch + render campgrounds for the current map center. Skips the refetch
  // when the center hasn't moved more than ~5 miles (unless `force`). Resolves
  // quietly on any error so the map just stays clean.
  async function loadCampgrounds(force) {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    if (!c) return;
    const lat = c.lat();
    const lng = c.lng();
    const last = campLastCoordsRef.current;
    if (!force && last && milesBetween(lat, lng, last.lat, last.lng) < 5) return;
    campLastCoordsRef.current = { lat, lng };

    const myReq = ++campReqIdRef.current;
    setCampLoading(true);
    const facilities = await fetchRecGovCampgrounds(lat, lng);
    setCampLoading(false);
    // Ignore stale responses from earlier pans, or if the layer was turned off.
    if (myReq !== campReqIdRef.current) return;

    clearCampMarkers();
    const infoWindow = new google.maps.InfoWindow();
    facilities.forEach(f => {
      const marker = new google.maps.Marker({
        position: { lat: f.lat, lng: f.lng }, map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#22c55e', fillOpacity: 0.92, strokeColor: '#fff', strokeWeight: 2 },
        title: f.name, zIndex: 200,
      });
      marker.addListener('click', () => {
        infoWindow.setContent(campPopupContent(f));
        infoWindow.open(map, marker);
      });
      campMarkersRef.current.push(marker);
    });
  }

  function handleCamp() {
    if (campActive) {
      stopCampWatch();
      clearCampMarkers();
      campLastCoordsRef.current = null;
      campReqIdRef.current++; // invalidate any in-flight response
      setCampActive(false);
      return;
    }
    if (!mapRef.current) return;
    // Activate immediately so the toggle reflects state and the refetch watcher
    // attaches even before results arrive (empty results just leave a clean map).
    setCampActive(true);
    loadCampgrounds(true);
    // Refetch as the map center moves (debounced 500ms; the 5-mile check inside
    // loadCampgrounds avoids hammering the API on small pans).
    stopCampWatch();
    campMoveListenerRef.current = mapRef.current.addListener('center_changed', () => {
      if (campDebounceRef.current) clearTimeout(campDebounceRef.current);
      campDebounceRef.current = setTimeout(() => loadCampgrounds(false), 500);
    });
  }

  function handleShops() {
    if (shopsActive) { clearShopMarkers(); setShopsActive(false); if (onShopsChange) onShopsChange(false); return; }
    if (!placesLib || !mapRef.current) return;
    setShopsLoading(true);
    const map = mapRef.current;
    const center = map.getCenter();
    const service = new placesLib.PlacesService(map);
    let pending = SHOP_QUERIES.length;
    const all = [];
    SHOP_QUERIES.forEach(keyword => {
      service.nearbySearch({ location: center, radius: 40233, keyword }, (results, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && results) all.push(...results.slice(0, 5));
        if (--pending === 0) {
          setShopsLoading(false);
          if (all.length === 0) return;
          setShopsActive(true);
          if (onShopsChange) onShopsChange(true);
          const seen = new Set();
          all.forEach(place => {
            if (seen.has(place.place_id) || !place.geometry?.location) return;
            seen.add(place.place_id);
            const marker = new google.maps.Marker({
              position: place.geometry.location, map,
              icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#e67e22', fillOpacity: 0.92, strokeColor: '#fff', strokeWeight: 2 },
              title: place.name, zIndex: 200,
            });
            marker.addListener('click', () => {
              new google.maps.InfoWindow({
                content: `<div style="font-family:-apple-system,sans-serif;padding:10px 12px;min-width:160px;max-width:220px">
                  <div style="font-size:13px;font-weight:700;color:#e8edf5;margin-bottom:4px">${place.name}</div>
                  <div style="font-size:11px;color:#8a9bb0;line-height:1.4">${place.vicinity || ''}</div>
                  ${place.rating ? `<div style="font-size:11px;color:#e67e22;margin-top:5px">${place.rating}★ ${place.user_ratings_total ? '(' + place.user_ratings_total + ')' : ''}</div>` : ''}
                </div>`,
              }).open(map, marker);
            });
            shopMarkersRef.current.push(marker);
          });
        }
      });
    });
  }

  function handleRemoveTrail(i) { setRouteTrails(prev => prev.filter((_, idx) => idx !== i)); }
  function handleClearRoute() { setRouteTrails([]); }
  function handleOpenInMaps() {
    if (routeTrails.length === 0) return;
    const waypoints = routeTrails.map(t => t.lat && t.lng ? `${t.lat},${t.lng}` : t.name).filter(Boolean);
    const origin = waypoints[0];
    const dest = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(1, -1).join('|');
    window.open(`https://www.google.com/maps/dir/${origin}/${middle ? middle + '/' : ''}${dest}`, '_blank');
  }
  function handleShareRoute() {
    const url = `${window.location.origin}?route=${routeTrails.map(t => encodeURIComponent(t.name || '')).join(',')}`;
    if (navigator.share) {
      navigator.share({ title: 'RadCamp Route', text: 'Check out this route!', url });
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Route link copied!'));
    }
  }

  const sidebarProps = {
    activeFilters, onToggle, findSingletrack, onToggleSingletrack, onShowAllTrails,
    campActive, onToggleCamp: handleCamp, campLoading,
    shopsActive, onToggleShops: handleShops,
    routeMode, onToggleRoute: () => { const next = !routeMode; setRouteMode(next); if (onRouteModeChange) onRouteModeChange(next); },
    routeTrails, onClearRoute: handleClearRoute,
    onRemoveTrail: handleRemoveTrail,
    onOpenInMaps: handleOpenInMaps,
    onShareRoute: handleShareRoute,
    user,
    onLogRide: () => { setMobileOpen(false); onLogRide?.(); },
    onViewRides: () => { setMobileOpen(false); onViewRides?.(); },
    onSignIn: () => { setMobileOpen(false); onSignIn?.(); },
    showRideHistory, onToggleRideHistory,
  };

  return (
    <>
      <aside className="fc-sidebar fc-sidebar-desktop">
        <SidebarContent {...sidebarProps} onClose={() => {}} showClose={false} />
      </aside>

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

        <button className={`fc-btn fc-mobile-only${mobileOpen ? ' fc-btn-on' : ''}${!anyOn ? ' fc-btn-dim' : ''}`}
          onClick={() => setMobileOpen(o => !o)} aria-label="Trail filters" style={{ position: 'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          {anyOn && !allOn && <span className="fc-badge">{activeCount}</span>}
        </button>
      </div>

      {mobileOpen && createPortal(
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'stretch' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '48vw', maxWidth: '175px', height: '100%', background: '#0f1117', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 100000 }}>
            <SidebarContent {...sidebarProps} onClose={() => setMobileOpen(false)} showClose={true} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
