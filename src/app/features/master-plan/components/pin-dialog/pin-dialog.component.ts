import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, CheckboxModule],
  template: `
    <form [formGroup]="form" class="pin-dialog-form">
      <div class="coords-row">
        <div class="field-group">
          <label for="lat">Latitude</label>
          <input pInputText id="lat" formControlName="lat" [readOnly]="true" class="p-disabled" />
        </div>
        <div class="field-group">
          <label for="lng">Longitude</label>
          <input pInputText id="lng" formControlName="lng" [readOnly]="true" class="p-disabled" />
        </div>
      </div>

      @if (config.data?.step === 2) {
      <div class="field-group checkbox-group">
        <label for="isBuilding">Is this pin a building?</label>
        <p-checkbox formControlName="isBuilding" [binary]="true" id="isBuilding" />
      </div>
      }

      <div class="field-group">
        <label for="name">{{ nameLabel() }}</label>
        <input
          pInputText
          id="name"
          formControlName="name"
          [placeholder]="'Enter ' + nameLabel().toLowerCase()"
        />
      </div>

      @if (config.data?.step === 2 && isBuildingValue()) {
      <div class="field-group">
        <label for="region">{{ dropdownLabel() }}</label>
        <p-select
          id="region"
          [options]="regionsAvailable"
          optionValue="code"
          optionLabel="name"
          formControlName="region"
          [placeholder]="'Select ' + dropdownLabel().toLowerCase()"
        />
      </div>
      } @if (!isBuildingValue()) {
      <div class="field-group">
        <label>Upload Master Plan Image</label>
        <div
          class="upload-area"
          [class.has-file]="!!uploadedImage()"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          @if (uploadedImage()) {
          <img [src]="uploadedImage()" alt="Preview" class="preview-img" />
          <div class="upload-overlay">
            <i class="pi pi-refresh"></i>
            <span>Change Image</span>
          </div>
          } @else {
          <div class="upload-placeholder">
            <i class="pi pi-cloud-upload"></i>
            <p>Drag & Drop or Click to Upload</p>
            <span class="text-xs">PNG, JPG accepted</span>
          </div>
          }
          <input
            #fileInput
            type="file"
            hidden
            accept="image/png, image/jpeg"
            (change)="onFileSelected($event)"
          />
        </div>
      </div>
      }

      <div class="dialog-actions">
        <p-button label="Cancel" severity="secondary" (onClick)="_onCancel()" />
        <p-button
          [label]="isEditMode() ? 'Update' : 'Create'"
          [disabled]="form.invalid"
          (onClick)="_onCreate()"
        />
      </div>
    </form>
  `,
  styles: [
    `
      .pin-dialog-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
      }
      .coords-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .field-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .checkbox-group {
        flex-direction: row;
        align-items: center;
        gap: 0.75rem;
      }
      .field-group label {
        font-weight: 700;
        font-size: 0.9rem;
        color: #475569;
      }
      .upload-area {
        height: 120px;
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
        background: #f8fafc;
      }
      .upload-area:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }
      .upload-area.has-file {
        border-style: solid;
        border-color: #e2e8f0;
      }
      .upload-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #64748b;
        gap: 0.25rem;
      }
      .upload-placeholder i {
        font-size: 1.5rem;
      }
      .preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .upload-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        opacity: 0;
        transition: opacity 0.2s;
        gap: 0.5rem;
      }
      .upload-area:hover .upload-overlay {
        opacity: 1;
      }
      .dialog-actions {
        display: flex;
        gap: 1rem;
        margin-top: 0.5rem;
      }
      .dialog-actions p-button {
        flex: 1;
      }
      :host ::ng-deep .p-button {
        width: 100%;
      }
      input,
      p-select {
        width: 100%;
      }
      .p-disabled {
        background-color: #f1f5f9 !important;
        opacity: 0.7;
      }
    `,
  ],
})
export class PinDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject(DynamicDialogConfig);

  protected readonly uploadedImage = signal<string | null>(null);

  protected readonly isEditMode = signal<boolean>(!!this.config.data?.existingPin);

  readonly form: FormGroup = this.fb.group({
    lat: [{ value: this.config.data?.lat || 0, disabled: true }],
    lng: [{ value: this.config.data?.lng || 0, disabled: true }],
    name: [this.config.data?.existingPin?.name || '', Validators.required],
    isBuilding: [this.config.data?.existingPin?.isBuilding || false],
  });

  protected readonly isBuildingValue = toSignal(this.form.get('isBuilding')!.valueChanges, {
    initialValue: this.config.data?.existingPin?.isBuilding || false,
  });

  protected readonly nameLabel = computed(() => {
    const step = this.config.data?.step || 1;
    if (step === 1) return 'Region Name';
    return this.isBuildingValue() ? 'Building Name' : 'Sub Region Name';
  });

  protected readonly dropdownLabel = computed(() => {
    return this.isBuildingValue() ? 'Building Number' : 'Region';
  });

  regionsAvailable: any[] = [
    { name: 'b11', code: 'b11' },
    { name: 'b12', code: 'b12' },
    { name: 'b13', code: 'b13' },
    { name: 'b14', code: 'b14' },
    { name: 'b15', code: 'b15' },
  ];

  ngOnInit() {
    const step = this.config.data?.step;
    const existingPin = this.config.data?.existingPin;

    if (step === 2 || existingPin?.region) {
      this.form.addControl(
        'region',
        this.fb.control(existingPin?.region || '', Validators.required)
      );
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
    // Reset file input to allow selecting same file again if needed
    event.target.value = '';
  }

  private processFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result;
      this.compressImage(base64, 1200, 0.7).then((compressed) => {
        this.uploadedImage.set(compressed);
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

  _onCancel() {
    this.ref.close();
  }

  _onCreate() {
    if (this.form.valid) {
      this.ref.close({
        ...this.form.getRawValue(),
        targetLevelImage: this.uploadedImage(),
      });
    }
  }
}
