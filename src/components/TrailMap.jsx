import { useEffect, useRef, useState, useCallback } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { ACTIVITY_CONFIG, ACTIVITY_KEYS, COTREX_URL, PAVED_SURFACES } from '../config';

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
const MAX_RECORDS = 2000;

function getTrailActivities(props) {
  const acts = [];
  const surface = (props.surface || '').toLowerCase();
  const isPaved = PAVED_SURFACES.has(surface);
  const isTrail = props.type === 'Trail';
  const isRoad = props.type === 'Road';
  const isHighwayVehicle = props.highway_ve === 'yes';

  if (props.hiking === 'yes') acts.push('hiking');

  if (props.bike === 'yes') {
    acts.push('ebike');
    if (isTrail) {
      acts.push('mountain_bike');
    } else if (isRoad && isPaved) {
      acts.push('bike_path');
      acts.push('road_bike');
    } else if (isRoad && !isHighwayVehicle) {
      acts.push('gravel_bike');
    } else if (isPaved) {
      acts.push('bike_path');
      acts.push('road_bike');
    } else {
      acts.push('mountain_bike');
    }
  }

  if (props.motorcycle === 'yes') {
    acts.push('dirt_bike');
    acts.push('edirt_bike');
  }

  if (props.atv === 'yes' || props.ohv_gt_50 === 'yes') acts.push('ohv');
  if (props.snowmobile === 'yes') acts.push('snowmobile');

  return acts;
}

function isSingletrack(props) {
  return props.type === 'Trail' && (props.surface || '').toLowerCase() === 'dirt';
}

async function fetchTrailsInBounds(bounds) {
  const geometry = JSON.stringify({
    xmin: bounds.west,
    ymin: bounds.south,
    xmax: bounds.east,
    ymax: bounds.north,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    where: '1=1',
    geometry,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: 'name,hiking,bike,motorcycle,atv,ohv_gt_50,snowmobile,surface,type,highway_ve',
    f: 'geojson',
    resultRecordCount: MAX_RECORDS,
  });

  const res = await fetch(`${COTREX_URL}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return {
    features: data.features || [],
    exceeded: data.properties?.exceededTransferLimit === true,
  };
}

function TrailLayer({ activeFilters, singletrackOnly, onStatusChange }) {
  const map = useMap();
  const polylinesRef = useRef({});
  const activeFiltersRef = useRef(activeFilters);
  const singletrackOnlyRef = useRef(singletrackOnly);
  const debounceRef = useRef(null);

  useEffect(() => {
    activeFiltersRef.current = activeFilters;
    singletrackOnlyRef.current = singletrackOnly;
  });

  // Update polyline visibility when filters change (no re-fetch needed)
  useEffect(() => {
    if (!map) return;
    ACTIVITY_KEYS.forEach(activity => {
      const visible = !!activeFilters[activity];
      (polylinesRef.current[activity] || []).forEach(p => {
        const show = visible && (
          activity !== 'dirt_bike' || !singletrackOnly || p.__singletrack
        );
        p.setMap(show ? map : null);
      });
    });
  }, [activeFilters, singletrackOnly, map]);

  const loadTrails = useCallback(async () => {
    if (!map) return;

    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM_FOR_TRAILS) {
      ACTIVITY_KEYS.forEach(activity => {
        (polylinesRef.current[activity] || []).forEach(p => p.setMap(null));
        polylinesRef.current[activity] = [];
      });
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
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });

      // Clear old polylines
      ACTIVITY_KEYS.forEach(activity => {
        (polylinesRef.current[activity] || []).forEach(p => p.setMap(null));
        polylinesRef.current[activity] = [];
      });

      // Build new polylines
      features.forEach(feature => {
        const { geometry, properties } = feature;
        if (!geometry) return;

        const activities = getTrailActivities(properties);
        if (activities.length === 0) return;

        const coordSets =
          geometry.type === 'MultiLineString'
            ? geometry.coordinates
            : [geometry.coordinates];

        const singletrack = isSingletrack(properties);
        const dashedIcon = singletrack ? [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 3 },
          offset: '0',
          repeat: '12px',
        }] : undefined;

        activities.forEach(activity => {
          const cfg = ACTIVITY_CONFIG[activity];
          if (!cfg) return;
          const visible = !!activeFiltersRef.current[activity];

          coordSets.forEach(coords => {
            const showPolyline = visible && (
              activity !== 'dirt_bike' || !singletrackOnlyRef.current || singletrack
            );
            const polyline = new google.maps.Polyline({
              path: coords.map(([lng, lat]) => ({ lat, lng })),
              strokeColor: cfg.color,
              strokeOpacity: singletrack ? 0 : 0.9,
              strokeWeight: cfg.weight,
              icons: dashedIcon,
              map: showPolyline ? map : null,
              clickable: true,
            });
            polyline.__singletrack = singletrack;

            polyline.addListener('click', e => {
              const acts = getTrailActivities(properties).filter(a => ACTIVITY_CONFIG[a]);
              const surfaceLabel = getSurfaceLabel(properties.surface);
              const actRows = acts.map(a => {
                const c = ACTIVITY_CONFIG[a];
                return `<div style="display:flex;align-items:center;gap:8px;padding:2px 0">
                  <div style="width:6px;height:6px;border-radius:50%;background:${c.color};flex-shrink:0"></div>
                  <span style="font-size:12px;color:#8a9bb0;font-weight:500">${c.label}</span>
                </div>`;
              }).join('');
              new google.maps.InfoWindow({
                content: `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;padding:12px 14px;min-width:180px;max-width:240px">
                  <div style="font-size:13px;font-weight:700;color:#e8edf5;margin-bottom:8px;line-height:1.3">${properties.name || 'Unnamed Trail'}</div>
                  <div>${actRows}</div>
                  ${surfaceLabel ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px;color:rgba(255,255,255,0.35)">${surfaceLabel}</div>` : ''}
                </div>`,
                position: e.latLng,
              }).open(map);
            });

            if (!polylinesRef.current[activity]) {
              polylinesRef.current[activity] = [];
            }
            polylinesRef.current[activity].push(polyline);
          });
        });
      });

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
    };
  }, [map, loadTrails]);

  return null;
}

export default function TrailMap({ activeFilters, singletrackOnly, onMapReady }) {
  const [status, setStatus] = useState({ type: 'idle' });

  return (
    <div className="map-wrapper">
      <Map
        defaultCenter={COLORADO_CENTER}
        defaultZoom={10}
        gestureHandling="greedy"
        mapTypeId="hybrid"
        mapTypeControl={true}
        mapTypeControlOptions={{ position: 3 }}
        fullscreenControl={false}
        streetViewControl={false}
        zoomControl={true}
      >
        {onMapReady && <MapController onMapReady={onMapReady} />}
        <TrailLayer activeFilters={activeFilters} singletrackOnly={singletrackOnly} onStatusChange={setStatus} />
      </Map>

      <div className="map-status">
        {status.type === 'loading' && (
          <div className="status-badge loading">
            <span className="spinner" /> Loading trails...
          </div>
        )}
        {status.type === 'loaded' && (
          <div className="status-badge loaded">
            {status.count.toLocaleString()} trail segments
            {status.exceeded && ' — zoom in for more'}
          </div>
        )}
        {status.type === 'zoom' && (
          <div className="status-badge zoom-hint">
            Zoom in to see trails
          </div>
        )}
        {status.type === 'error' && (
          <div className="status-badge error">
            Failed to load trails
          </div>
        )}
      </div>
    </div>
  );
}
