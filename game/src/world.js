// The kitchen itself: where every counter and station stands, what each
// cooking station is doing to the food on it, the two assembly plates, and
// the chef. Pure state and rules — drawing lives in render.js, the shift's
// flow in main.js.

import { BIN_ORDER, ITEMS, STATIONS } from './config.js';

export const VIEW = { width: 1280, height: 800 };
export const BOARD_BOTTOM = 150; // the order board occupies the top band

function rect(x, y, w, h) { return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }; }

// The fixed furniture. Bins line the front counter; the hot stations sit on
// the right, the chopping board on the left, assembly in the middle island,
// the serving hatch under the order board, and the trash by the door.
export function buildKitchen() {
  const bins = BIN_ORDER.map((itemId, i) => ({
    kind: 'bin', id: `bin-${itemId}`, itemId, rect: rect(70 + i * 148, 688, 128, 92),
  }));
  return {
    bins,
    board: { kind: 'station', station: 'board', rect: rect(56, 300, 216, 104) },
    grill: { kind: 'station', station: 'grill', rect: rect(1008, 268, 216, 112) },
    fryer: { kind: 'station', station: 'fryer', rect: rect(1008, 452, 216, 112) },
    assembly: { kind: 'assembly', rect: rect(430, 372, 420, 118) },
    hatch: { kind: 'hatch', rect: rect(470, 164, 340, 68) },
    trash: { kind: 'trash', rect: rect(56, 520, 130, 96) },
  };
}

// One cooking station's live state: empty, working on an item, holding a
// finished item, or holding a burnt one.
export function makeStationState() {
  return { itemId: null, phase: 'empty', progress: 0, burnLeft: 0 };
}

export class World {
  constructor() {
    this.kitchen = buildKitchen();
    this.stations = { board: makeStationState(), grill: makeStationState(), fryer: makeStationState() };
    this.plates = [[], []]; // two assembly plates, each a list of item ids
    this.chef = { x: 640, y: 560, facing: 1, carry: null, walkTarget: null, queuedAction: null };
  }

  reset() {
    this.stations = { board: makeStationState(), grill: makeStationState(), fryer: makeStationState() };
    this.plates = [[], []];
    this.chef = { x: 640, y: 560, facing: 1, carry: null, walkTarget: null, queuedAction: null };
  }

  // Advance every cooking station. Returns events ('ready' / 'burnt' with
  // the station name) so the caller can play sounds and flash the UI.
  updateStations(dt) {
    const events = [];
    for (const [name, state] of Object.entries(this.stations)) {
      if (state.phase === 'cooking') {
        state.progress += dt / STATIONS[name].cookSeconds;
        if (state.progress >= 1) {
          state.progress = 1;
          state.phase = 'done';
          state.itemId = Object.keys(ITEMS).find(id => ITEMS[id].from === state.itemId && ITEMS[id].station === name) ?? 'burnt';
          state.burnLeft = STATIONS[name].burnAfter;
          events.push({ type: 'ready', station: name });
        }
      } else if (state.phase === 'done' && Number.isFinite(state.burnLeft)) {
        state.burnLeft -= dt;
        if (state.burnLeft <= 0) {
          state.phase = 'burnt';
          state.itemId = 'burnt';
          events.push({ type: 'burnt', station: name });
        }
      }
    }
    return events;
  }

  // Can `itemId` start cooking on this station right now?
  canStartCooking(stationName, itemId) {
    if (this.stations[stationName].phase !== 'empty') return false;
    // An item cooks here when some finished item names it as its raw form.
    return Object.values(ITEMS).some(def => def.from === itemId && def.station === stationName);
  }

  startCooking(stationName, itemId) {
    const state = this.stations[stationName];
    state.itemId = itemId;
    state.phase = 'cooking';
    state.progress = 0;
    state.burnLeft = 0;
  }

  takeFromStation(stationName) {
    const state = this.stations[stationName];
    if (state.phase !== 'done' && state.phase !== 'burnt') return null;
    const itemId = state.itemId;
    state.itemId = null;
    state.phase = 'empty';
    state.progress = 0;
    return itemId;
  }

  // Everything the chef can use, with the point the chef must stand near.
  interactables() {
    const k = this.kitchen;
    const list = [
      { kind: 'hatch', rect: k.hatch.rect },
      { kind: 'assembly', rect: k.assembly.rect },
      { kind: 'trash', rect: k.trash.rect },
      { kind: 'station', station: 'board', rect: k.board.rect },
      { kind: 'station', station: 'grill', rect: k.grill.rect },
      { kind: 'station', station: 'fryer', rect: k.fryer.rect },
    ];
    for (const bin of k.bins) list.push({ kind: 'bin', itemId: bin.itemId, rect: bin.rect });
    return list;
  }

  nearestInteractable(x, y, maxDistance) {
    let best = null;
    let bestDistance = maxDistance;
    for (const target of this.interactables()) {
      const dx = Math.max(target.rect.x - x, 0, x - (target.rect.x + target.rect.w));
      const dy = Math.max(target.rect.y - y, 0, y - (target.rect.y + target.rect.h));
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) { best = target; bestDistance = distance; }
    }
    return best;
  }
}
