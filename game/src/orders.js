// The order book: the tickets pinned to the board above the kitchen. Each
// ticket is one recipe with a patience clock; serve it in time for the price
// plus a tip, let it lapse and the kitchen takes a strike.

import { MAX_OPEN_ORDERS, patienceAt, recipePoolAt } from './config.js';
import { pickFrom } from './random.js';

let nextTicketNumber = 1;

export class OrderBook {
  constructor() {
    this.tickets = [];
    this.spawnTimer = 0;
  }

  reset() {
    this.tickets = [];
    this.spawnTimer = 0;
    nextTicketNumber = 1;
  }

  // Spawn a ticket if the board has room and the spawn clock has run down.
  // Returns the new ticket, or null. The first ticket of a shift arrives at
  // once so the player always opens with something to cook.
  maybeSpawn(rand, shiftFraction, intervalSeconds, dt) {
    this.spawnTimer -= dt;
    if (this.tickets.length >= MAX_OPEN_ORDERS || this.spawnTimer > 0) return null;
    const recipe = pickFrom(rand, recipePoolAt(shiftFraction));
    const patience = patienceAt(shiftFraction, rand);
    const ticket = {
      number: nextTicketNumber++,
      recipe,
      patienceTotal: patience,
      patienceLeft: patience,
    };
    this.tickets.push(ticket);
    this.spawnTimer = intervalSeconds;
    return ticket;
  }

  // Pose helper for screenshots and the opening moment: pin a specific
  // recipe with a chosen patience fraction.
  pinTicket(recipe, patienceFraction) {
    const ticket = {
      number: nextTicketNumber++,
      recipe,
      patienceTotal: 60,
      patienceLeft: 60 * patienceFraction,
    };
    this.tickets.push(ticket);
    return ticket;
  }

  // Age every ticket; returns the ones whose patience ran out (they leave
  // the board and cost a strike each).
  update(dt) {
    const expired = [];
    for (const ticket of this.tickets) {
      ticket.patienceLeft -= dt;
      if (ticket.patienceLeft <= 0) expired.push(ticket);
    }
    if (expired.length) {
      this.tickets = this.tickets.filter(t => t.patienceLeft > 0);
    }
    return expired;
  }

  // Find the ticket a plate of items serves: the recipe's needs must match
  // the plate's contents exactly, as a multiset. Oldest matching ticket wins.
  matchPlate(itemIds) {
    const sorted = [...itemIds].sort().join('|');
    for (const ticket of this.tickets) {
      if ([...ticket.recipe.needs].sort().join('|') === sorted) return ticket;
    }
    return null;
  }

  remove(ticket) {
    this.tickets = this.tickets.filter(t => t !== ticket);
  }

  patienceFraction(ticket) {
    return Math.max(0, ticket.patienceLeft / ticket.patienceTotal);
  }
}
