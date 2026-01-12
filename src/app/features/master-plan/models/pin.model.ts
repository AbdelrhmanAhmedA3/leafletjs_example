export interface Pin {
  id: string;
  name: string;
  blockNumber: string;
  description: string;
  lat: number;
  lng: number;
  currentLevelImage: string;
  targetLevelImage?: string; // Image to load when clicked (drill-down)
}

export interface MapLevel {
  id: string;
  name: string;
  imageUrl: string;
  parentLevelId?: string;
}
