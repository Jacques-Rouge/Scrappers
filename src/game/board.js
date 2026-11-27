function initHexBoard(width = 5, height = 4) {
  state.board.clear();
  const firstColumn = -Math.floor(width / 2);
  for (let column = 0; column < width; column++) {
    const q = firstColumn + column;
    const rowOffset = Math.floor(q / 2);
    for (let row = 0; row < height; row++) {
      const r = row - rowOffset;
      state.board.set(`${q},${r}`, { q, r, tower: 0, towerOwners: [], human: null, humans: [], deadHumans: [], weapon: null });
    }
  }
}

function addHumanCorpse(cell, playerId) {
  if (!cell) return;
  if (!Array.isArray(cell.deadHumans)) cell.deadHumans = [];
  cell.deadHumans.push(playerId);
}

function getHumanOwners(cell) {
  if (!cell) return [];
  if (!Array.isArray(cell.humans)) cell.humans = [];
  if (cell.human !== null && cell.human !== undefined && cell.humans.length === 0) cell.humans.push(cell.human);
  return cell.humans;
}

function addHuman(cell, playerId) {
  if (!cell) return;
  getHumanOwners(cell).push(playerId);
  cell.human = cell.humans[0] ?? null;
}

function removeHuman(cell, playerId) {
  const owners = getHumanOwners(cell);
  const index = owners.indexOf(playerId);
  if (index < 0) return false;
  owners.splice(index, 1);
  cell.human = owners[0] ?? null;
  return true;
}

function getTowerOwners(cell) {
  if (!cell) return [];
  if (!Array.isArray(cell.towerOwners)) cell.towerOwners = Array(cell.tower || 0).fill(null);
  while (cell.towerOwners.length < cell.tower) cell.towerOwners.push(null);
  if (cell.towerOwners.length > cell.tower) cell.towerOwners.length = cell.tower;
  return cell.towerOwners;
}

function towerOwner(cell) {
  const owners = getTowerOwners(cell);
  return owners.length ? owners[owners.length - 1] : null;
}

function addTowerPiece(cell, playerId) {
  if (!cell || cell.tower >= 3) return false;
  getTowerOwners(cell).push(playerId);
  cell.tower++;
  return true;
}

function removeTowerPiece(cell) {
  if (!cell || cell.tower <= 0) return null;
  const owner = getTowerOwners(cell).pop() ?? null;
  cell.tower--;
  return owner;
}

function hexDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
}

function isHexEdge(q, r) {
  for (const d of HEX_DIRS) {
    if (!state.board.has(`${q + d.q},${r + d.r}`)) return true;
  }
  return false;
}


