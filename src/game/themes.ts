export type AmbientKind = 'sparkle' | 'leaves' | 'embers' | 'bubbles' | 'snow';
export type CandyStyle = 'gloss' | 'wood' | 'magma' | 'pearl' | 'ice';
export type PlaceSound = 'pop' | 'wood' | 'stone' | 'splash' | 'crunch';

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  bgStops: [number, string][];
  panelOuter: [string, string];
  panelInner: [string, string];
  cellLight: string;
  cellDark: string;
  wellTop: string;
  wellBottom: string;
  gridMinor: string;
  gridMajor: string;
  ambient: AmbientKind;
  ambientColors: string[];
  ambientCount: number;
  dustColor: string;
  candyStyle: CandyStyle;
  placeSound: PlaceSound;
}

export const THEMES: Theme[] = [
  {
    id: 'candy',
    name: 'CANDY LAND',
    emoji: '🍭',
    bgStops: [[0, '#ffd6a8'], [0.5, '#ffb6d5'], [1, '#b18bff']],
    panelOuter: ['#fff7ec', '#ffd9ec'],
    panelInner: ['#fde3c4', '#f8c8df'],
    cellLight: 'rgba(255,255,255,0.22)',
    cellDark: 'rgba(255,255,255,0.06)',
    wellTop: 'rgba(255,255,255,0.55)',
    wellBottom: 'rgba(120,40,90,0.22)',
    gridMinor: 'rgba(120,40,90,0.16)',
    gridMajor: 'rgba(120,40,90,0.36)',
    ambient: 'sparkle',
    ambientColors: ['#ffffff', '#ffd1e8', '#fff5b8'],
    ambientCount: 22,
    dustColor: '#fff0fa',
    candyStyle: 'gloss',
    placeSound: 'pop',
  },
  {
    id: 'forest',
    name: 'FOREST GROVE',
    emoji: '🌲',
    bgStops: [[0, '#cdedb6'], [0.55, '#5fbf6b'], [1, '#1f5a37']],
    panelOuter: ['#d8b888', '#9c7340'],
    panelInner: ['#bd8c54', '#7a4f24'],
    cellLight: 'rgba(255,235,200,0.22)',
    cellDark: 'rgba(50,30,10,0.20)',
    wellTop: 'rgba(255,240,210,0.45)',
    wellBottom: 'rgba(40,20,5,0.34)',
    gridMinor: 'rgba(40,20,5,0.22)',
    gridMajor: 'rgba(40,20,5,0.46)',
    ambient: 'leaves',
    ambientColors: ['#7be86b', '#cfd866', '#f29b3a', '#a85a1a'],
    ambientCount: 14,
    dustColor: '#d8b87a',
    candyStyle: 'wood',
    placeSound: 'wood',
  },
  {
    id: 'lava',
    name: 'LAVA REALM',
    emoji: '🔥',
    bgStops: [[0, '#5a0d0d'], [0.5, '#b3341a'], [1, '#ff8a1a']],
    panelOuter: ['#3d1410', '#180706'],
    panelInner: ['#6b2418', '#2c0a04'],
    cellLight: 'rgba(255,140,80,0.20)',
    cellDark: 'rgba(20,5,0,0.45)',
    wellTop: 'rgba(255,180,100,0.32)',
    wellBottom: 'rgba(0,0,0,0.5)',
    gridMinor: 'rgba(255,140,80,0.22)',
    gridMajor: 'rgba(255,180,100,0.5)',
    ambient: 'embers',
    ambientColors: ['#ffd84a', '#ff7a1a', '#ff3a1a'],
    ambientCount: 26,
    dustColor: '#ffb87a',
    candyStyle: 'magma',
    placeSound: 'stone',
  },
  {
    id: 'ocean',
    name: 'CORAL REEF',
    emoji: '🌊',
    bgStops: [[0, '#aae8ff'], [0.5, '#3da8d8'], [1, '#0a3a66']],
    panelOuter: ['#fff0c4', '#d8a85a'],
    panelInner: ['#f7d896', '#a87a3a'],
    cellLight: 'rgba(255,250,220,0.26)',
    cellDark: 'rgba(80,40,10,0.20)',
    wellTop: 'rgba(255,250,220,0.55)',
    wellBottom: 'rgba(60,30,5,0.32)',
    gridMinor: 'rgba(60,30,5,0.22)',
    gridMajor: 'rgba(60,30,5,0.46)',
    ambient: 'bubbles',
    ambientColors: ['#e0f7ff', '#a8e0f5', '#ffffff'],
    ambientCount: 18,
    dustColor: '#fff5d0',
    candyStyle: 'pearl',
    placeSound: 'splash',
  },
  {
    id: 'winter',
    name: 'FROZEN PEAK',
    emoji: '❄️',
    bgStops: [[0, '#e8f4ff'], [0.5, '#9bbcdf'], [1, '#3d5876']],
    panelOuter: ['#ffffff', '#c2d6e8'],
    panelInner: ['#dfeaf5', '#a0bcd2'],
    cellLight: 'rgba(255,255,255,0.45)',
    cellDark: 'rgba(80,100,140,0.18)',
    wellTop: 'rgba(255,255,255,0.7)',
    wellBottom: 'rgba(60,90,130,0.28)',
    gridMinor: 'rgba(60,90,130,0.22)',
    gridMajor: 'rgba(60,90,130,0.46)',
    ambient: 'snow',
    ambientColors: ['#ffffff', '#e8f4ff'],
    ambientCount: 32,
    dustColor: '#ffffff',
    candyStyle: 'ice',
    placeSound: 'crunch',
  },
];
