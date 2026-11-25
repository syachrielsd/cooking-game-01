// Sizzle Street: Rush Hour Kitchen — the shift itself. Owns the game loop
// (fixed timestep, clamped so a background tab can never fast-forward the
// kitchen), the chef's movement and counter interactions, serving and
// scoring, and the posed scenes the screenshots are taken from.

import { ITEMS, RECIPES, SHIFT_SECONDS, MAX_STRIKES, comboMultiplier, spawnIntervalAt, tipFor } from './config.js';
import { Input } from './input.js';
import { SoundKit } from './audio.js';
import { makeRandom } from './random.js';
import { OrderBook } from './orders.js';
import { VIEW, World } from './world.js';
import { drawScene } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  phase: 'title', // 'title' | 'playing' | 'over' | 'posed'
  time: 0,
  world: new World(),
  orderBook: new OrderBook(),
  input: new Input(),
  sound: new SoundKit(),
  rand: makeRandom(20261125),
  shiftLeft: SHIFT_SECONDS,
  shiftTotal: SHIFT_SECONDS,
  coins: 0,
  streak: 0,
  bestStreak: 0,
  strikes: 0,
  served: 0,
  burntCount: 0,
  expiredCount: 0,
  popups: [],
  nearTarget: null,
  hintText: '',
  inputX: 0,
  inputY: 0,
  flashTicket: null,
  flashAge: 9,
};

function addPopup(x, y, text, color = '#2e7d1e') {
  game.popups.push({ x, y, text, color, age: 0 });
  if (game.popups.length > 6) game.popups.shift();
}

function resetShift() {
  game.world.reset();
  game.orderBook.reset();
  game.rand = makeRandom((Math.random() * 1e9) >>> 0);
  game.shiftLeft = SHIFT_SECONDS;
  game.coins = 0;
  game.streak = 0;
  game.bestStreak = 0;
  game.strikes = 0;
  game.served = 0;
  game.burntCount = 0;
  game.expiredCount = 0;
  game.popups = [];
  game.orderBook.spawnTimer = 0; // first ticket lands at once
}

// ---- interactions ---------------------------------------------------------

function hintFor(target) {
  const chef = game.world.chef;
  if (!target) return '';
  if (target.kind === 'bin') {
    return chef.carry ? 'Hands full!' : `E: Take ${ITEMS[target.itemId].name}`;
  }
  if (target.kind === 'station') {
    const state = game.world.stations[target.station];
    if (state.phase === 'done') return chef.carry ? 'Hands full!' : `E: Take ${ITEMS[state.itemId].name}`;
    if (state.phase === 'burnt') return chef.carry ? 'Hands full!' : 'E: Take burnt food (trash it)';
    if (state.phase === 'cooking') return 'Cooking…';
    if (chef.carry?.kind === 'item' && game.world.canStartCooking(target.station, chef.carry.id)) {
      return `E: Start ${ITEMS[chef.carry.id].name}`;
    }
    return 'Bring the right ingredient';
  }
  if (target.kind === 'assembly') {
    if (chef.carry?.kind === 'item') return `E: Plate the ${ITEMS[chef.carry.id].name}`;
    if (chef.carry?.kind === 'plate') return 'E: Put the plate down';
    return 'E: Pick up a plate';
  }
  if (target.kind === 'hatch') {
    return chef.carry?.kind === 'plate' ? 'E: SERVE the dish!' : 'Bring a finished plate';
  }
  if (target.kind === 'trash') return chef.carry ? 'E: Throw away' : 'Trash';
  return '';
}

function doInteract(target) {
  const world = game.world;
  const chef = world.chef;
  if (!target) return;
  if (target.kind === 'bin') {
    if (!chef.carry) {
      chef.carry = { kind: 'item', id: target.itemId };
      game.sound.pickup();
    }
    return;
  }
  if (target.kind === 'station') {
    const state = world.stations[target.station];
    if ((state.phase === 'done' || state.phase === 'burnt') && !chef.carry) {
      const id = world.takeFromStation(target.station);
      if (id) { chef.carry = { kind: 'item', id }; game.sound.pickup(); }
      return;
    }
    if (state.phase === 'empty' && chef.carry?.kind === 'item' && world.canStartCooking(target.station, chef.carry.id)) {
      world.startCooking(target.station, chef.carry.id);
      chef.carry = null;
      game.sound[target.station === 'board' ? 'chop' : 'sizzle']();
    }
    return;
  }
  if (target.kind === 'assembly') {
    if (chef.carry?.kind === 'item') {
      const plate = world.plates.find(p => p.length < 5);
      if (plate) { plate.push(chef.carry.id); chef.carry = null; game.sound.place(); }
      return;
    }
    if (chef.carry?.kind === 'plate') {
      const slot = world.plates.findIndex(p => p.length === 0);
      if (slot >= 0) { world.plates[slot] = chef.carry.items; chef.carry = null; game.sound.place(); }
      return;
    }
    const fullest = world.plates.reduce((best, p, i) => (p.length > (world.plates[best]?.length ?? 0) ? i : best), -1);
    if (fullest >= 0 && world.plates[fullest].length > 0) {
      chef.carry = { kind: 'plate', items: world.plates[fullest] };
      world.plates[fullest] = [];
      game.sound.pickup();
    }
    return;
  }
  if (target.kind === 'hatch') {
    if (chef.carry?.kind !== 'plate') return;
    const ticket = game.orderBook.matchPlate(chef.carry.items);
    if (!ticket) {
      game.sound.mistake();
      addPopup(chef.x, chef.y - 96, 'No ticket matches that plate!', '#d23c28');
      return;
    }
    const frac = game.orderBook.patienceFraction(ticket);
    const earned = Math.round((ticket.recipe.price + tipFor(frac)) * comboMultiplier(game.streak));
    game.coins += earned;
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.served += 1;
    game.orderBook.remove(ticket);
    chef.carry = null;
    game.sound.serve();
    addPopup(game.world.kitchen.hatch.rect.cx, game.world.kitchen.hatch.rect.y + game.world.kitchen.hatch.rect.h + 30, `+$${earned}`, '#2e7d1e');
    return;
  }
  if (target.kind === 'trash') {
    if (chef.carry) { chef.carry = null; game.sound.place(); }
  }
}

// ---- update ---------------------------------------------------------------

const CHEF_SPEED = 300;
const CHEF_RADIUS = 24;

function standPointFor(target) {
  const { rect } = target;
  return { x: Math.min(Math.max(game.world.chef.x, rect.x - 46), rect.x + rect.w + 46), y: rect.y + rect.h + 44 };
}

function updateChef(dt) {
  const chef = game.world.chef;
  const axis = game.input.axis();
  game.inputX = axis.x;
  game.inputY = axis.y;
  if (axis.x !== 0 || axis.y !== 0) {
    chef.walkTarget = null;
    chef.queuedAction = null;
    const len = Math.hypot(axis.x, axis.y) || 1;
    chef.x += (axis.x / len) * CHEF_SPEED * dt;
    chef.y += (axis.y / len) * CHEF_SPEED * dt;
    if (axis.x !== 0) chef.facing = Math.sign(axis.x);
  } else if (chef.walkTarget) {
    const dx = chef.walkTarget.x - chef.x;
    const dy = chef.walkTarget.y - chef.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      chef.walkTarget = null;
      if (chef.queuedAction) { doInteract(chef.queuedAction); chef.queuedAction = null; }
    } else {
      chef.x += (dx / dist) * CHEF_SPEED * dt;
      chef.y += (dy / dist) * CHEF_SPEED * dt;
      if (dx !== 0) chef.facing = Math.sign(dx);
    }
  }
  chef.x = Math.min(Math.max(chef.x, CHEF_RADIUS + 8), VIEW.width - CHEF_RADIUS - 8);
  chef.y = Math.min(Math.max(chef.y, 168 + CHEF_RADIUS), VIEW.height - CHEF_RADIUS - 8);
  game.nearTarget = game.world.nearestInteractable(chef.x, chef.y, 78);
  game.hintText = game.phase === 'playing' ? hintFor(game.nearTarget) : '';
  if (game.input.interactPressed() && game.phase === 'playing' && game.nearTarget) {
    game.input.consumeInteract();
    doInteract(game.nearTarget);
  }
}

function update(dt) {
  game.time += dt;
  game.flashAge += dt;
  for (const popup of game.popups) popup.age += dt;
  game.popups = game.popups.filter(p => p.age < 1.4);
  if (game.phase !== 'playing') { updateChefIdle(); return; }

  game.shiftLeft -= dt;
  const shiftFraction = 1 - game.shiftLeft / game.shiftTotal;
  const spawned = game.orderBook.maybeSpawn(game.rand, shiftFraction, spawnIntervalAt(shiftFraction), dt);
  if (spawned) { game.flashTicket = spawned; game.flashAge = 0; }

  for (const event of game.world.updateStations(dt)) {
    if (event.type === 'ready') game.sound.ready();
    if (event.type === 'burnt') { game.burntCount += 1; game.sound.strike(); }
  }

  const expired = game.orderBook.update(dt);
  for (const ticket of expired) {
    game.strikes += 1;
    game.expiredCount += 1;
    game.streak = 0;
    game.sound.strike();
    addPopup(320, 190, `Ticket #${ticket.number} walked out!`, '#d23c28');
  }

  updateChef(dt);

  if (game.strikes >= MAX_STRIKES || game.shiftLeft <= 0) {
    game.phase = 'over';
  }
}

function updateChefIdle() {
  if (game.phase === 'posed') return; // a posed scene keeps its highlight and hint
  game.nearTarget = null;
  game.hintText = '';
}

// ---- pointer --------------------------------------------------------------

canvas.addEventListener('pointerdown', (event) => {
  game.sound.unlock();
  const point = toLogical(event);
  if (game.phase === 'title' || game.phase === 'over') {
    resetShift();
    game.phase = 'playing';
    return;
  }
  if (game.phase !== 'playing') return;
  const target = game.world.interactables().find(t =>
    point.x >= t.rect.x - 14 && point.x <= t.rect.x + t.rect.w + 14 &&
    point.y >= t.rect.y - 14 && point.y <= t.rect.y + t.rect.h + 14);
  const chef = game.world.chef;
  if (target) {
    chef.walkTarget = standPointFor(target);
    chef.queuedAction = target;
  } else {
    chef.walkTarget = point;
    chef.queuedAction = null;
  }
});

window.addEventListener('keydown', (event) => {
  game.sound.unlock();
  if ((game.phase === 'title' || game.phase === 'over') && (event.code === 'Enter' || event.code === 'Space')) {
    resetShift();
    game.phase = 'playing';
  }
});

function toLogical(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * VIEW.width,
    y: ((event.clientY - bounds.top) / bounds.height) * VIEW.height,
  };
}

// ---- screenshot poses -----------------------------------------------------
// `?scene=<name>` poses a real mid-shift moment with the game's own state,
// so the maker's screenshots are honest renders of the game being played.

function poseScene(name) {
  const world = game.world;
  const book = game.orderBook;
  const byId = id => RECIPES.find(r => r.id === id);
  game.phase = 'posed';
  if (name === 'cover') {
    book.pinTicket(byId('deluxe'), 0.55);
    book.pinTicket(byId('cheesy-fries'), 0.82);
    book.pinTicket(byId('salad'), 0.34);
    world.plates[0] = ['bun', 'patty-grilled', 'cheese'];
    world.chef.x = 560; world.chef.y = 560; world.chef.facing = 1;
    world.chef.carry = { kind: 'item', id: 'tomato-slices' };
    world.stations.grill = { itemId: 'patty-raw', phase: 'cooking', progress: 0.62, burnLeft: 0 };
    world.stations.fryer = { itemId: 'fries', phase: 'done', progress: 1, burnLeft: 3.1 };
    game.shiftLeft = 97; game.coins = 86; game.streak = 3; game.strikes = 1;
    addPopup(world.kitchen.hatch.rect.cx, 268, '+$24', '#2e7d1e');
    game.popups[0].age = 0.3;
  } else if (name === 'rush') {
    book.pinTicket(byId('classic'), 0.48);
    book.pinTicket(byId('fry-basket'), 0.9);
    world.chef.x = 762; world.chef.y = 292; world.chef.facing = 1;
    world.chef.carry = { kind: 'plate', items: ['fries', 'cheese'] };
    world.stations.grill = { itemId: 'patty-grilled', phase: 'done', progress: 1, burnLeft: 1.1 };
    world.stations.board = { itemId: 'lettuce', phase: 'cooking', progress: 0.45, burnLeft: 0 };
    game.shiftLeft = 41; game.coins = 132; game.streak = 5; game.strikes = 0;
  } else if (name === 'salad') {
    book.pinTicket(byId('salad'), 0.7);
    book.pinTicket(byId('garden'), 0.45);
    book.pinTicket(byId('classic'), 0.86);
    world.plates[0] = ['lettuce-shredded', 'tomato-slices'];
    world.stations.board = { itemId: 'tomato-slices', phase: 'done', progress: 1, burnLeft: Infinity };
    world.stations.fryer = { itemId: 'potato', phase: 'cooking', progress: 0.5, burnLeft: 0 };
    world.chef.x = 380; world.chef.y = 470; world.chef.facing = 1;
    world.chef.carry = { kind: 'item', id: 'cheese' };
    game.shiftLeft = 118; game.coins = 57; game.streak = 2; game.strikes = 0;
  } else if (name === 'end') {
    book.pinTicket(byId('garden'), 0.6);
    world.plates[0] = ['bun', 'patty-grilled'];
    world.chef.x = 640; world.chef.y = 560;
    game.phase = 'over';
    game.served = 14; game.coins = 268; game.bestStreak = 7; game.burntCount = 2; game.expiredCount = 1;
    game.strikes = 1; game.shiftLeft = 0;
  }
  // Every pose keeps the live highlight and hint a player would see standing
  // there, so the screenshots read as gameplay, not a diorama.
  if (game.phase === 'posed') {
    game.nearTarget = world.nearestInteractable(world.chef.x, world.chef.y, 220);
    game.hintText = hintFor(game.nearTarget);
  }
}

// ---- boot and loop --------------------------------------------------------

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  canvas.width = Math.floor(VIEW.width * scale * dpr);
  canvas.height = Math.floor(VIEW.height * scale * dpr);
  ctx.setTransform(canvas.width / VIEW.width, 0, 0, canvas.height / VIEW.height, 0, 0);
}

window.addEventListener('resize', fitCanvas);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.sound.ctx?.suspend();
  else if (game.phase === 'playing') game.sound.unlock();
});

const scene = new URLSearchParams(window.location.search).get('scene');
if (scene) poseScene(scene);
fitCanvas();

let lastStamp = performance.now();
let accumulator = 0;
const STEP = 1 / 60;

function frame(now) {
  let dt = (now - lastStamp) / 1000;
  lastStamp = now;
  dt = Math.min(dt, 0.25); // a background tab can never fast-forward the shift
  accumulator += dt;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }
  game.input.endFrame();
  drawScene(ctx, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
