import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, TextareaModule],
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
      @if (config.data?.step === 2) {
      <div class="field-group">
        <label for="region">region</label>
        <p-select
          id="region"
          [options]="regionsAvailable"
          optionValue="code"
          optionLabel="name"
          formControlName="region"
          placeholder="Select a region"
        />
      </div>
      } @else if (!config.data?.step) {
      <div class="field-group">
        <label for="blockNumber">Area / Block Number</label>
        <input
          pInputText
          id="blockNumber"
          formControlName="blockNumber"
          placeholder="e.g. District 1 - Apartments"
        />
      </div>
      }

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
export class PinDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject(DynamicDialogConfig);

  regionsAvailable: any[] = [
    { name: 'b11', code: 'b11' },
    { name: 'b12', code: 'b12' },
    { name: 'b13', code: 'b13' },
    { name: 'b14', code: 'b14' },
    { name: 'b15', code: 'b15' },
  ];
  readonly form: FormGroup = this.fb.group({
    lat: [{ value: this.config.data?.lat || 0, disabled: true }],
    lng: [{ value: this.config.data?.lng || 0, disabled: true }],
    name: [''],
    blockNumber: [''],
  });

  ngOnInit() {
    if (this.config.data?.step === 2) {
      this.form.addControl('region', this.fb.control('', Validators.required));
    }
  }

  onCancel() {
    this.ref.close();
  }

  onCreate() {
    if (this.form.valid) {
      this.ref.close(this.form.getRawValue());
    }
  }
}
