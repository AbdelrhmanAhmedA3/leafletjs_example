import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
@Component({
  selector: 'app-pin-popup-component',
  imports: [InputTextModule, ReactiveFormsModule, ButtonModule],
  templateUrl: './pin-popup-component.html',
  styleUrl: './pin-popup-component.css',
})
export class PinPopupComponent {
  config = inject(DynamicDialogConfig);
  ref = inject(DynamicDialogRef);
  _fb = inject(FormBuilder);
  data = signal(this.config.data);
  popupForm = this._fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
  });

  cancel() {
    this.ref.close();
  }

  save() {
    this.ref.close({ ...this.popupForm.value, id: this.data()?.id });
  }
}
