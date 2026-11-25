// Keyboard input for the chef. Movement reads `e.code` so WASD stays under
// the fingers on any keyboard layout; the interact key is an edge trigger —
// it reports true once per press, never while merely held.

export class Input {
  constructor() {
    this.held = new Set();
    this.pressedEdges = new Set();
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressedEdges.add(event.code);
      this.held.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.held.delete(event.code));
    window.addEventListener('blur', () => { this.held.clear(); this.pressedEdges.clear(); });
  }

  axis() {
    const left = this.held.has('KeyA') || this.held.has('ArrowLeft');
    const right = this.held.has('KeyD') || this.held.has('ArrowRight');
    const up = this.held.has('KeyW') || this.held.has('ArrowUp');
    const down = this.held.has('KeyS') || this.held.has('ArrowDown');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  }

  interactPressed() {
    const hit = this.pressedEdges.has('KeyE') || this.pressedEdges.has('Space') || this.pressedEdges.has('Enter');
    return hit;
  }

  // Eat the interact edge once it has fired, so one press can never trigger
  // two fixed-timestep updates in the same frame (pick up, then instantly
  // put back down).
  consumeInteract() {
    this.pressedEdges.delete('KeyE');
    this.pressedEdges.delete('Space');
    this.pressedEdges.delete('Enter');
  }

  endFrame() { this.pressedEdges.clear(); }
}
