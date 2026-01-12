import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MapLevel, Pin } from '../../models/pin.model';
import { MasterPlanStore } from '../../services/master-plan.store';
import { PinDialogComponent } from '../pin-dialog/pin-dialog.component';

@Component({
  selector: 'app-map-viewer',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  providers: [DialogService],
  template: `
    <div class="map-container-wrapper">
      <div
        class="controls p-3 flex justify-content-between align-items-center bg-white shadow-2 border-round-bottom"
      >
        <div class="flex gap-2 align-items-center">
          @if (store.navigationHistory().length > 0) {
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            (onClick)="store.goBack()"
            label="Back"
          />
          }
          <h2 class="m-0 text-xl font-bold text-primary">{{ store.currentLevel().name }}</h2>
        </div>

        <div class="flex gap-2">
          @if (!isCustomerOnlyRoute()) {
          <p-button
            [label]="store.isAdminMode() ? 'Exit Admin Mode' : 'Admin Create Pins'"
            [severity]="store.isAdminMode() ? 'danger' : 'primary'"
            [icon]="store.isAdminMode() ? 'pi pi-lock' : 'pi pi-plus'"
            (onClick)="store.toggleAdminMode()"
          />
          }
        </div>
      </div>

      <div #mapContainer class="map-container"></div>
    </div>
  `,
  styles: [
    `
      .map-container-wrapper {
        height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .map-container {
        flex: 1;
        width: 100%;
        background: #f8f9fa;
      }
      .controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        margin: 1rem;
        border-radius: 8px;
      }
      :host ::ng-deep .leaflet-container {
        background: #f8f9fa;
        cursor: crosshair;
      }
    `,
  ],
})
export class MapViewerComponent implements OnInit, OnDestroy {
  readonly store = inject(MasterPlanStore);
  private readonly dialogService = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  readonly isCustomerOnlyRoute = signal<boolean>(false);

  private map?: L.Map;
  private imageOverlay?: L.ImageOverlay;
  private markers: L.Marker[] = [];
  private dialogRef!: DynamicDialogRef | null;

  constructor() {
    // Check for customer only mode from route
    const customerOnly = this.route.snapshot.data['customerOnly'];
    if (customerOnly) {
      this.isCustomerOnlyRoute.set(true);
      // Ensure admin mode is off if strictly customer view
      if (this.store.isAdminMode()) {
        this.store.toggleAdminMode();
      }
    }

    // React to level changes
    effect(() => {
      const level = this.store.currentLevel();
      this.updateMapImage(level);
    });

    // React to pin changes
    effect(() => {
      const pins = this.store.currentLevelPins();
      this.renderPins(pins);
    });
  }

  ngOnInit() {
    // Wait for view init
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    const container = this.mapContainer().nativeElement;

    this.map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    this.updateMapImage(this.store.currentLevel());

    // Initial pin render once map is ready
    this.renderPins(this.store.currentLevelPins());

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.store.isAdminMode()) {
        this.openPinDialog(e.latlng);
      }
    });
  }

  private updateMapImage(level: MapLevel) {
    if (!this.map) return;

    // Standard high-res bounds for simplified coordinate system
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [1000, 1000],
    ];

    if (this.imageOverlay) {
      this.map.removeLayer(this.imageOverlay);
    }

    this.imageOverlay = L.imageOverlay(level.imageUrl, bounds).addTo(this.map);
    this.map.fitBounds(bounds);
  }

  private renderPins(pins: Pin[]) {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach((m) => m.remove());
    this.markers = [];

    pins.forEach((pin) => {
      // Step 1: Create custom icon HTML with an 'X' button for Admin
      // Using a Data URI for the pin to avoid 404 errors and ensure it always loads
      const pinSvg = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNTk4IDAgMCA1LjU5OCAwIDEyLjVjMCAxMS41NjIgMTIuNSAyOC41IDEyLjUgMjguNVMyNSAyNC4wNjIgMjUgMTIuNUMyNSA1LjU5OCAxOS40MDIgMCAxMi41IDB6bTAgMTguNzVjLTMuNDUxIDAtNi4yNS0yLjc5OS02LjI1LTYuMjVzMi43OTktNi4yNSA2LjI1LTYuMjUgNi4yNSAyLjc5OSA2LjI1IDYuMjUtMi43OTkgNi4yNS02LjI1IDYuMjV6IiBmaWxsPSIjMkE4MkJBIi8+PC9zdmc+`;

      const iconHtml = `
        <div class="custom-pin-container" style="position: relative; width: 25px; height: 41px;">
          <img src="${pinSvg}" style="width: 25px; height: 41px; display: block;" />
          ${
            this.store.isAdminMode()
              ? `
            <div id="del-${pin.id}" class="delete-pin-x" style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: #ef4444;
              color: white;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.4);
              z-index: 1000;
              font-weight: bold;
              line-height: 1;
              border: 1.5px solid white;
            ">✕</div>
          `
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-icon',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(this.map!);

      // Step 2: Bind Tooltip for info
      marker.bindTooltip(
        `
        <div class="p-2">
          <div class="font-bold border-bottom-1 border-300 pb-1 mb-1">${pin.name}</div>
          <div class="text-sm text-600 mb-1"><b>Block:</b> ${pin.blockNumber}</div>
          <div class="text-sm">${pin.description}</div>
        </div>
      `,
        { permanent: false, direction: 'left', className: 'p-tooltip-custom' }
      );

      // Step 3: Handle Delete Logic via DOM reference
      if (this.store.isAdminMode()) {
        setTimeout(() => {
          const xBtn = document.getElementById(`del-${pin.id}`);
          if (xBtn) {
            xBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.store.removePin(pin.id);
            };
          }
        }, 0);
      }

      // Step 4: Handle Navigation (Drill Down)
      marker.on('click', (e: L.LeafletMouseEvent) => {
        // Prevent drill down if clicking the delete icon
        const target = e.originalEvent.target as HTMLElement;
        if (target && target.classList.contains('delete-pin-x')) {
          return;
        }

        if (pin.targetLevelImage) {
          this.handleDrillDown(pin);
        }
      });

      this.markers.push(marker);
    });
  }

  private openPinDialog(latlng: L.LatLng) {
    this.dialogRef = this.dialogService.open(PinDialogComponent, {
      header: 'Create New Pin',
      width: '400px',
      modal: true,
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw',
      },
    });

    this.dialogRef?.onClose.subscribe((data: any) => {
      if (data) {
        // Determine target image based on current level
        let targetLevelImage = '';
        let nextName = '';

        const currentUrl = this.store.currentLevel().imageUrl;

        // Step 1: Master -> District (B1)
        if (currentUrl.endsWith('MasterPlan.jpg')) {
          targetLevelImage = 'images/B1.jpg';
        }
        // Step 2: District (B1) -> Building (31)
        else if (currentUrl.endsWith('B1.jpg')) {
          targetLevelImage = 'images/31.jpg';
        }
        // Step 3: Building (31) is the final level (No further drill-down)

        const newPin: Pin = {
          id: crypto.randomUUID(),
          ...data,
          lat: latlng.lat,
          lng: latlng.lng,
          currentLevelImage: this.store.currentLevel().imageUrl,
          targetLevelImage: targetLevelImage,
        };

        this.store.addPin(newPin);
      }
    });
  }

  private handleDrillDown(pin: Pin) {
    if (pin.targetLevelImage) {
      this.store.navigateToLevel({
        id: `level-${pin.id}`,
        name: pin.name,
        imageUrl: pin.targetLevelImage,
      });
    }
  }
}
