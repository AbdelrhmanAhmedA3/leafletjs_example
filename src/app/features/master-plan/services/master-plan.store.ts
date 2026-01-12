import { computed, effect, Injectable, signal } from '@angular/core';
import { MapLevel, Pin } from '../models/pin.model';

@Injectable({ providedIn: 'root' })
export class MasterPlanStore {
  readonly isAdminMode = signal<boolean>(false);

  readonly currentLevel = signal<MapLevel>({
    id: 'master',
    name: 'Master Plan',
    imageUrl: 'images/MasterPlan.jpg',
  });

  readonly navigationHistory = signal<MapLevel[]>([]);

  readonly pins = signal<Pin[]>([]);

  readonly currentLevelPins = computed(() =>
    this.pins().filter((p) => p.currentLevelImage === this.currentLevel().imageUrl)
  );

  constructor() {
    this.loadFromStorage();

    // Auto-save all relevant state components
    effect(() => {
      localStorage.setItem('mp_current_level', JSON.stringify(this.currentLevel()));
      localStorage.setItem('mp_nav_history', JSON.stringify(this.navigationHistory()));
      localStorage.setItem('mp_pins', JSON.stringify(this.pins()));
    });
  }

  toggleAdminMode() {
    this.isAdminMode.update((v) => !v);
  }

  navigateToLevel(level: MapLevel) {
    this.navigationHistory.update((history) => [...history, this.currentLevel()]);
    this.currentLevel.set(level);
  }

  goBack() {
    const history = this.navigationHistory();
    if (history.length > 0) {
      const lastLevel = history[history.length - 1];
      this.navigationHistory.set(history.slice(0, -1));
      this.currentLevel.set(lastLevel);
    }
  }

  addPin(pin: Pin) {
    this.pins.update((current) => [...current, pin]);
  }

  removePin(id: string) {
    this.pins.update((current) => current.filter((p) => p.id !== id));
  }

  private loadFromStorage() {
    try {
      const pinsData = localStorage.getItem('mp_pins');
      if (pinsData) this.pins.set(JSON.parse(pinsData));

      const currentLevelData = localStorage.getItem('mp_current_level');
      if (currentLevelData) this.currentLevel.set(JSON.parse(currentLevelData));

      const navHistoryData = localStorage.getItem('mp_nav_history');
      if (navHistoryData) this.navigationHistory.set(JSON.parse(navHistoryData));
    } catch (e) {
      console.error('Error loading MasterPlan state from storage', e);
    }
  }
}
