function initHexBoard(radius = 2) {
  state.board.clear();
  for (let q = -radius; q <= radius; q++) {
    let r1 = Math.max(-radius, -q - radius);
    let r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      state.board.set(`${q},${r}`, { q, r, tower: 0, human: null, weapon: null });
    }
  }
}

function isHexEdge(q, r) {
  for (const d of HEX_DIRS) {
    if (!state.board.has(`${q + d.q},${r + d.r}`)) return true;
  }
  return false;
}


