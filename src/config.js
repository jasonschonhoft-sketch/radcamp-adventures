export const COTREX_URL =
  'https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/ArcGIS/rest/services/CPWAdminData/FeatureServer/15/query';

// Surfaces considered "paved" — used to split bike vs bike_path
export const PAVED_SURFACES = new Set(['paved', 'concrete', 'boardwalk']);

// Surfaces considered "gravel/unpaved" — used to identify gravel bike routes
export const GRAVEL_SURFACES = new Set(['gravel', 'unpaved', 'compacted', 'fine_gravel', 'dirt_road']);

export const ACTIVITY_CONFIG = {
  hiking: {
    label: 'Hiking',
    color: '#4CAF50',
    weight: 2,
  },
  mountain_bike: {
    label: 'MTB',
    color: '#2979FF',
    weight: 2,
  },
  ebike: {
    label: 'E-Bike',
    color: '#76FF03',
    weight: 2,
    note: 'All trails where bikes are permitted',
  },
  bike_path: {
    label: 'Bike Path',
    color: '#06b6d4',
    weight: 2.5,
    note: 'Paved surfaces only',
  },
  road_bike: {
    label: 'Road Bike',
    color: '#6366f1',
    weight: 2,
    note: 'Paved surfaces only',
  },
  gravel_bike: {
    label: 'Gravel Bike',
    color: '#f59e0b',
    weight: 2,
    note: 'Gravel and unpaved surfaces',
  },
  dirt_bike: {
    label: 'Moto',
    color: '#FF5722',
    weight: 2.5,
  },
  edirt_bike: {
    label: 'E-Moto',
    color: '#E040FB',
    weight: 2.5,
    note: 'Same access as moto',
  },
  ohv: {
    label: 'UTV / 4x4',
    color: '#FFB300',
    weight: 2.5,
  },
  snowmobile: {
    label: 'Snowmobile',
    color: '#94a3b8',
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
