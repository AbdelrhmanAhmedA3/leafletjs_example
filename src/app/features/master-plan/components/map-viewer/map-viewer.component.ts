import { CommonModule, DecimalPipe } from '@angular/common';
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
  providers: [DialogService, DecimalPipe],
  template: `
    <div class="map-container-wrapper" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
      <div class="controls shadow-2">
        <div class="controls-left">
          @if (store.navigationHistory().length > 0) {
          <p-button
            icon="pi pi-arrow-left"
            severity="secondary"
            (onClick)="store.goBack()"
            label="Back"
          />
          }
          <h2 class="level-title">{{ store.currentLevel().name }}</h2>
        </div>

        <div class="controls-right">
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

      @if (!store.currentLevel().imageUrl) {
      <div class="overlay-state">
        @if (store.isAdminMode()) {
        <div class="drop-zone">
          <i class="pi pi-cloud-upload upload-icon"></i>
          <p class="drop-text">Drag & Drop Image Here</p>
          <p class="drop-subtext">
            Please upload the image for <b>{{ store.currentLevel().name }}</b>
          </p>
          <input
            type="file"
            #fileInput
            class="hidden-input"
            (change)="onFileSelected($event)"
            accept="image/*"
          />
          <p-button
            label="Browse Files"
            icon="pi pi-search"
            class="mt-3"
            (onClick)="fileInput.click()"
          />
        </div>
        } @else {
        <div class="empty-state">
          <i class="pi pi-image text-6xl text-400"></i>
          <p class="text-xl">No image uploaded for this area yet.</p>
          <p class="text-600">Please contact the administrator.</p>
        </div>
        }
      </div>
      }
    </div>
  `,
  styles: [
    `
      .map-container-wrapper {
        height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
        background: #f8f9fa;
        overflow: hidden;
      }
      .map-container {
        position: absolute;
        top: 10%;
        left: 50%;
        transform: translateX(-50%);
        width: 500px;
        height: 500px;
        z-index: 1;
      }

      .controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1001;
        margin: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .controls-left,
      .controls-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .level-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #2a82ba;
      }

      .overlay-state {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #f8f9fa;
        z-index: 1000;
      }

      .drop-zone,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 600px;
        padding: 3rem;
        border-radius: 12px;
        text-align: center;
        background: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .drop-zone {
        border: 2px dashed #cbd5e1;
        background: #f8fafc;
      }

      .empty-state {
        color: #64748b;
      }

      .upload-icon {
        font-size: 4rem;
        color: #94a3b8;
        margin-bottom: 1rem;
      }
      .drop-text {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0.5rem 0;
        color: #1e293b;
      }
      .drop-subtext {
        color: #64748b;
        margin-bottom: 1.5rem;
      }
      .hidden-input {
        display: none;
      }
      .mt-3 {
        margin-top: 1rem;
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
  private readonly decimalPipe = inject(DecimalPipe);
  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly isCustomerOnlyRoute = signal<boolean>(false);

  private map?: L.Map;
  private imageOverlay?: L.ImageOverlay;
  private markers: L.Marker[] = [];
  private dialogRef: DynamicDialogRef | null = null;

  constructor() {
    // Check for customer only mode from route
    const customerOnly = this.route.snapshot.data['customerOnly'];
    if (customerOnly) {
      this.isCustomerOnlyRoute.set(true);
      if (this.store.isAdminMode()) {
        this.store.toggleAdminMode();
      }
    }

    // React to level changes
    effect(() => {
      const level = this.store.currentLevel();
      if (level?.imageUrl) {
        // Ensure map is initialized before updating image
        if (!this.map) {
          setTimeout(() => {
            this.initMap();
            this.updateMapImage(level);
          }, 0);
        } else {
          this.updateMapImage(level);
        }
      }
    });

    // React to pin changes
    effect(() => {
      const pins = this.store.currentLevelPins();
      this.renderPins(pins);
    });
  }

  ngOnInit() {
    const level = this.store.currentLevel();
    if (level?.imageUrl) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private processFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result;
      this.compressImage(base64, 1200, 0.7).then((compressed) => {
        this.store.updateLevelImage(this.store.currentLevelId(), compressed);
        // Force Leaflet update after a brief delay for DOM stability
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 100);
      });
    };
    reader.readAsDataURL(file);
  }

  private compressImage(base64: string, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  }

  private initMap() {
    const containerRef = this.mapContainer();
    if (!containerRef) return;

    const container = containerRef.nativeElement;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    const level = this.store.currentLevel();
    if (level?.imageUrl) {
      this.updateMapImage(level);
    }

    this.renderPins(this.store.currentLevelPins());

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.store.isAdminMode()) {
        this.openPinDialog(e.latlng);
      }
    });
  }

  private updateMapImage(level: MapLevel) {
    if (!this.map || !level.imageUrl) return;

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

    this.markers.forEach((m) => m.remove());
    this.markers = [];

    pins.forEach((pin) => {
      const pinSvg = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNTk4IDAgMCA1LjU5OCAwIDEyLjVjMCAxMS41NjIgMTIuNSAyOC41IDEyLjUgMjguNVMyNSAyNC4wNjIgMjUgMTIuNUMyNSA1LjU5OCAxOS40MDIgMCAxMi41IDB6bTAgMTguNzVjLTMuNDUxIDAtNi4yNS0yLjc5OS02LjI1LTYuMjVzMi43OTktNi4yNSA2LjI1LTYuMjUgNi4yNSAyLjc5OSA2LjI1IDYuMjUtMi43OTkgNi4yNS02LjI1IDYuMjV6IiBmaWxsPSIjMkE4MkJBIi8+PC9zdmc+`;

      const iconHtml = `
        <div class="custom-pin-container" style="position: relative; width: 25px; height: 41px;">
          <img src="${pinSvg}" style="width: 25px; height: 41px; display: block;" />
          ${
            this.store.isAdminMode()
              ? `
            <div id="del-${pin.id}" class="delete-pin-x" style="
              position: absolute; top: -8px; right: -8px; background: #ef4444; color: white;
              border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center;
              justify-content: center; font-size: 11px; cursor: pointer; border: 1.5px solid white;
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

      marker.bindTooltip(
        `
        <div class="p-2">
          <div class="font-bold border-bottom-1 border-300 pb-1 mb-1">${
            pin.name ? 'name: ' + pin.name : ''
          }</br> ${pin.region ? 'region: ' + pin.region : ''}</div>
          <div class="text-sm text-600 mb-1"><b>${
            pin.blockNumber ? 'Block:' + pin.blockNumber : ''
          }</div>
          <div class="text-xs text-400 mt-2 pt-1 border-top-1 border-200">
            Lat: ${this.decimalPipe.transform(
              pin.lat,
              '1.0-0'
            )} | Lng: ${this.decimalPipe.transform(pin.lng, '1.0-0')}
          </div>
        </div>
      `,
        { permanent: false, direction: 'left', className: 'p-tooltip-custom' }
      );

      if (this.store.isAdminMode()) {
        setTimeout(() => {
          const xBtn = document.getElementById(`del-${pin.id}`);
          if (xBtn)
            xBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.removePin(pin.id);
            };
        }, 0);
      }

      marker.on('click', (e: L.LeafletMouseEvent) => {
        const target = e.originalEvent.target as HTMLElement;
        if (target && target.classList.contains('delete-pin-x')) return;
        if (pin.targetLevelImage) this.handleDrillDown(pin);
      });

      this.markers.push(marker);
    });
  }

  private openPinDialog(latlng: L.LatLng) {
    const currentId = this.store.currentLevelId();
    const currentStep = currentId === 'master' ? 1 : 2;

    this.dialogRef = this.dialogService.open(PinDialogComponent, {
      header: 'Create New Pin',
      width: '400px',
      data: { lat: latlng.lat, lng: latlng.lng, step: currentStep },
      modal: true,
      appendTo: 'body',
      baseZIndex: 10000,
      dismissableMask: true,
      closeOnEscape: true,
    });

    this.dialogRef?.onClose.subscribe((data: any) => {
      if (data) {
        let targetLevelId = '';
        const currentId = this.store.currentLevelId();

        if (currentId === 'master') {
          targetLevelId = `dist-${crypto.randomUUID()}`;
        } else if (currentId.includes('dist-')) {
          targetLevelId = `build-${crypto.randomUUID()}`;
        }

        const newPin: Pin = {
          id: crypto.randomUUID(),
          ...data,
          lat: latlng.lat,
          lng: latlng.lng,
          currentLevelImage: currentId,
          targetLevelImage: targetLevelId,
        };
        this.store.addPin(newPin);
      }
    });
  }

  private handleDrillDown(pin: Pin) {
    if (pin.targetLevelImage) {
      this.store.navigateToLevel(pin.targetLevelImage, pin.name);
    }
  }
}
