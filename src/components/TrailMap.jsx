import { useEffect, useRef, useState, useCallback } from 'react';
import { Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { ACTIVITY_CONFIG, ACTIVITY_KEYS, COTREX_URL, PAVED_SURFACES } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RIDE_PIN_COLORS, formatRideDate, signedUrlsFor, photoForPin, matchedPhotoForPin } from '../lib/rides';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const SURFACE_LABELS = {
  paved: 'Paved', concrete: 'Paved', boardwalk: 'Paved',
  dirt: 'Dirt', gravel: 'Gravel', unpaved: 'Unpaved',
  compacted: 'Compacted', fine_gravel: 'Gravel', dirt_road: 'Dirt Road', rock: 'Rock',
};

function getSurfaceLabel(surface) {
  if (!surface || !surface.trim()) return null;
  return SURFACE_LABELS[surface.toLowerCase().trim()] ?? surface;
}

function MapController({ onMapReady }) {
  const map = useMap();
  useEffect(() => { if (map) onMapReady(map); }, [map, onMapReady]);
  return null;
}

const COLORADO_CENTER = { lat: 39.0, lng: -105.5 };
const MIN_ZOOM_FOR_TRAILS = 9;
const LABEL_MIN_ZOOM = 12; // trail name labels appear only past this zoom level
const MAX_RECORDS = 2000;

// Per-trail-name cache of AI descriptions, keyed by trail name. Survives
// info-window open/close so we never pay for the same trail twice per session.
const aiDescCache = new Map();

// Midpoint (by point count) of the longest coordinate set, used to anchor labels.
function getLabelPosition(coordSets) {
  let longest = coordSets[0];
  for (const cs of coordSets) {
    if (cs && cs.length > (longest?.length || 0)) longest = cs;
  }
  if (!longest || longest.length === 0) return null;
  const [lng, lat] = longest[Math.floor(longest.length / 2)];
  return { lat, lng };
}

function getTrailActivities(props) {
  const acts = [];
  const surface = (props.surface || '').toLowerCase();
  const isPaved = PAVED_SURFACES.has(surface);
  const isTrail = props.type === 'Trail';
  const isRoad = props.type === 'Road';
  const isHighwayVehicle = props.highway_ve === 'yes';

  if (props.hiking === 'yes') acts.push('hiking');
  if (props.horse === 'yes') acts.push('horse');

  if (props.bike === 'yes') {
    if (isTrail) {
      acts.push('mountain_bike');
    } else if (isRoad && isPaved) {
      acts.push('road_bike');
    } else if (isRoad && !isHighwayVehicle) {
      acts.push('gravel_bike');
    } else if (isPaved) {
      acts.push('road_bike');
    } else {
      acts.push('mountain_bike');
    }
  }

  if (props.motorcycle === 'yes') {
    acts.push('dirt_bike');
  }

  if (props.atv === 'yes' || props.ohv_gt_50 === 'yes') acts.push('ohv');
  if (props.snowmobile === 'yes') acts.push('snowmobile');

  return acts;
}

function getTrailStyle(activity, props) {
  const cfg = ACTIVITY_CONFIG[activity];
  if (!cfg) return null;
  const isTrail = props.type === 'Trail';
  const isRoad = props.type === 'Road';
  const surface = (props.surface || '').toLowerCase();

  // Moto (dirt_bike) singletrack = bright lime dotted markers. This is ALWAYS
  // the look — it's the signature visual. ONLY the "Moto" activity gets the
  // lime treatment on dirt singletrack; every other activity (hiking, MTB,
  // etc.) renders the same trail as a normal solid colored line. The "Find
  // Singletrack" toggle does NOT change this styling — it only controls whether
  // non-singletrack trails are hidden (see TrailLayer visibility effect).
  if (activity === 'dirt_bike' && isTrail && surface === 'dirt') {
    return { color: '#a3e635', weight: 2.5, opacity: 0, dotted: true };
  }
  // Moto doubletrack/road = solid lighter red
  if (activity === 'dirt_bike' && isRoad) {
    return { color: '#f87171', weight: 2, opacity: 0.85 };
  }
  // UTV connecting roads = slightly heavier
  if (activity === 'ohv' && isRoad) {
    return { color: cfg.color, weight: 2.5, opacity: 0.85 };
  }

  // Everything else (incl. hiking/MTB on dirt singletrack): solid colored line.
  return { color: cfg.color, weight: cfg.weight, opacity: 0.85 };
}

function isSingletrack(props) {
  return props.type === 'Trail' && (props.surface || '').toLowerCase() === 'dirt';
}

// Build the polyline `icons` array for a given style. Returns [] (no symbols)
// for plain lines so it also works to CLEAR icons via setOptions when a trail
// switches from highlighted (dotted) to blended-in (solid).
function buildDashedIcon(style) {
  if (style.dotted) return [{
    icon: { path: 'M 0,-1.5 0,1.5', strokeColor: style.color, strokeOpacity: 1, strokeWeight: 4, fillOpacity: 0, scale: 2 },
    offset: '0', repeat: '5px',
  }];
  if (style.dashed) return [{
    icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 3 },
    offset: '0', repeat: '12px',
  }];
  return [];
}

async function fetchTrailsInBounds(bounds) {
  const geometry = JSON.stringify({
    xmin: bounds.west, ymin: bounds.south,
    xmax: bounds.east, ymax: bounds.north,
    spatialReference: { wkid: 4326 },
  });
  const params = new URLSearchParams({
    where: '1=1', geometry, geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects', inSR: '4326', outSR: '4326',
    outFields: 'name,hiking,bike,motorcycle,atv,ohv_gt_50,snowmobile,horse,surface,type,highway_ve,length_mi_,min_elevat,max_elevat,manager,dogs,url',
    f: 'geojson', resultRecordCount: MAX_RECORDS,
  });
  const res = await fetch(`${COTREX_URL}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return { features: data.features || [], exceeded: data.properties?.exceededTransferLimit === true };
}

function TrailLayer({ activeFilters, findSingletrack, onStatusChange, routeMode, onAddToRoute, onRemoveFromRoute, routeTrails }) {
  const map = useMap();
  const polylinesRef = useRef({});
  const activeFiltersRef = useRef(activeFilters);
  const findSingletrackRef = useRef(findSingletrack);
  const debounceRef = useRef(null);
  const activeInfoWindowRef = useRef(null);
  const activePolylinesRef = useRef([]);
  const routeModeRef = useRef(routeMode);
  const routePolylinesRef = useRef([]);
  const routeTrailsRef = useRef([]);
  const labelsRef = useRef([]); // [{ marker, activities }]
  useEffect(() => { routeModeRef.current = routeMode; }, [routeMode]);
  routeTrailsRef.current = routeTrails || [];

  // Show/hide trail-name labels based on current zoom and active filters.
  const refreshLabels = useCallback(() => {
    if (!map) return;
    const visibleZoom = map.getZoom() > LABEL_MIN_ZOOM;
    labelsRef.current.forEach(({ marker, activities }) => {
      const anyActive = activities.some(a => activeFiltersRef.current[a]);
      marker.setMap(visibleZoom && anyActive ? map : null);
    });
  }, [map]);
  // Clear highlights when route mode turns off
  useEffect(() => {
    if (!routeMode) {
      routePolylinesRef.current.forEach(({ polyline, origColor, origWeight, origOpacity }) => {
        polyline.setOptions({ strokeColor: origColor, strokeWeight: origWeight, strokeOpacity: origOpacity });
      });
      routePolylinesRef.current = [];
    }
  }, [routeMode]);

  useEffect(() => {
    activeFiltersRef.current = activeFilters;
    findSingletrackRef.current = findSingletrack;
  });

  // Visibility: respect the activity filters, and when "Find Singletrack" is
  // on, hide every non-singletrack polyline so only singletrack remains.
  // Styling never changes here — singletrack is always lime (see getTrailStyle).
  useEffect(() => {
    if (!map) return;
    ACTIVITY_KEYS.forEach(activity => {
      const visible = !!activeFilters[activity];
      (polylinesRef.current[activity] || []).forEach(p => {
        const show = visible && (!findSingletrack || p.__singletrack);
        p.setMap(show ? map : null);
      });
    });
    refreshLabels();
  }, [activeFilters, findSingletrack, map, refreshLabels]);

  // Close info window when clicking on map
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      activePolylinesRef.current.forEach(p => {
        p.setOptions({ strokeWeight: p.__origWeight, strokeOpacity: p.__origOpacity });
      });
      activePolylinesRef.current = [];
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  const loadTrails = useCallback(async () => {
    if (!map) return;
    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM_FOR_TRAILS) {
      ACTIVITY_KEYS.forEach(activity => {
        (polylinesRef.current[activity] || []).forEach(p => p.setMap(null));
        polylinesRef.current[activity] = [];
      });
      labelsRef.current.forEach(({ marker }) => marker.setMap(null));
      labelsRef.current = [];
      onStatusChange({ type: 'zoom', zoom });
      return;
    }
    const bounds = map.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    onStatusChange({ type: 'loading' });
    try {
      const { features, exceeded } = await fetchTrailsInBounds({
        north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng(),
      });
      ACTIVITY_KEYS.forEach(activity => {
        (polylinesRef.current[activity] || []).forEach(p => p.setMap(null));
        polylinesRef.current[activity] = [];
      });
      labelsRef.current.forEach(({ marker }) => marker.setMap(null));
      labelsRef.current = [];
      const labeledNames = new Set(); // one label per unique trail name per load

      features.forEach(feature => {
        const { geometry, properties } = feature;
        if (!geometry) return;
        const activities = getTrailActivities(properties);
        if (activities.length === 0) return;

        const coordSets = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates];
        const singletrack = isSingletrack(properties);

        // Trail-name label at the trail midpoint — only build past LABEL_MIN_ZOOM.
        const labelName = properties.name?.trim();
        if (zoom > LABEL_MIN_ZOOM && labelName && !labeledNames.has(labelName)) {
          const pos = getLabelPosition(coordSets);
          if (pos) {
            labeledNames.add(labelName);
            const anyActive = activities.some(a => activeFiltersRef.current[a]);
            const marker = new google.maps.Marker({
              position: pos,
              map: anyActive ? map : null,
              clickable: false,
              zIndex: 1000,
              icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0, strokeOpacity: 0, fillOpacity: 0 },
              label: {
                text: labelName,
                className: 'trail-label',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '600',
              },
            });
            labelsRef.current.push({ marker, activities });
          }
        }

        activities.forEach(activity => {
          const style = getTrailStyle(activity, properties);
          if (!style) return;
          const visible = !!activeFiltersRef.current[activity];

          const dashedIcon = buildDashedIcon(style);

          coordSets.forEach(coords => {
            const showPolyline = visible && (!findSingletrackRef.current || singletrack);
            const polyline = new google.maps.Polyline({
              path: coords.map(([lng, lat]) => ({ lat, lng })),
              strokeColor: style.color,
              strokeOpacity: style.opacity,
              strokeWeight: style.weight,
              icons: dashedIcon,
              map: showPolyline ? map : null,
              clickable: true,
            });
            polyline.__singletrack = singletrack;
            polyline.__origWeight = style.weight;
            polyline.__origOpacity = style.opacity;
            polyline.__properties = properties;
            polyline.__activities = activities;
            polyline.__color = style.color;

            polyline.addListener('click', e => {
              // Route planning mode
              if (routeModeRef.current) {
                const trailName = properties.name?.trim() || 'Unnamed Trail';
                const alreadyInRoute = routeTrailsRef.current.some(t => t.name === trailName);
                if (alreadyInRoute) {
                  // Remove from route - reset all polylines with this name
                  ACTIVITY_KEYS.forEach(act => {
                    (polylinesRef.current[act] || []).forEach(p => {
                      if (p.__properties?.name?.trim() === trailName) {
                        p.setOptions({ strokeColor: p.__color, strokeWeight: p.__origWeight, strokeOpacity: p.__origOpacity });
                      }
                    });
                  });
                  if (onRemoveFromRoute) onRemoveFromRoute(trailName);
                } else {
                  const trail = {
                    name: trailName,
                    miles: properties.length_mi_ || 0,
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                  };
                  if (onAddToRoute) onAddToRoute(trail);
                  polyline.setOptions({ strokeColor: '#ffffff', strokeWeight: (style.weight || 2) + 3, strokeOpacity: 1 });
                }
                return;
              }
              // Close previous
              if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
              activePolylinesRef.current.forEach(p => {
                p.setOptions({ strokeWeight: p.__origWeight, strokeOpacity: p.__origOpacity });
              });
              activePolylinesRef.current = [];

              // Highlight all polylines for this trail
              const trailName = properties.name?.trim();
              if (trailName) {
                ACTIVITY_KEYS.forEach(act => {
                  (polylinesRef.current[act] || []).forEach(p => {
                    if (p.__properties?.name?.trim() === trailName) {
                      p.setOptions({ strokeWeight: (p.__origWeight || 2) + 2, strokeOpacity: 1 });
                      activePolylinesRef.current.push(p);
                    }
                  });
                });
              } else {
                polyline.setOptions({ strokeWeight: style.weight + 2, strokeOpacity: 1 });
                activePolylinesRef.current.push(polyline);
              }

              const acts = activities.filter(a => ACTIVITY_CONFIG[a]);
              const isTrailType = properties.type === 'Trail';
              const isRoadType = properties.type === 'Road';
              const trailTypeLabel = isTrailType ? 'Singletrack' : isRoadType ? 'Doubletrack / Road' : null;
              const surfaceLabel = getSurfaceLabel(properties.surface);
              const lengthMi = properties.length_mi_ ? `${properties.length_mi_.toFixed(1)} mi` : null;
              const minElev = properties.min_elevat ? Math.round(properties.min_elevat * 3.28084) : null;
              const maxElev = properties.max_elevat ? Math.round(properties.max_elevat * 3.28084) : null;
              const elevRange = minElev && maxElev ? `${minElev.toLocaleString()}–${maxElev.toLocaleString()} ft` : null;
              const manager = properties.manager?.trim();
              const dogs = properties.dogs?.trim();
              const url = properties.url?.trim();

              const actRows = acts.map(a => {
                const c = ACTIVITY_CONFIG[a];
                return `<div style="display:flex;align-items:center;gap:6px;padding:1px 0">
                  <div style="width:6px;height:6px;border-radius:50%;background:${c.color};flex-shrink:0;margin-top:1px"></div>
                  <span style="font-size:11px;color:#8a9bb0">${c.label}</span>
                </div>`;
              }).join('');

              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              const thumbUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=240x130&maptype=hybrid&key=${MAPS_API_KEY}`;

              const displayName = properties.name?.trim() || 'Unnamed Trail';
              const aiKey = trailName || displayName;
              const aiTrailData = {
                name: displayName,
                activities: acts.map(a => ACTIVITY_CONFIG[a].label),
                surface: surfaceLabel,
                trailType: trailTypeLabel,
                lengthMi: properties.length_mi_ ? Number(properties.length_mi_.toFixed(1)) : null,
                minElevFt: minElev,
                maxElevFt: maxElev,
                manager,
                lat,
                lng,
              };
              const aiSection = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
                <button id="ai-desc-btn" style="display:flex;align-items:center;justify-content:center;gap:5px;width:100%;background:rgba(163,230,53,0.1);border:1px solid rgba(163,230,53,0.35);color:#a3e635;font-size:11px;font-weight:600;padding:6px 8px;border-radius:8px;cursor:pointer;font-family:inherit">✨ AI trail description</button>
                <div id="ai-desc-content" style="font-size:11px;line-height:1.45;color:#c7d0dd;margin-top:6px"></div>
              </div>`;

              const infoWindow = new google.maps.InfoWindow({
                content: `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;min-width:220px;max-width:240px;overflow:hidden;border-radius:10px">
                  <img src="${thumbUrl}" style="width:100%;height:130px;object-fit:cover;display:block;border-radius:10px 10px 0 0" />
                  <div style="padding:10px 12px 8px">
                    <div style="font-size:14px;font-weight:700;color:#e8edf5;margin-bottom:2px;line-height:1.3">${properties.name?.trim() || 'Unnamed Trail'}</div>
                    ${trailTypeLabel ? `<div style="font-size:10px;color:#a3e635;font-weight:600;letter-spacing:0.5px;margin-bottom:6px">${trailTypeLabel}</div>` : ''}
                    <div style="margin-bottom:6px">${actRows}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                      ${lengthMi ? `<span style="font-size:10px;background:rgba(255,255,255,0.07);color:#8a9bb0;padding:2px 7px;border-radius:10px">${lengthMi}</span>` : ''}
                      ${elevRange ? `<span style="font-size:10px;background:rgba(255,255,255,0.07);color:#8a9bb0;padding:2px 7px;border-radius:10px">${elevRange}</span>` : ''}
                      ${surfaceLabel ? `<span style="font-size:10px;background:rgba(255,255,255,0.07);color:#8a9bb0;padding:2px 7px;border-radius:10px">${surfaceLabel}</span>` : ''}
                      ${dogs && dogs !== 'no' ? `<span style="font-size:10px;background:rgba(255,255,255,0.07);color:#8a9bb0;padding:2px 7px;border-radius:10px">🐕 ${dogs}</span>` : ''}
                    </div>
                    ${manager ? `<div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.25)">${manager}</div>` : ''}
                    ${aiSection}
                    ${url && url.startsWith('http') ? `<a href="${url}" target="_blank" style="display:block;margin-top:6px;font-size:11px;color:#e67e22;text-decoration:none">More info →</a>` : ''}
                  </div>
                </div>`,
                position: e.latLng,
              });

              infoWindow.open(map);
              activeInfoWindowRef.current = infoWindow;

              // Wire the AI description button once the info-window DOM exists.
              google.maps.event.addListener(infoWindow, 'domready', () => {
                const btn = document.getElementById('ai-desc-btn');
                const contentEl = document.getElementById('ai-desc-content');
                if (!btn || !contentEl) return;

                const cached = aiDescCache.get(aiKey);
                if (cached) {
                  btn.style.display = 'none';
                  contentEl.textContent = cached;
                  return;
                }

                btn.onclick = async () => {
                  btn.disabled = true;
                  btn.style.opacity = '0.6';
                  btn.style.cursor = 'default';
                  btn.textContent = 'Generating…';
                  try {
                    const res = await fetch('/api/trail-description', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(aiTrailData),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    const desc = (data.description || '').trim();
                    if (!desc) throw new Error('empty response');
                    aiDescCache.set(aiKey, desc);
                    btn.style.display = 'none';
                    contentEl.textContent = desc; // textContent → no HTML injection
                  } catch (err) {
                    console.error('AI description error:', err);
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.textContent = '✨ AI trail description';
                    contentEl.textContent = 'Could not generate a description. Try again.';
                  }
                };
              });

              // Close on X click
              google.maps.event.addListener(infoWindow, 'closeclick', () => {
                activePolylinesRef.current.forEach(p => {
                  p.setOptions({ strokeWeight: p.__origWeight, strokeOpacity: p.__origOpacity });
                });
                activePolylinesRef.current = [];
                activeInfoWindowRef.current = null;
              });
            });

            if (!polylinesRef.current[activity]) polylinesRef.current[activity] = [];
            polylinesRef.current[activity].push(polyline);
          });
        });
      });
      // Re-highlight route trails after map pan/zoom
      const routeNames = new Set(routeTrailsRef.current.map(t => t.name));
      if (routeNames.size > 0) {
        ACTIVITY_KEYS.forEach(act => {
          (polylinesRef.current[act] || []).forEach(p => {
            if (routeNames.has(p.__properties?.name?.trim())) {
              p.setOptions({ strokeColor: '#ffffff', strokeWeight: (p.__origWeight || 2) + 3, strokeOpacity: 1 });
            }
          });
        });
      }
      onStatusChange({ type: 'loaded', count: features.length, exceeded });
    } catch (err) {
      console.error('Trail load error:', err);
      onStatusChange({ type: 'error' });
    }
  }, [map, onStatusChange]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadTrails, 400);
    });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadTrails, 600);
    return () => {
      google.maps.event.removeListener(listener);
      clearTimeout(debounceRef.current);
      ACTIVITY_KEYS.forEach(activity => {
        (polylinesRef.current[activity] || []).forEach(p => p.setMap(null));
      });
      labelsRef.current.forEach(({ marker }) => marker.setMap(null));
      labelsRef.current = [];
    };
  }, [map, loadTrails]);

  // Toggle label visibility instantly on zoom (no debounce / no refetch).
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('zoom_changed', refreshLabels);
    return () => google.maps.event.removeListener(listener);
  }, [map, refreshLabels]);

  return null;
}

// Minimal HTML escaping for text injected into the ride-history popup markup.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Session cache of Supabase signed URLs, keyed by storage_path, so panning the
// map never refetches a photo we've already resolved this session.
const ridePhotoUrlCache = new Map();

// google.maps.OverlayView can only be subclassed once the Maps JS API is
// loaded, so define the class lazily on first use (inside the layer effect).
let PhotoPinOverlay = null;
function getPhotoPinOverlayClass() {
  if (PhotoPinOverlay) return PhotoPinOverlay;
  PhotoPinOverlay = class extends google.maps.OverlayView {
    constructor(position, element) {
      super();
      this._position = position;
      this._element = element;
    }
    onAdd() {
      // overlayMouseTarget receives pointer events (so the pin is clickable).
      this.getPanes().overlayMouseTarget.appendChild(this._element);
    }
    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const p = proj.fromLatLngToDivPixel(this._position);
      if (p) {
        this._element.style.left = `${p.x}px`;
        this._element.style.top = `${p.y}px`;
      }
    }
    onRemove() {
      if (this._element.parentNode) this._element.parentNode.removeChild(this._element);
    }
  };
  return PhotoPinOverlay;
}

// Dark popup for a ride-history pin (matches the campground/shop popups). When
// the ride has a photo, it's shown full-width at the top with rounded corners.
// thumbUrl may be null while the signed URL resolves → shimmer placeholder.
function ridePopupContent(ride, pin, color, { hasPhoto, thumbUrl }) {
  const label = pin?.label ? escapeHtml(pin.label) : '';
  const area = ride.area_name ? escapeHtml(ride.area_name) : '';
  const fromPhoto = pin?.source === 'photo_exif';
  const thumb = !hasPhoto ? '' : (
    `<div id="ride-pin-thumb" data-ride-action="view" style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;cursor:pointer;background:rgba(255,255,255,0.06);border-radius:10px 10px 0 0">` +
      (thumbUrl
        ? `<img src="${escapeHtml(thumbUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
        : `<div class="ride-popup-shimmer" style="width:100%;height:100%"></div>`) +
    `</div>`
  );
  return (
    `<div id="ride-pin-popup" style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;width:200px;max-width:230px">` +
      thumb +
      `<div style="padding:10px 12px">` +
        `<div style="display:flex;align-items:center;gap:7px;margin-bottom:2px">` +
          `<span style="width:9px;height:9px;border-radius:50%;background:${color};border:1.5px solid #fff;display:inline-block;flex-shrink:0"></span>` +
          `<span style="font-size:13px;font-weight:700;color:#e8edf5;line-height:1.3">${escapeHtml(ride.title || 'Ride')}</span>` +
        `</div>` +
        `<div style="font-size:11px;color:#8a9bb0">${escapeHtml(formatRideDate(ride.ride_date))}</div>` +
        (area ? `<div style="font-size:11px;color:#c7d0dd;margin-top:2px">${area}</div>` : '') +
        (label ? `<div style="font-size:11px;color:#c7d0dd;margin-top:3px">${label}</div>` : '') +
        (fromPhoto ? `<div style="font-size:10px;color:#84cc16;font-weight:600;margin-top:3px">📷 Pin from photo</div>` : '') +
        `<button data-ride-action="view" style="margin-top:9px;width:100%;background:#65a30d;color:#fff;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">View Ride</button>` +
      `</div>` +
    `</div>`
  );
}

// Layers the signed-in user's logged-ride pins onto the main map. Pins that were
// auto-extracted from a photo (source 'photo_exif') render as small circular
// photo thumbnails (color-ringed per ride); manual pins — and photo pins whose
// image fails to load — render as colored dots. Built on a custom HTML
// OverlayView (no mapId needed, so classic markers/controls stay intact).
function RideHistoryLayer({ enabled, refreshKey, onViewRide }) {
  const map = useMap();
  const { user } = useAuth();
  const entriesRef = useRef([]);          // { ride, pin, color, mapPhoto, popupPhoto, position, el, overlay, state }
  const infoWindowRef = useRef(null);
  const idleListenerRef = useRef(null);
  const reqIdRef = useRef(0);
  const onViewRideRef = useRef(onViewRide);
  useEffect(() => { onViewRideRef.current = onViewRide; }, [onViewRide]);

  function clearOverlays() {
    entriesRef.current.forEach(e => { try { e.overlay.setMap(null); } catch { /* noop */ } });
    entriesRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();
    if (idleListenerRef.current) {
      google.maps.event.removeListener(idleListenerRef.current);
      idleListenerRef.current = null;
    }
  }

  // Swap a dot pin to its circular photo once the image is confirmed loadable.
  function applyPhoto(entry, url) {
    const img = new Image();
    img.onload = () => {
      entry.state = 'photo';
      entry.el.classList.remove('ride-map-pin-dot');
      entry.el.classList.add('ride-map-pin-photo');
      entry.el.style.backgroundImage = `url("${url}")`;
    };
    img.onerror = () => { entry.state = 'failed'; }; // stays a dot
    img.src = url;
  }

  // Lazy-load thumbnails for photo pins currently in view (cached per session).
  function loadVisibleThumbs() {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const toFetch = [];
    for (const entry of entriesRef.current) {
      if (entry.state !== 'dot' || !entry.mapPhoto) continue;
      if (!bounds.contains(entry.position)) continue;
      const cached = ridePhotoUrlCache.get(entry.mapPhoto.storage_path);
      if (cached) { applyPhoto(entry, cached); continue; }
      entry.state = 'loading';
      toFetch.push(entry);
    }
    if (!toFetch.length) return;
    const paths = [...new Set(toFetch.map(e => e.mapPhoto.storage_path))];
    signedUrlsFor(paths).then(urlMap => {
      for (const entry of toFetch) {
        const url = urlMap[entry.mapPhoto.storage_path];
        if (url) { ridePhotoUrlCache.set(entry.mapPhoto.storage_path, url); applyPhoto(entry, url); }
        else entry.state = 'failed';
      }
    }).catch(() => { toFetch.forEach(e => { e.state = 'dot'; }); });
  }

  // Open the dark info window for a pin, wiring up the photo + View Ride taps.
  function openPopup(entry) {
    const iw = infoWindowRef.current;
    if (!iw) return;
    const photo = entry.popupPhoto;
    const cachedUrl = photo ? ridePhotoUrlCache.get(photo.storage_path) : null;
    iw.setContent(ridePopupContent(entry.ride, entry.pin, entry.color, { hasPhoto: !!photo, thumbUrl: cachedUrl || null }));
    iw.setPosition(entry.position);
    iw.open(map);
    google.maps.event.addListenerOnce(iw, 'domready', () => {
      const root = document.getElementById('ride-pin-popup');
      if (!root) return;
      root.querySelectorAll('[data-ride-action="view"]').forEach(node => {
        node.addEventListener('click', () => { iw.close(); onViewRideRef.current?.(entry.ride.id); });
      });
      // Resolve the popup's larger photo if we don't already have it cached.
      if (photo && !ridePhotoUrlCache.get(photo.storage_path)) {
        signedUrlsFor([photo.storage_path]).then(urlMap => {
          const url = urlMap[photo.storage_path];
          if (!url) return;
          ridePhotoUrlCache.set(photo.storage_path, url);
          const thumb = document.getElementById('ride-pin-thumb');
          if (thumb) thumb.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`;
        }).catch(() => { /* leave shimmer */ });
      }
    });
  }

  useEffect(() => {
    if (!map) return;
    // Invalidate any in-flight fetch, then clear when off / logged out.
    const myReq = ++reqIdRef.current;
    if (!enabled || !user || !supabase) { clearOverlays(); return; }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('id,title,ride_date,area_name,pins,ride_photos(id,storage_path,caption)')
          .eq('user_id', user.id)
          .order('ride_date', { ascending: false });
        if (error) throw error;
        // Ignore stale responses (toggled off, signed out, or a newer fetch).
        if (myReq !== reqIdRef.current) return;

        clearOverlays();
        if (!infoWindowRef.current) infoWindowRef.current = new google.maps.InfoWindow();
        const OverlayClass = getPhotoPinOverlayClass();

        (data || []).forEach((ride, rideIdx) => {
          const color = RIDE_PIN_COLORS[rideIdx % RIDE_PIN_COLORS.length];
          const photos = ride.ride_photos || [];
          (Array.isArray(ride.pins) ? ride.pins : []).forEach(pin => {
            if (!Number.isFinite(pin?.lat) || !Number.isFinite(pin?.lng)) return;
            const position = new google.maps.LatLng(pin.lat, pin.lng);
            const mapPhoto = matchedPhotoForPin(photos, pin);   // only photo_exif pins get a thumbnail
            const popupPhoto = photoForPin(photos, pin);         // specific photo, else ride's first

            const el = document.createElement('div');
            el.className = 'ride-map-pin ride-map-pin-dot';
            el.style.setProperty('--ride-color', color);
            el.title = ride.title || 'Ride';

            const overlay = new OverlayClass(position, el);
            const entry = {
              ride, pin, color, mapPhoto, popupPhoto, position, el, overlay,
              state: mapPhoto ? 'dot' : 'plain', // 'plain' dots never upgrade
            };
            el.addEventListener('click', () => openPopup(entry));
            overlay.setMap(map);
            entriesRef.current.push(entry);
          });
        });

        // Lazy-load thumbnails now and whenever the viewport settles.
        loadVisibleThumbs();
        idleListenerRef.current = map.addListener('idle', loadVisibleThumbs);
      } catch (err) {
        console.error('[RideHistory] load failed:', err);
      }
    })();
  }, [map, enabled, user, refreshKey]);

  // Remove overlays on unmount.
  useEffect(() => () => clearOverlays(), []);

  return null;
}

export default function TrailMap({ activeFilters, findSingletrack, onMapReady, routeMode, onAddToRoute, onRemoveFromRoute, routeTrails, showRideHistory, ridesRefresh, onViewRide }) {
  const [status, setStatus] = useState({ type: 'idle' });
  return (
    <div className="map-wrapper">
      <GoogleMap
        defaultCenter={COLORADO_CENTER}
        defaultZoom={10}
        gestureHandling="greedy"
        mapTypeId="hybrid"
        mapTypeControl={true}
        mapTypeControlOptions={{ position: window.google?.maps?.ControlPosition?.BOTTOM_LEFT ?? 6 }}
        fullscreenControl={false}
        streetViewControl={false}
        zoomControl={true}
      >
        {onMapReady && <MapController onMapReady={onMapReady} />}
        <TrailLayer activeFilters={activeFilters} findSingletrack={findSingletrack} onStatusChange={setStatus} routeMode={routeMode} onAddToRoute={onAddToRoute} onRemoveFromRoute={onRemoveFromRoute} routeTrails={routeTrails} />
        <RideHistoryLayer enabled={!!showRideHistory} refreshKey={ridesRefresh} onViewRide={onViewRide} />
      </GoogleMap>
      <div className="map-status">
        {status.type === 'loading' && <div className="status-badge loading"><span className="spinner" /> Loading trails...</div>}
        {status.type === 'loaded' && <div className="status-badge loaded">{status.count.toLocaleString()} trail segments{status.exceeded && ' — zoom in for more'}</div>}
        {status.type === 'zoom' && <div className="status-badge zoom-hint">Zoom in to see trails</div>}
        {status.type === 'error' && <div className="status-badge error">Failed to load trails</div>}
      </div>
    </div>
  );
}
