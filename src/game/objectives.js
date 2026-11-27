// Board rules for evaluating the declarative objective patterns in data.
function rotateAxial({ q, r }) {
  return { q: -r, r: q + r };
}

function rotatePatternCell(cell, steps) {
  let point = { q: cell.q, r: cell.r };
  for (let i = 0; i < steps; i++) point = rotateAxial(point);
  return { ...cell, ...point };
}

function countObjectivePieces(cell, token, playerId) {
  if (!cell) return 0;
  if (token === "human") return getHumanOwners(cell).filter(owner => owner === playerId).length;
  if (token === "dead") return (cell.deadHumans || []).filter(owner => owner === playerId).length;
  if (token === "gun") return cell.weapon === playerId ? 1 : 0;
  if (token === "grid") return getTowerOwners(cell).filter(owner => owner === playerId).length;
  return 0;
}

function countAllObjectivePieces(cell, token) {
  if (token === "human") return getHumanOwners(cell).length;
  if (token === "dead") return (cell.deadHumans || []).length;
  if (token === "gun") return cell.weapon === null ? 0 : 1;
  if (token === "grid") return getTowerOwners(cell).length;
  return 0;
}

function countEnemyObjectivePieces(cell, token, playerId) {
  if (token === "human") return getHumanOwners(cell).filter(owner => owner !== playerId).length;
  if (token === "dead") return (cell.deadHumans || []).filter(owner => owner !== playerId).length;
  if (token === "gun") return cell.weapon !== null && cell.weapon !== playerId ? 1 : 0;
  if (token === "grid") return getTowerOwners(cell).filter(owner => owner !== null && owner !== playerId).length;
  return 0;
}

function matchesObjectiveCell(board, playerId, requirement, q, r, criterion) {
  const cell = board.get(`${q},${r}`);
  if (!cell) return false;
  const actual = requirement.owner === "enemy"
    ? countEnemyObjectivePieces(cell, requirement.token, playerId)
    : countObjectivePieces(cell, requirement.token, playerId);
  const required = requirement.count || 1;
  const total = countAllObjectivePieces(cell, requirement.token);
  if (criterion === "eq" ? actual !== required || total !== required : actual < required) return false;
  if (requirement.minTower && cell.tower < requirement.minTower) return false;
  return true;
}

function matchesObjectivePattern(board, playerId, pattern) {
  if (!pattern?.cells?.length) return false;
  const anchors = [...board.values()];
  for (let rotation = 0; rotation < 6; rotation++) {
    const cells = pattern.cells.map(cell => rotatePatternCell(cell, rotation));
    for (const anchor of anchors) {
      if (cells.every(requirement => matchesObjectiveCell(
        board, playerId, requirement, anchor.q + requirement.q, anchor.r + requirement.r, pattern.criterion || "gte"
      ))) return true;
    }
  }
  return false;
}
