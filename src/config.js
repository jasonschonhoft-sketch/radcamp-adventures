export const COTREX_URL =
  'https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/ArcGIS/rest/services/CPWAdminData/FeatureServer/15/query';

// Surfaces considered "paved" — used to split bike vs bike_path
export const PAVED_SURFACES = new Set(['paved', 'concrete', 'boardwalk']);

export const ACTIVITY_CONFIG = {
  hiking: {
    label: 'Hiking',
    color: '#4CAF50',
    weight: 2,
  },
  bike: {
    label: 'Mountain Bike',
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
    color: '#00E5FF',
    weight: 2.5,
    note: 'Paved surfaces only',
  },
  motorcycle: {
    label: 'Dirt Bike',
    color: '#FF5722',
    weight: 2.5,
  },
  emoto: {
    label: 'E-Dirt Bike',
    color: '#E040FB',
    weight: 2.5,
    note: 'Same access as dirt bike',
  },
  ohv: {
    label: 'OHV / Side-by-Side',
    color: '#FFB300',
    weight: 2.5,
  },
  snowmobile: {
    label: 'Snowmobile',
    color: '#00BCD4',
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
