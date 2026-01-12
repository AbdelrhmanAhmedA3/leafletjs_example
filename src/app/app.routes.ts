import { Routes } from '@angular/router';
import { MapViewerComponent } from './features/master-plan/components/map-viewer/map-viewer.component';

export const routes: Routes = [
  {
    path: '',
    component: MapViewerComponent,
  },
  {
    path: 'old-test',
    component: MapViewerComponent,
    data: { customerOnly: true },
  },
];
