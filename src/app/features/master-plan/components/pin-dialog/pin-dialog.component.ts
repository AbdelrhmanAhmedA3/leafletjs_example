import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-pin-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule],
  template: `
    <form [formGroup]="form" class="flex flex-column gap-3 p-fluid">
      <div class="field flex flex-column gap-2">
        <label for="name" class="font-bold">Name</label>
        <input pInputText id="name" formControlName="name" placeholder="Enter pin name" />
      </div>

      <div class="field flex flex-column gap-2">
        <label for="blockNumber" class="font-bold">Area / Block Number</label>
        <input
          pInputText
          id="blockNumber"
          formControlName="blockNumber"
          placeholder="e.g. District 1 - Apartments"
        />
      </div>

      <div class="field flex flex-column gap-2">
        <label for="description" class="font-bold">Description</label>
        <textarea
          pTextarea
          id="description"
          formControlName="description"
          rows="3"
          placeholder="Short description..."
        ></textarea>
      </div>

      <div class="dialog-actions ">
        <p-button
          [style]="{ width: '100%' }"
          label="Cancel"
          severity="secondary"
          (onClick)="onCancel()"
        />
        <p-button
          [style]="{ width: '100%' }"
          label="Create"
          [disabled]="form.invalid"
          (onClick)="onCreate()"
        />
      </div>
    </form>
  `,
  styles: [
    `
      .field {
        display: grid;
        // gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .dialog-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: space-between;

        > * {
          flex: 1;
          button {
            width: 100%;
          }
        }
      }
    `,
  ],
})
export class PinDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);

  readonly form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    blockNumber: ['', Validators.required],
    description: ['', Validators.required],
  });

  onCancel() {
    this.ref.close();
  }

  onCreate() {
    if (this.form.valid) {
      this.ref.close(this.form.value);
    }
  }
}
