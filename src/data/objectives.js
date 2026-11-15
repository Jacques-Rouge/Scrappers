const HEX_DIRS = [{q:1, r:0}, {q:1, r:-1}, {q:0, r:-1}, {q:-1, r:0}, {q:-1, r:1}, {q:0, r:1}];

const OBJECTIVES_DATA = [
  { id: "o1", pts: 1, text: "Avoir 2 de tes Humains adjacents", check: (board, pId) => countAdjacentHexHumans(board, pId) >= 1 },
  { id: "o2", pts: 2, text: "Avoir 3 de tes Humains sur le plateau", check: (board, pId) => countHexHumans(board, pId) >= 3 },
  { id: "o3", pts: 1, text: "Avoir 1 Humain sur une tour de hauteur >= 2", check: (board, pId) => hasHexHumanOnTower(board, pId, 2) },
  { id: "o4", pts: 2, text: "Contrôler une tour de hauteur 3", check: (board, pId) => hasHexHumanOnTower(board, pId, 3) },
  { id: "o5", pts: 1, text: "Avoir 1 Humain adjacent à un Humain adverse", check: (board, pId) => hasHexEnemyAdjacent(board, pId) },
  { id: "o6", pts: 2, text: "Avoir 4 Humains sur le plateau", check: (board, pId) => countHexHumans(board, pId) >= 4 },
  { id: "o7", pts: 1, text: "Avoir 1 Humain sur la case centrale (0,0)", check: (board, pId) => board.get("0,0")?.human === pId },
  { id: "o8", pts: 2, text: "Avoir 2 Humains chacun sur une tour >= 1", check: (board, pId) => countHexHumansOnTowers(board, pId, 1) >= 2 },
];

function countHexHumans(board, pId) {
  let c = 0;
  for (const cell of board.values()) { if (cell.human === pId) c++; }
  return c;
}

function countAdjacentHexHumans(board, pId) {
  let pairs = 0;
  for (const cell of board.values()) {
    if (cell.human === pId) {
      for (const d of HEX_DIRS) {
        const neighbor = board.get(`${cell.q + d.q},${cell.r + d.r}`);
        if (neighbor && neighbor.human === pId) pairs++;
      }
    }
  }
  return Math.floor(pairs / 2);
}

function hasHexHumanOnTower(board, pId, minH) {
  for (const cell of board.values()) { if (cell.human === pId && cell.tower >= minH) return true; }
  return false;
}

function countHexHumansOnTowers(board, pId, minH) {
  let count = 0;
  for (const cell of board.values()) { if (cell.human === pId && cell.tower >= minH) count++; }
  return count;
}

function hasHexEnemyAdjacent(board, pId) {
  for (const cell of board.values()) {
    if (cell.human === pId) {
      for (const d of HEX_DIRS) {
        const neighbor = board.get(`${cell.q + d.q},${cell.r + d.r}`);
        if (neighbor && neighbor.human !== null && neighbor.human !== pId) return true;
      }
    }
  }
  return false;
}

