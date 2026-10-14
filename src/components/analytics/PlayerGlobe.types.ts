export type GlobePlayerPoint = {
  lat: number;
  lng: number;
  name: string;
  country: string;
  size?: number;
  color?: string;
  /** Cluster size — shown on map / globe markers */
  count?: number;
};
