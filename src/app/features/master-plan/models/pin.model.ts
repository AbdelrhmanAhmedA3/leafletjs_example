export interface Pin {
  id: string;
  name: string;
  region: string;
  blockNumber: string;
  description: string;
  isBuilding?: boolean;
  unitName?: string;
  unitNumber?: string;
  lat: number;
  lng: number;
  currentLevelImage: string;
  targetLevelImage?: string; // Image to load when clicked (drill-down)
}

export interface MapLevel {
  id: string; // Used as the unique key in the levels record
  name: string;
  imageUrl?: string; // Made optional as it might not be uploaded yet
  parentLevelId?: string;
}
