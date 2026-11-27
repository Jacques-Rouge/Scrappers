// Objective patterns are plain data so the editor, engine and future card
// exports can share the same representation. Coordinates use axial hex q/r.
// count is the number of matching pieces required in that hex; guns are capped
// at one because forts cannot stack.
const HEX_DIRS = [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }];

const OBJECTIVE_PATTERNS = [
  // HUMANS — green
  { id: "hum-bataillon", family: "humains", title: "Bataillon", pts: 2, text: "Réunir trois Humains et un fort dans le même groupe.", image: "assets/objectives/objectif-bataillon.png", criterion: "eq", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: 0, token: "human", owner: "ally" }, { q: 0, r: 1, token: "human", owner: "ally" }, { q: 1, r: -1, token: "gun", owner: "ally" }] },
  { id: "hum-diagonal", family: "humains", title: "Diagonalisé", pts: 2, text: "Aligner exactement trois Humains alliés en diagonale.", image: "assets/objectives/objectif-diagonalise.png", criterion: "eq", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: -1, token: "human", owner: "ally" }, { q: 2, r: -2, token: "human", owner: "ally" }] },
  { id: "hum-double-date", family: "humains", title: "Double date", pts: 3, text: "Avoir exactement deux Humains alliés sur chacune de deux cases voisines.", image: "assets/objectives/objectif-double-date.png", criterion: "eq", cells: [{ q: 0, r: 0, token: "human", owner: "ally", count: 2 }, { q: 1, r: 0, token: "human", owner: "ally", count: 2 }] },
  { id: "hum-cinq", family: "humains", title: "Five Guys", pts: 4, text: "Former exactement le groupe illustré de quatre Humains alliés.", image: "assets/objectives/objectif-five-guys.png", criterion: "eq", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: 0, token: "human", owner: "ally" }, { q: 0, r: 1, token: "human", owner: "ally" }, { q: 1, r: -1, token: "human", owner: "ally" }] },
  { id: "hum-infiltration", family: "humains", title: "Infiltration", pts: 2, text: "Encadrer un Humain ennemi avec deux des tiens.", image: "assets/objectives/objectif-infiltration.png", criterion: "gte", cells: [{ q: -1, r: 1, token: "human", owner: "ally" }, { q: 0, r: 0, token: "human", owner: "enemy" }, { q: 1, r: -1, token: "human", owner: "ally" }] },
  { id: "hum-oups", family: "humains", title: "Oups", pts: 2, text: "Avoir exactement deux Humains alliés tombés au même endroit.", image: "assets/objectives/objectif-oups.png", criterion: "eq", cells: [{ q: 0, r: 0, token: "dead", owner: "ally", count: 2 }] },
  { id: "hum-reseau", family: "humains", title: "Réseau", pts: 2, text: "Occuper exactement les trois sommets d'un triangle avec tes Humains.", image: "assets/objectives/objectif-reseau.png", criterion: "eq", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: -1, token: "human", owner: "ally" }, { q: 0, r: 1, token: "human", owner: "ally" }] },
  { id: "hum-stagiaire", family: "humains", title: "Le stagiaire", pts: 1, text: "Placer deux Humains alliés en diagonale.", image: "assets/objectives/objectif-stagiaire.png", criterion: "gte", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: -1, token: "human", owner: "ally" }] },

  // WAR — factory red
  { id: "war-patrouille", family: "guerre", title: "Patrouille", pts: 1, text: "Avoir un fort allié sur le plateau.", criterion: "gte", cells: [{ q: 0, r: 0, token: "gun", owner: "ally" }] },
  { id: "war-batterie", family: "guerre", title: "Batterie", pts: 2, text: "Déployer deux forts alliés voisins.", criterion: "gte", cells: [{ q: 0, r: 0, token: "gun", owner: "ally" }, { q: 1, r: 0, token: "gun", owner: "ally" }] },
  { id: "war-croisee", family: "guerre", title: "Tir croisé", pts: 2, text: "Placer deux forts alliés de part et d'autre d'un Humain ennemi.", criterion: "gte", cells: [{ q: -1, r: 1, token: "gun", owner: "ally" }, { q: 0, r: 0, token: "human", owner: "enemy" }, { q: 1, r: -1, token: "gun", owner: "ally" }] },
  { id: "war-front", family: "guerre", title: "La ligne de front", pts: 2, text: "Former une ligne fort–Humain allié–fort.", criterion: "gte", cells: [{ q: -1, r: 1, token: "gun", owner: "ally" }, { q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: -1, token: "gun", owner: "ally" }] },
  { id: "war-siege", family: "guerre", title: "Siège", pts: 3, text: "Entourer une grille ennemie avec deux forts alliés.", criterion: "gte", cells: [{ q: -1, r: 1, token: "gun", owner: "ally" }, { q: 0, r: 0, token: "grid", owner: "enemy" }, { q: 1, r: -1, token: "gun", owner: "ally" }] },
  { id: "war-remparts", family: "guerre", title: "Remparts", pts: 2, text: "Placer un fort allié à côté d'une grille alliée de hauteur 2.", criterion: "gte", cells: [{ q: 0, r: 0, token: "gun", owner: "ally" }, { q: 1, r: -1, token: "grid", owner: "ally", count: 2 }] },
  { id: "war-intrusion", family: "guerre", title: "Intrusion", pts: 2, text: "Avoir un fort allié adjacent à un fort ennemi.", criterion: "gte", cells: [{ q: 0, r: 0, token: "gun", owner: "ally" }, { q: 1, r: -1, token: "gun", owner: "enemy" }] },
  { id: "war-triangulation", family: "guerre", title: "Triangulation", pts: 3, text: "Disposer trois forts alliés autour d'un Humain ennemi.", criterion: "gte", cells: [{ q: -1, r: 1, token: "gun", owner: "ally" }, { q: 1, r: -1, token: "gun", owner: "ally" }, { q: 0, r: 1, token: "gun", owner: "ally" }, { q: 0, r: 0, token: "human", owner: "enemy" }] },

  // VENERATION — blue nuts; grid stacks can reach height 3.
  { id: "ven-autel", family: "veneration", title: "Autel", pts: 1, text: "Posséder une grille alliée.", criterion: "gte", cells: [{ q: 0, r: 0, token: "grid", owner: "ally" }] },
  { id: "ven-offrande", family: "veneration", title: "Offrande", pts: 2, text: "Élever une grille alliée à deux étages.", criterion: "gte", cells: [{ q: 0, r: 0, token: "grid", owner: "ally", count: 2 }] },
  { id: "ven-pilier", family: "veneration", title: "Pilier", pts: 3, text: "Élever une grille alliée à trois étages.", criterion: "gte", cells: [{ q: 0, r: 0, token: "grid", owner: "ally", count: 3 }] },
  { id: "ven-jumeaux", family: "veneration", title: "Les deux piliers", pts: 2, text: "Posséder deux grilles alliées voisines.", criterion: "gte", cells: [{ q: 0, r: 0, token: "grid", owner: "ally" }, { q: 1, r: 0, token: "grid", owner: "ally" }] },
  { id: "ven-trinite", family: "veneration", title: "Trinité", pts: 3, text: "Former un triangle de trois grilles alliées.", criterion: "gte", cells: [{ q: 0, r: 0, token: "grid", owner: "ally" }, { q: 1, r: -1, token: "grid", owner: "ally" }, { q: 0, r: 1, token: "grid", owner: "ally" }] },
  { id: "ven-contraste", family: "veneration", title: "Le contraste", pts: 2, text: "Élever une grille alliée à côté d'une grille ennemie.", criterion: "gte", cells: [{ q: 0, r: 0, token: "grid", owner: "ally", count: 2 }, { q: 1, r: -1, token: "grid", owner: "enemy" }] },
  { id: "ven-gardien", family: "veneration", title: "Gardien du sanctuaire", pts: 2, text: "Placer un Humain allié à côté d'une grille alliée.", criterion: "gte", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: 0, token: "grid", owner: "ally" }] },
  { id: "ven-sommet", family: "veneration", title: "Le sommet", pts: 3, text: "Placer un Humain allié à côté d'une grille alliée de trois étages.", criterion: "gte", cells: [{ q: 0, r: 0, token: "human", owner: "ally" }, { q: 1, r: 0, token: "grid", owner: "ally", count: 3 }] },
].map(objective => createObjectiveDefinition({
  id: objective.id,
  family: objective.family,
  title: objective.title,
  text: objective.text,
  pts: objective.pts,
  pattern: { version: 1, criterion: objective.criterion, cells: objective.cells },
}));

// The game engine consumes this name when it builds the objective deck.
const OBJECTIVES_DATA = normalizeObjectiveCatalog(OBJECTIVE_PATTERNS);
