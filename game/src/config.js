// Sizzle Street: Rush Hour Kitchen — the game's data: ingredients, the ways
// the kitchen transforms them, the recipes customers order, and the timing
// that makes the rush bite harder the longer the shift runs.

// Every item the chef can hold, plate or serve. `from` names the raw item a
// station starts with, `station` the station that performs the transform.
export const ITEMS = {
  'bun':               { name: 'Bun',              color: '#e8b04b', dark: '#c07f2a' },
  'patty-raw':         { name: 'Raw Patty',        color: '#d97b6c', dark: '#a34a3c' },
  'patty-grilled':     { name: 'Grilled Patty',    color: '#8a4b2a', dark: '#5d2f18', from: 'patty-raw', station: 'grill' },
  'cheese':            { name: 'Cheese',           color: '#ffd94d', dark: '#e0a91c' },
  'tomato':            { name: 'Tomato',           color: '#e8452c', dark: '#b02a18' },
  'tomato-slices':     { name: 'Tomato Slices',    color: '#ff7a5c', dark: '#d84a2e', from: 'tomato', station: 'board' },
  'lettuce':           { name: 'Lettuce',          color: '#7ec850', dark: '#4d9427' },
  'lettuce-shredded':  { name: 'Shredded Lettuce', color: '#a5dd72', dark: '#6cb33d', from: 'lettuce', station: 'board' },
  'potato':            { name: 'Potato',           color: '#d9b380', dark: '#a97f4c' },
  'fries':             { name: 'Fries',            color: '#ffcf5e', dark: '#e09c1f', from: 'potato', station: 'fryer' },
  'burnt':             { name: 'Burnt!',           color: '#3a3230', dark: '#191413' },
};

// What each cooking station does, and how long it takes. Food left on a hot
// station after it is done burns once `burnAfter` extra seconds pass.
export const STATIONS = {
  board: { name: 'Chopping Board', verb: 'Chop',  cookSeconds: 2.2, burnAfter: Infinity },
  grill: { name: 'Grill',          verb: 'Grill', cookSeconds: 5.0, burnAfter: 4.0 },
  fryer: { name: 'Fryer',          verb: 'Fry',   cookSeconds: 4.0, burnAfter: 4.0 },
};

// The bins along the front counter, left to right: the raw ingredients the
// chef starts every dish from.
export const BIN_ORDER = ['bun', 'patty-raw', 'cheese', 'tomato', 'lettuce', 'potato'];

// The menu. A plate serves an order only when its items match a recipe
// exactly — no extras, nothing missing.
export const RECIPES = [
  { id: 'fry-basket',   name: 'Fry Basket',         price: 6,  needs: ['fries'] },
  { id: 'classic',      name: 'Classic Sizzle',     price: 12, needs: ['bun', 'patty-grilled', 'cheese'] },
  { id: 'cheesy-fries', name: 'Cheesy Fries',       price: 9,  needs: ['fries', 'cheese'] },
  { id: 'salad',        name: 'Garden Salad Bowl',  price: 11, needs: ['lettuce-shredded', 'tomato-slices', 'cheese'] },
  { id: 'garden',       name: 'Garden Stack',       price: 15, needs: ['bun', 'patty-grilled', 'lettuce-shredded', 'tomato-slices'] },
  { id: 'deluxe',       name: 'Deluxe Sizzle',      price: 18, needs: ['bun', 'patty-grilled', 'cheese', 'lettuce-shredded', 'tomato-slices'] },
];

// Shift shape: one shift, a hard clock, and pressure that grows inside it.
export const SHIFT_SECONDS = 150;
export const MAX_STRIKES = 3;
export const MAX_OPEN_ORDERS = 3;

// Difficulty inside the shift: `t` is the fraction of the shift elapsed.
export function spawnIntervalAt(t) { return 13 - 8 * t; }        // 13s -> 5s between orders
export function patienceAt(t, rand) { return (64 - 26 * t) * (0.85 + 0.3 * rand()); } // ~64s -> ~38s
export function recipePoolAt(t) {
  // Early orders stay simple; the full menu unlocks as the rush builds.
  if (t < 0.18) return RECIPES.filter(r => r.needs.length <= 3 && r.id !== 'garden');
  if (t < 0.5) return RECIPES.filter(r => r.id !== 'deluxe');
  return RECIPES;
}

// Scoring: the ticket price, plus a tip that follows the patience left, all
// scaled by the combo the chef has built with consecutive clean serves.
export function tipFor(patienceLeftFraction) { return Math.round(10 * Math.max(0, patienceLeftFraction)); }
export function comboMultiplier(streak) { return 1 + 0.25 * Math.min(streak, 8); }
