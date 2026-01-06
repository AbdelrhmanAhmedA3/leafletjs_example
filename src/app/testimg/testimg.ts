import { Component, ElementRef, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-testimg',
  standalone: true,
  templateUrl: './testimg.html',
  styleUrl: './testimg.css',
})
export class Testimg {
  // ViewChild as signal
  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  // state
  readonly pins = signal<L.LatLng[]>([]);
  readonly mapReady = signal<boolean>(false);

  private map?: L.Map;

  // ====== public ======
  init() {
    this.mapReady.set(true);
    this.waitForContainer();
  }

  // ====== helpers ======
  private waitForContainer() {
    requestAnimationFrame(() => {
      const container = this.mapContainer();
      if (!container) return this.waitForContainer();
      this.tryInitMap();
    });
  }

  private tryInitMap() {
    const container = this.mapContainer();
    if (!container || this.map) return;

    this.initMap(container.nativeElement);
  }

  private loadPinsFromStorage(): L.LatLng[] {
    const raw = localStorage.getItem('lastPin');
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      return parsed
        .map((item: any) => {
          if (item?.latlng) {
            return L.latLng(item.latlng.lat, item.latlng.lng);
          }
          if (item?.lat !== undefined && item?.lng !== undefined) {
            return L.latLng(item.lat, item.lng);
          }

          return null;
        })
        .filter(Boolean) as L.LatLng[];
    } catch {
      return [];
    }
  }

  // ====== leaflet ======
  private initMap(element: HTMLDivElement) {
    const IMAGE_WIDTH = 3500;
    const IMAGE_HEIGHT = 3000;
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [IMAGE_HEIGHT, IMAGE_WIDTH],
    ];

    this.map = L.map(element, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    L.imageOverlay('images/MasterPlan.jpg', bounds).addTo(this.map);
    this.map.fitBounds(bounds);

    // 1️⃣ load pins from localStorage
    const storedPins = this.loadPinsFromStorage();
    this.pins.set(storedPins);

    // 2️⃣ render stored pins
    storedPins.forEach((pin) => {
      L.marker(pin).addTo(this.map!);
    });

    // (اختياري) click يضيف pin جديد
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const map = this.map;
      if (!map) return;

      this.pins.update((p) => [...p, e.latlng]);
      L.marker(e.latlng).addTo(map);
    });
  }
}
