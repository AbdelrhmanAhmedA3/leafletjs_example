import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PinPopupComponent } from '../pin-popup-component/pin-popup-component';

interface MapPin {
  id: string;
  latlng: L.LatLng;
}

@Component({
  selector: 'app-customer',
  imports: [RouterLink, DynamicDialogModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
  providers: [DialogService],
})
export class Customer {
  readonly dialogService = inject(DialogService);

  ref: DynamicDialogRef | null = null;

  // ViewChild as signal
  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  // ===== state =====
  readonly pins = signal<MapPin[]>([]);
  readonly mapReady = signal<boolean>(false);

  private map?: L.Map;
  private readonly PIN_COUNTER_KEY = 'pin_counter';
  // ===== public =====
  init() {
    this.mapReady.set(true);
    this.waitForContainer();
  }

  // ===== helpers =====
  private waitForContainer() {
    requestAnimationFrame(() => {
      const container = this.mapContainer();
      if (!container) {
        this.waitForContainer();
        return;
      }

      this.tryInitMap();
    });
  }

  private tryInitMap() {
    const container = this.mapContainer();
    if (!container || this.map) return;

    this.initMap(container.nativeElement);
  }

  private createId(): string {
    const counter = localStorage.getItem(this.PIN_COUNTER_KEY) || '0';
    const newId = parseInt(counter) + 1;
    localStorage.setItem(this.PIN_COUNTER_KEY, newId.toString());
    return newId.toString();
  }

  private loadPinsFromStorage(): MapPin[] {
    const raw = localStorage.getItem('lastPin');
    if (!raw) return [];

    try {
      return JSON.parse(raw) as MapPin[];
    } catch {
      return [];
    }
  }

  // ===== leaflet =====
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

    // 1️⃣ load stored pins
    const storedPins = this.loadPinsFromStorage();
    this.pins.set(storedPins);

    storedPins.forEach((pin) => {
      this.renderMarker(pin);
    });

    // 2️⃣ add new pin on map click
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.map) return;
      console.log(e);
      if (this.pinExists(e.latlng)) {
        console.log('Pin already exists here');
        return;
      }
      const newPin: MapPin = {
        id: this.createId(),
        latlng: e.latlng,
      };

      this.pins.update((p) => [...p, newPin]);
      this.renderMarker(newPin);

      localStorage.setItem('lastPin', JSON.stringify(this.pins()));
    });
  }
  private pinExists(latlng: L.LatLng): boolean {
    return this.pins().some((pin) => this.map!.distance(pin.latlng, latlng) < 15);
  }

  private renderMarker(pin: MapPin) {
    if (!this.map) return;

    const marker = L.marker(pin.latlng).addTo(this.map);

    marker.on('click', () => {
      this.openPinPopup(pin);
    });
  }

  // ===== dialog =====
  private openPinPopup(pin: MapPin) {
    this.ref?.close();

    this.ref = this.dialogService.open(PinPopupComponent, {
      header: `Pin ${pin.id.slice(0, 6)}`,
      width: '400px',
      closable: true,
      data: {
        id: pin.id,
        lat: pin.latlng.lat,
        lng: pin.latlng.lng,
      },
    });

    this.ref?.onClose.subscribe((data) => {
      this.pins.update((p) => p.map((pin) => (pin.id === data.id ? { ...pin, ...data } : pin)));
      console.log(this.pins());
    });
  }
}
