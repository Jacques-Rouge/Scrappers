// Canonical interchange format shared by the game catalogue and objective editor.
// A definition contains only the card identity/value and one versioned motif.
const OBJECTIVE_FAMILIES = Object.freeze(["humains", "guerre", "veneration"]);
const OBJECTIVE_TOKENS = Object.freeze(["grid", "gun", "human", "dead"]);
const OBJECTIVE_THEMES = Object.freeze(["energie", "ressource", "humain", "construction", "science"]);
const FAMILY_DEFAULT_THEME = Object.freeze({ humains: "humain", guerre: "construction", veneration: "ressource" });

function createObjectiveDefinition(input) {
  if (!input || typeof input !== "object") throw new Error("Un objectif doit être un objet JSON.");
  const id = String(input.id || "").trim();
  const family = String(input.family || "");
  const theme = String(input.theme || FAMILY_DEFAULT_THEME[family] || "");
  const title = String(input.title || "").trim();
  const text = String(input.text || "").trim();
  const pts = Number(input.pts);
  const sourcePattern = input.pattern;
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) throw new Error("L’identifiant d’objectif est invalide.");
  if (!OBJECTIVE_FAMILIES.includes(family)) throw new Error(`Famille d’objectif inconnue : ${family}`);
  if (!OBJECTIVE_THEMES.includes(theme)) throw new Error(`Thème d’objectif inconnu : ${theme}`);
  if (!title) throw new Error("Le titre de l’objectif est requis.");
  if (!Number.isInteger(pts) || pts < 1 || pts > 6) throw new Error("Les points d’un objectif doivent être compris entre 1 et 6.");
  if (!sourcePattern || !Array.isArray(sourcePattern.cells) || sourcePattern.cells.length < 1 || sourcePattern.cells.length > 16) {
    throw new Error("Le motif doit contenir entre 1 et 8 hexagones, avec au plus un besoin par camp dans chaque hexagone.");
  }
  const criterion = sourcePattern.criterion === "gte" ? "sup_eq" : sourcePattern.criterion;
  if (criterion !== "eq" && criterion !== "sup_eq") throw new Error(`Critère d’objectif invalide : ${criterion}`);
  const cells = sourcePattern.cells.map((cell, index) => {
    const q = Number(cell.q), r = Number(cell.r), count = Number(cell.count ?? 1);
    if (!Number.isInteger(q) || !Number.isInteger(r)) throw new Error(`Coordonnées invalides pour l’hexagone ${index + 1}.`);
    if (!OBJECTIVE_TOKENS.includes(cell.token)) throw new Error(`Objet invalide pour l’hexagone ${index + 1}.`);
    if (cell.owner !== "ally" && cell.owner !== "enemy") throw new Error(`Propriétaire invalide pour l’hexagone ${index + 1}.`);
    const maxCount = cell.token === "gun" ? 1 : cell.token === "grid" ? 3 : 6;
    if (!Number.isInteger(count) || count < 1 || count > maxCount) {
      throw new Error(`Quantité invalide pour l’hexagone ${index + 1}.`);
    }
    return {
      q, r, token: cell.token, owner: cell.owner, count,
      ...(Number.isInteger(Number(cell.minTower)) && Number(cell.minTower) > 0 ? { minTower: Number(cell.minTower) } : {}),
    };
  });
  if (new Set(cells.map(cell => `${cell.q},${cell.r}`)).size > 8) throw new Error("Un motif ne peut pas utiliser plus de huit cases.");
  return { id, family, theme, title, pts, ...(text ? { text } : {}), pattern: { version: 1, criterion, cells } };
}

function normalizeObjectiveCatalog(definitions) {
  if (!Array.isArray(definitions)) throw new Error("Le catalogue d’objectifs doit être une liste.");
  const normalized = definitions.map(createObjectiveDefinition);
  const ids = new Set();
  for (const objective of normalized) {
    if (ids.has(objective.id)) throw new Error(`Identifiant d’objectif en double : ${objective.id}`);
    ids.add(objective.id);
  }
  return normalized;
}
