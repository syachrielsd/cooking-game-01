// Everything the player sees, drawn on one canvas: the order board and its
// tickets across the top, the kitchen floor and counters, the food (all of
// it drawn shapes — buns, patties, fries in a carton — never pictures), the
// chef, and the HUD. Readable at a glance is the house rule: big labels,
// patience bars that change colour, and a highlight on whatever the chef
// can use right now.

import { ITEMS, STATIONS } from './config.js';
import { BOARD_BOTTOM, VIEW } from './world.js';

const INK = '#2b1c12';
const PAPER = '#fff6e6';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(ctx, text, x, y, size, color = INK, align = 'center', weight = 800) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// ---- the food -------------------------------------------------------------
// One icon per item id, drawn from shapes so it reads at ticket size and at
// plate size alike.

export function drawItemIcon(ctx, itemId, x, y, size) {
  const def = ITEMS[itemId];
  if (!def) return;
  const s = size / 48; // icons are designed on a 48-unit grid
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(43,28,18,0.55)';
  switch (itemId) {
    case 'bun': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, -6, 17, 10, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.ellipse(0, 8, 17, 7, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff3cf';
      for (const [sx, sy] of [[-7, -11], [2, -14], [9, -9]]) { ctx.beginPath(); ctx.ellipse(sx, sy, 2.4, 1.4, 0.5, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'patty-raw':
    case 'patty-grilled': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 2, 18, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 2;
      if (itemId === 'patty-grilled') {
        for (const gx of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(gx - 3, -6); ctx.lineTo(gx + 3, 10); ctx.stroke(); }
      } else {
        ctx.fillStyle = def.dark;
        for (const [px, py] of [[-8, 0], [4, -4], [9, 5], [-2, 7]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = def.color;
      ctx.save();
      ctx.rotate(0.28);
      rr(ctx, -14, -12, 28, 24, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = def.dark;
      for (const [hx, hy] of [[-6, -4], [6, 3], [0, 8]]) { ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 3, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4d9427';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.ellipse(Math.cos(a) * 5, -9 + Math.sin(a) * 3, 5.5, 2.4, a, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(-6, -2, 4.5, 3, -0.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'tomato-slices': {
      for (const [ox, oy] of [[-9, 4], [9, 4], [0, -7]]) {
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffc9b8';
        ctx.beginPath(); ctx.arc(ox, oy, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = def.dark;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + 0.4;
          ctx.beginPath(); ctx.arc(ox + Math.cos(a) * 3, oy + Math.sin(a) * 3, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'lettuce':
    case 'lettuce-shredded': {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      const bumps = itemId === 'lettuce' ? 7 : 11;
      for (let i = 0; i <= bumps; i++) {
        const a = (i / bumps) * Math.PI * 2;
        const rad = 13 + (i % 2 === 0 ? 3.5 : 0);
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad * 0.82;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = def.dark;
      ctx.lineWidth = 1.8;
      for (const off of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(off, -8); ctx.quadraticCurveTo(off + 3, 0, off, 9); ctx.stroke(); }
      break;
    }
    case 'potato': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 2, 16, 12, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = def.dark;
      for (const [px, py] of [[-7, -2], [5, 5], [9, -5], [-1, 8]]) { ctx.beginPath(); ctx.arc(px, py, 1.7, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'fries': {
      ctx.fillStyle = def.dark;
      for (const [fx, tilt] of [[-10, -0.16], [-4, -0.05], [3, 0.06], [10, 0.17], [0, 0]]) {
        ctx.save(); ctx.translate(fx, -6); ctx.rotate(tilt);
        rr(ctx, -3.4, -15, 6.8, 22, 2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#d23c28';
      ctx.beginPath();
      ctx.moveTo(-15, -2); ctx.lineTo(15, -2); ctx.lineTo(11, 16); ctx.lineTo(-11, 16); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6e6';
      ctx.beginPath(); ctx.arc(0, 7, 4.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'burnt': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 5, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,110,105,0.8)';
      ctx.lineWidth = 2.4;
      for (const off of [-7, 3]) {
        ctx.beginPath(); ctx.moveTo(off, -6);
        ctx.bezierCurveTo(off - 5, -12, off + 5, -15, off, -22); ctx.stroke();
      }
      break;
    }
    default: {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- the room -------------------------------------------------------------

function drawOrderBoard(ctx, game) {
  ctx.fillStyle = '#4a2e1c';
  ctx.fillRect(0, 0, VIEW.width, BOARD_BOTTOM);
  ctx.fillStyle = '#5d3a22';
  ctx.fillRect(0, BOARD_BOTTOM - 12, VIEW.width, 12);
  label(ctx, 'ORDERS', 66, 26, 25, '#ffcf5e', 'left', 900);
  const { orderBook } = game;
  if (orderBook.tickets.length === 0) {
    label(ctx, 'waiting for the first customer…', 200, 92, 24, '#e8d5b5', 'left', 700);
  }
  orderBook.tickets.forEach((ticket, i) => {
    const x = 190 + i * 300;
    const y = 14;
    const w = 282, h = 122;
    ctx.save();
    if (game.flashTicket === ticket && game.flashAge < 0.4) ctx.translate(0, Math.sin(game.flashAge * 40) * 2);
    ctx.fillStyle = PAPER;
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#d23c28';
    rr(ctx, x, y, w, 30, 8); ctx.fill();
    ctx.fillRect(x, y + 22, w, 8);
    label(ctx, `#${ticket.number}  ${ticket.recipe.name}`, x + 12, y + 16, 19, '#ffffff', 'left', 900);
    label(ctx, `$${ticket.recipe.price}`, x + w - 12, y + 16, 19, '#ffe9a8', 'right', 900);
    ticket.recipe.needs.forEach((itemId, j) => {
      drawItemIcon(ctx, itemId, x + 34 + j * 52, y + 66, 44);
    });
    const frac = orderBook.patienceFraction(ticket);
    ctx.fillStyle = '#e5d9c3';
    rr(ctx, x + 12, y + h - 22, w - 24, 11, 5); ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#58b13c' : frac > 0.25 ? '#f2a71b' : '#d23c28';
    if (frac > 0) { rr(ctx, x + 12, y + h - 22, (w - 24) * frac, 11, 5); ctx.fill(); }
    ctx.restore();
  });
}

function drawHud(ctx, game) {
  const x = 1108;
  const timeLeft = Math.max(0, game.shiftLeft);
  const mm = Math.floor(timeLeft / 60);
  const ss = Math.floor(timeLeft % 60).toString().padStart(2, '0');
  const urgent = timeLeft <= 20 && game.phase === 'playing';
  label(ctx, `SHIFT ${mm}:${ss}`, x, 30, 27, urgent ? '#ff7a5c' : '#ffffff', 'left', 900);
  label(ctx, `$ ${game.coins}`, x, 66, 25, '#ffcf5e', 'left', 900);
  label(ctx, game.streak >= 2 ? `COMBO x${(1 + 0.25 * Math.min(game.streak, 8)).toFixed(2).replace(/\.?0+$/, '')} (${game.streak})` : 'COMBO —', x, 100, 19, game.streak >= 2 ? '#ffb03a' : '#cbb59a', 'left', 800);
  const strikes = '✕'.repeat(game.strikes) + '·'.repeat(Math.max(0, 3 - game.strikes));
  label(ctx, `STRIKES ${strikes}`, x, 130, 17, '#ff9d8a', 'left', 800);
}

function drawFloor(ctx) {
  ctx.fillStyle = '#cbb493';
  ctx.fillRect(0, BOARD_BOTTOM, VIEW.width, VIEW.height - BOARD_BOTTOM);
  ctx.fillStyle = '#c2a87f';
  const tile = 64;
  for (let ty = 0; ty < 11; ty++) {
    for (let tx = 0; tx < 20; tx++) {
      if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, BOARD_BOTTOM + ty * tile, tile, tile);
    }
  }
}

function drawCounter(ctx, rect, wood = '#8a5a33') {
  ctx.fillStyle = wood;
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
  ctx.fillStyle = '#d9c6a5';
  rr(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 8); ctx.fill();
}

function drawStation(ctx, game, furniture, state) {
  const { rect } = furniture;
  drawCounter(ctx, rect, furniture.station === 'board' ? '#7a6a4f' : '#5d4a3a');
  const def = STATIONS[furniture.station];
  label(ctx, def.name.toUpperCase(), rect.cx, rect.y + 18, 16, INK, 'center', 900);
  if (furniture.station === 'grill') {
    ctx.fillStyle = '#33302e';
    rr(ctx, rect.x + 16, rect.y + 30, rect.w - 32, rect.h - 44, 6); ctx.fill();
    ctx.strokeStyle = '#57524e'; ctx.lineWidth = 3;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(rect.x + 16 + i * ((rect.w - 32) / 5), rect.y + 34); ctx.lineTo(rect.x + 16 + i * ((rect.w - 32) / 5), rect.y + rect.h - 18); ctx.stroke(); }
  } else if (furniture.station === 'fryer') {
    ctx.fillStyle = '#e8a91c';
    rr(ctx, rect.x + 16, rect.y + 30, rect.w - 32, rect.h - 44, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,0.8)';
    for (const [bx, by] of [[50, 55], [110, 70], [165, 50], [80, 82], [150, 84]]) { ctx.beginPath(); ctx.arc(rect.x + bx, rect.y + by - 20, 4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = '#e9e2cf';
    rr(ctx, rect.x + 16, rect.y + 30, rect.w - 32, rect.h - 44, 6); ctx.fill();
    ctx.strokeStyle = '#b9ac8d'; ctx.lineWidth = 2;
    for (const off of [52, 74, 96]) { ctx.beginPath(); ctx.moveTo(rect.x + 26, rect.y + off - 20); ctx.lineTo(rect.x + rect.w - 26, rect.y + off - 26); ctx.stroke(); }
  }
  if (state.itemId) {
    drawItemIcon(ctx, state.itemId, rect.cx, rect.cy + 14, 52);
    if (state.phase === 'cooking') {
      ctx.fillStyle = 'rgba(43,28,18,0.75)';
      rr(ctx, rect.x + 18, rect.y + rect.h - 16, rect.w - 36, 8, 4); ctx.fill();
      ctx.fillStyle = '#ffb03a';
      rr(ctx, rect.x + 18, rect.y + rect.h - 16, (rect.w - 36) * state.progress, 8, 4); ctx.fill();
    } else if (state.phase === 'done') {
      const burning = Number.isFinite(state.burnLeft);
      label(ctx, burning && state.burnLeft < 1.6 ? 'TAKE IT — BURNING!' : 'READY!', rect.cx, rect.y + rect.h - 12, 15, burning && state.burnLeft < 1.6 ? '#d23c28' : '#2e7d1e', 'center', 900);
    } else if (state.phase === 'burnt') {
      label(ctx, 'BURNT — TRASH IT', rect.cx, rect.y + rect.h - 12, 14, '#d23c28', 'center', 900);
    }
  }
}

function drawBins(ctx, game) {
  for (const bin of game.world.kitchen.bins) {
    const { rect } = bin;
    ctx.fillStyle = '#8a5a33';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
    ctx.fillStyle = '#efe3cb';
    rr(ctx, rect.x + 6, rect.y + 6, rect.w - 12, 52, 8); ctx.fill();
    drawItemIcon(ctx, bin.itemId, rect.cx, rect.y + 32, 44);
    label(ctx, ITEMS[bin.itemId].name.toUpperCase(), rect.cx, rect.y + 74, 14.5, '#ffe9c4', 'center', 900);
  }
}

function drawPlate(ctx, items, cx, cy, radius) {
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9c2b2'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2); ctx.stroke();
  const spots = [[0, 0], [-0.42, -0.3], [0.42, -0.3], [-0.4, 0.36], [0.4, 0.36]];
  items.slice(0, 5).forEach((itemId, i) => {
    const [ox, oy] = spots[i];
    drawItemIcon(ctx, itemId, cx + ox * radius * 1.15, cy + oy * radius * 1.15, radius * 0.95);
  });
}

function drawAssembly(ctx, game) {
  const { rect } = game.world.kitchen.assembly;
  drawCounter(ctx, rect, '#8a5a33');
  label(ctx, 'ASSEMBLY — BUILD THE DISH ON A PLATE', rect.cx, rect.y + 17, 15, INK, 'center', 900);
  game.world.plates.forEach((items, i) => {
    drawPlate(ctx, items, rect.x + 118 + i * 190, rect.cy + 12, 44);
  });
}

function drawHatchAndTrash(ctx, game) {
  const hatch = game.world.kitchen.hatch.rect;
  ctx.fillStyle = '#37505e';
  rr(ctx, hatch.x, hatch.y, hatch.w, hatch.h, 10); ctx.fill();
  ctx.fillStyle = '#9fc6d8';
  rr(ctx, hatch.x + 10, hatch.y + 10, hatch.w - 20, hatch.h - 34, 6); ctx.fill();
  label(ctx, 'SERVE →', hatch.cx, hatch.y + hatch.h - 13, 17, '#ffe9a8', 'center', 900);
  const trash = game.world.kitchen.trash.rect;
  ctx.fillStyle = '#6b6f72';
  rr(ctx, trash.x + 18, trash.y + 16, trash.w - 36, trash.h - 20, 6); ctx.fill();
  ctx.fillStyle = '#54575a';
  rr(ctx, trash.x + 10, trash.y + 6, trash.w - 20, 14, 5); ctx.fill();
  label(ctx, 'TRASH', trash.cx, trash.y + trash.h + 14, 14, INK, 'center', 900);
}

function drawChef(ctx, game) {
  const chef = game.world.chef;
  const bob = game.phase === 'playing' && (game.inputX !== 0 || game.inputY !== 0) ? Math.sin(game.time * 18) * 2.4 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 30, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f3ea'; // whites
  rr(ctx, -21, -6, 42, 38, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(43,28,18,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#d23c28'; // apron
  rr(ctx, -13, 8, 26, 24, 5); ctx.fill();
  ctx.fillStyle = '#ffcf9e'; // head
  ctx.beginPath(); ctx.arc(0, -20, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; // toque
  ctx.beginPath(); ctx.ellipse(0, -36, 16, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  rr(ctx, -12, -38, 24, 8, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; // eyes, looking the way the chef faces
  ctx.beginPath(); ctx.arc(chef.facing * 4 - 5, -20, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chef.facing * 4 + 5, -20, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // What the chef carries floats just overhead, impossible to miss.
  if (chef.carry) {
    if (chef.carry.kind === 'item') {
      drawItemIcon(ctx, chef.carry.id, chef.x, chef.y - 66 + bob, 46);
    } else {
      drawPlate(ctx, chef.carry.items, chef.x, chef.y - 62 + bob, 30);
    }
  }
}

function drawHighlight(ctx, game) {
  const target = game.nearTarget;
  if (!target || (game.phase !== 'playing' && game.phase !== 'posed')) return;
  const { rect } = target;
  ctx.strokeStyle = '#ffb03a';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 6]);
  ctx.lineDashOffset = -game.time * 30;
  rr(ctx, rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10, 12); ctx.stroke();
  ctx.setLineDash([]);
  if (game.hintText) {
    ctx.font = "800 19px system-ui, 'Segoe UI', Arial, sans-serif";
    const w = ctx.measureText(game.hintText).width + 26;
    const x = Math.min(Math.max(rect.cx - w / 2, 8), VIEW.width - w - 8);
    const y = rect.y - 44 < BOARD_BOTTOM + 4 ? rect.y + rect.h + 10 : rect.y - 44;
    ctx.fillStyle = 'rgba(43,28,18,0.92)';
    rr(ctx, x, y, w, 32, 8); ctx.fill();
    label(ctx, game.hintText, x + w / 2, y + 17, 19, '#ffe9a8', 'center', 800);
  }
}

function drawPopups(ctx, game) {
  for (const popup of game.popups) {
    const rise = popup.age * 44;
    const alpha = Math.max(0, 1 - popup.age / 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    label(ctx, popup.text, popup.x, popup.y - rise, 26, popup.color, 'center', 900);
    ctx.restore();
  }
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(30,17,8,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  label(ctx, 'SIZZLE STREET', 640, 268, 84, '#ffcf5e', 'center', 900);
  label(ctx, 'RUSH HOUR KITCHEN', 640, 330, 40, '#fff6e6', 'center', 900);
  label(ctx, 'Tickets land on the board. Run the kitchen: grab ingredients, chop, grill, fry —', 640, 408, 24, '#e8d5b5', 'center', 700);
  label(ctx, 'build each dish on a plate and serve it before patience runs out.', 640, 442, 24, '#e8d5b5', 'center', 700);
  label(ctx, 'WASD / arrows to move · E or SPACE to use a station · or click a counter to walk there', 640, 496, 21, '#ffb03a', 'center', 800);
  label(ctx, 'Watch the grill and fryer: done food burns. Three strikes end the shift.', 640, 530, 21, '#ffb03a', 'center', 800);
  const pulse = 1 + Math.sin(game.time * 5) * 0.03;
  ctx.save();
  ctx.translate(640, 606); ctx.scale(pulse, pulse);
  ctx.fillStyle = '#d23c28';
  rr(ctx, -170, -32, 340, 64, 14); ctx.fill();
  label(ctx, 'CLICK OR PRESS ENTER TO START', 0, 2, 23, '#ffffff', 'center', 900);
  ctx.restore();
}

function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(30,17,8,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  label(ctx, game.strikes >= 3 ? 'SHIFT OVER — TOO MANY STRIKES' : 'SHIFT OVER — TIME!', 640, 250, 46, '#ff7a5c', 'center', 900);
  label(ctx, `You served ${game.served} dishes and earned $${game.coins}`, 640, 330, 34, '#fff6e6', 'center', 900);
  label(ctx, `Best combo streak: ${game.bestStreak} · Burnt food: ${game.burntCount} · Expired tickets: ${game.expiredCount}`, 640, 384, 23, '#e8d5b5', 'center', 700);
  label(ctx, 'CLICK OR PRESS ENTER TO COOK AGAIN', 640, 470, 24, '#ffcf5e', 'center', 900);
}

export function drawScene(ctx, game) {
  drawFloor(ctx);
  drawBins(ctx, game);
  drawStation(ctx, game, game.world.kitchen.board, game.world.stations.board);
  drawStation(ctx, game, game.world.kitchen.grill, game.world.stations.grill);
  drawStation(ctx, game, game.world.kitchen.fryer, game.world.stations.fryer);
  drawAssembly(ctx, game);
  drawHatchAndTrash(ctx, game);
  drawHighlight(ctx, game);
  drawChef(ctx, game);
  drawOrderBoard(ctx, game);
  drawHud(ctx, game);
  drawPopups(ctx, game);
  if (game.phase === 'title') drawTitle(ctx, game);
  if (game.phase === 'over') drawGameOver(ctx, game);
}
