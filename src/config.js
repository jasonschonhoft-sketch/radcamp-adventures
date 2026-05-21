export const COTREX_URL =
  'https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/ArcGIS/rest/services/CPWAdminData/FeatureServer/15/query';

// Surfaces considered "paved" — used to split bike vs bike_path
export const PAVED_SURFACES = new Set(['paved', 'concrete', 'boardwalk']);

// Surfaces considered "gravel/unpaved" — used to identify gravel bike routes
export const GRAVEL_SURFACES = new Set(['gravel', 'unpaved', 'compacted', 'fine_gravel', 'dirt_road']);

export const ACTIVITY_CONFIG = {
  hiking: {
    label: 'Hiking',
    color: '#22c55e',
    weight: 2,
  },
  mountain_bike: {
    label: 'MTB',
    color: '#3b82f6',
    weight: 2,
  },
  bike_path: {
    label: 'Bike Path',
    color: '#fb7185',
    weight: 2.5,
    note: 'Paved surfaces only',
  },
  road_bike: {
    label: 'Road Bike',
    color: '#f97316',
    weight: 2,
    note: 'Paved surfaces only',
  },
  gravel_bike: {
    label: 'Gravel Bike',
    color: '#2dd4bf',
    weight: 2,
    note: 'Gravel and unpaved surfaces',
  },
  dirt_bike: {
    label: 'Moto',
    color: '#ef4444',
    weight: 2.5,
  },
  ohv: {
    label: 'UTV / 4x4',
    color: '#fbbf24',
    weight: 2.5,
  },
  horse: {
    label: 'Horseback',
    color: '#a16207',
    weight: 2,
  },
  snowmobile: {
    label: 'Snowmobile',
    color: '#e2e8f0',
    weight: 2,
  },
};

export const ACTIVITY_KEYS = Object.keys(ACTIVITY_CONFIG);

// Hybrid (satellite+labels) style — only adjusts labels so imagery shows through clearly
export const HYBRID_MAP_STYLE = [
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d0d8e8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#cccccc' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
