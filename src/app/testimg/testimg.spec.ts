import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Testimg } from './testimg';

describe('Testimg', () => {
  let component: Testimg;
  let fixture: ComponentFixture<Testimg>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Testimg]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Testimg);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
