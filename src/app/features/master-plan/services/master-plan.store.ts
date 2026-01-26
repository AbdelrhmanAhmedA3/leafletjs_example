import { computed, effect, Injectable, signal } from '@angular/core';
import { MapLevel, Pin } from '../models/pin.model';

@Injectable({ providedIn: 'root' })
export class MasterPlanStore {
  readonly isAdminMode = signal<boolean>(false);

  // Record of all levels, indexed by ID
  readonly levels = signal<Record<string, MapLevel>>({
    master: { id: 'master', name: 'Master Plan' },
  });

  readonly currentLevelId = signal<string>('master');

  readonly currentLevel = computed(() => this.levels()[this.currentLevelId()]);

  readonly navigationHistory = signal<string[]>([]);

  readonly pins = signal<Pin[]>([]);

  readonly currentLevelPins = computed(() =>
    this.pins().filter((p) => p.currentLevelImage === this.currentLevelId()),
  );

  constructor() {
    this.loadFromStorage();

    effect(() => {
      try {
        localStorage.setItem('mp_levels', JSON.stringify(this.levels()));
        localStorage.setItem('mp_current_level_id', this.currentLevelId());
        localStorage.setItem('mp_nav_history', JSON.stringify(this.navigationHistory()));
        localStorage.setItem('mp_pins', JSON.stringify(this.pins()));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded. Some data might not be saved.');
        } else {
          console.error('Error saving to LocalStorage', e);
        }
      }
    });
  }

  toggleAdminMode() {
    this.isAdminMode.update((v) => !v);
  }

  updateLevelImage(levelId: string, base64Image: string) {
    this.levels.update((prev) => ({
      ...prev,
      [levelId]: { ...prev[levelId], imageUrl: base64Image },
    }));
  }

  removeLevelImage(levelId: string) {
    this.levels.update((prev) => ({
      ...prev,
      [levelId]: { ...prev[levelId], imageUrl: undefined },
    }));
    this.pins.update((current) => current.filter((p) => p.currentLevelImage !== levelId));
  }

  navigateToLevel(levelId: string, name: string) {
    this.navigationHistory.update((history) => [...history, this.currentLevelId()]);

    // Ensure level exists in the record
    this.levels.update((prev) => ({
      ...prev,
      [levelId]: prev[levelId] || { id: levelId, name },
    }));

    this.currentLevelId.set(levelId);
  }

  goBack() {
    const history = this.navigationHistory();
    if (history.length > 0) {
      const lastLevelId = history[history.length - 1];
      this.navigationHistory.set(history.slice(0, -1));
      this.currentLevelId.set(lastLevelId);
    }
  }

  addPin(pin: Pin) {
    this.pins.update((current) => [...current, pin]);
  }

  updatePin(updatedPin: Pin) {
    this.pins.update((current) => current.map((p) => (p.id === updatedPin.id ? updatedPin : p)));
  }

  removePin(id: string) {
    this.pins.update((current) => current.filter((p) => p.id !== id));
  }

  private loadFromStorage() {
    try {
      const levelsData = localStorage.getItem('mp_levels');
      if (levelsData) this.levels.set(JSON.parse(levelsData));

      const currentId = localStorage.getItem('mp_current_level_id');
      if (currentId) this.currentLevelId.set(currentId);

      const pinsData = localStorage.getItem('mp_pins');
      if (pinsData) this.pins.set(JSON.parse(pinsData));

      const navHistoryData = localStorage.getItem('mp_nav_history');
      if (navHistoryData) this.navigationHistory.set(JSON.parse(navHistoryData));
    } catch (e) {
      console.error('Error loading MasterPlan state from storage', e);
    }
  }
}
