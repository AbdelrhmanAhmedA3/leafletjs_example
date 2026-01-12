import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule],
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

      <div class="field-group">
        <label for="name">Name</label>
        <input pInputText id="name" formControlName="name" placeholder="Enter pin name" />
      </div>

      <div class="field-group">
        <label for="blockNumber">Area / Block Number</label>
        <input
          pInputText
          id="blockNumber"
          formControlName="blockNumber"
          placeholder="e.g. District 1 - Apartments"
        />
      </div>

      <div class="field-group">
        <label for="description">Description</label>
        <textarea
          pTextarea
          id="description"
          formControlName="description"
          rows="3"
          placeholder="Short description..."
        ></textarea>
      </div>

      <div class="dialog-actions">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button label="Create" [disabled]="form.invalid" (onClick)="onCreate()" />
      </div>
    </form>
  `,
  styles: [
    `
      .pin-dialog-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
      .field-group label {
        font-weight: 700;
        color: #334155;
      }
      .dialog-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }
      .dialog-actions p-button {
        flex: 1;
      }
      :host ::ng-deep .p-button {
        width: 100%;
      }
      input,
      textarea {
        width: 100%;
      }
      .p-disabled {
        background-color: #f1f5f9 !important;
        cursor: not-allowed;
      }
    `,
  ],
})
export class PinDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  readonly form: FormGroup = this.fb.group({
    lat: [{ value: this.config.data?.lat || 0, disabled: true }],
    lng: [{ value: this.config.data?.lng || 0, disabled: true }],
    name: ['', Validators.required],
    blockNumber: ['', Validators.required],
    description: ['', Validators.required],
  });

  onCancel() {
    this.ref.close();
  }

  onCreate() {
    if (this.form.valid) {
      this.ref.close(this.form.getRawValue());
    }
  }
}
