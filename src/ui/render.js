function render() {
  document.getElementById("round-num").textContent = state.round;
  document.getElementById("trick-num").textContent = `${state.trick}/5`;

  const banner = document.getElementById("phase-banner");
  const btnEnd = document.getElementById("btn-end-turn");
  const actionOptions = document.getElementById("action-options");
  btnEnd.classList.add("hidden");
  actionOptions.innerHTML = "";

  if (state.phase === "PROD") {
    banner.textContent = `Distribution : 7 cartes. Choisis exactement 2 cartes pour ta production (${state.selectedProdCards.length}/2).`;
    btnEnd.textContent = "Valider ma production"; btnEnd.classList.remove("hidden"); btnEnd.onclick = confirmProd;
  } else if (state.phase === "PLAY_TRICK") {
    const opening = state.trickCards.length === 0;
    banner.textContent = state.currentPlayer === 0 ? (opening ? "À toi de choisir la couleur du pli." : "À toi : joue visible ou copie la couleur face cachée.") : `Tour de ${state.players[state.currentPlayer].name}...`;
  } else if (state.phase === "ACTION_RESOLVE") {
    banner.textContent = state.actionMode?.type === "CHOOSE_PROD_TO_TAP" ? "Carte posée en production. Choisis une carte à tourner d'un cran." : "Résous l'action de la carte.";
    if (state.actionMode?.type !== "DISPLACE_HUMANS") {
      btnEnd.textContent = "Ignorer l'action"; btnEnd.classList.remove("hidden"); btnEnd.onclick = skipCurrentAction;
    }
    if (state.actionMode?.type === "CHOOSE_PROD_TO_TAP") {
      actionOptions.innerHTML = state.players[0].prod.flatMap((slot, index) =>
        slot.rotation < 90 ? getProductionResourceOptions(slot).map(resource => {
          const angle = `${getNextProductionRotation(slot)}°`;
          return `<button onclick="tapProdForEffect(${index},'${resource}')">Tourner ${CARD_TYPES[slot.card.type].name} ${slot.card.value} à ${angle} → ${resource === "energie" ? "Énergie" : "Fer"} (perdue)</button>`;
        }) : []
      ).join("");
    }
  } else if (state.phase === "CHOOSE_ACTION") {
    banner.textContent = "Choisis une action de la carte.";
    actionOptions.innerHTML = state.actionChoices.map((action, i) => `<button ${canPlayerUseAction(action) ? "" : "disabled"} onclick="chooseCardAction(${i})">${actionLabel(action)}</button>`).join("");
    btnEnd.textContent = "Ignorer la carte"; btnEnd.classList.remove("hidden"); btnEnd.onclick = skipCurrentAction;
  } else if (state.phase === "PAY_RESOURCES") {
    const context = state.paymentContext;
    const bill = context?.bill || context?.alternatives?.[0] || {};
    banner.textContent = `Paie le coût en engageant ta production : ${Object.entries(bill).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${amount} ${resource === "energie" ? "Énergie" : "Fer"}`).join(" + ") || "choisis une ressource"}.`;
    const options = context ? getPaymentTapOptions(context) : [];
    actionOptions.innerHTML = options.map(option => {
      const slot = state.players[0].prod[option.slotIndex];
      const angle = `${getNextProductionRotation(slot)}°`;
      return `<button onclick="tapProductionForPayment(${option.slotIndex},'${option.resource}')">Engager ${CARD_TYPES[slot.card.type].name} ${slot.card.value} → ${option.resource === "energie" ? "Énergie" : "Fer"} (${angle})</button>`;
    }).join("") || "<small>Aucun engagement disponible pour terminer ce coût.</small>";
    btnEnd.textContent = "Ignorer l'action"; btnEnd.classList.remove("hidden"); btnEnd.onclick = skipCurrentAction;
  } else if (state.phase === "DRAFT") {
    banner.textContent = state.players[0].objectives.length >= 4 && state.draftOrder[state.draftIndex] === 0
      ? "Tu as déjà quatre objectifs : ignore cette rivière."
      : "Draft Objectif : choisis dans les objectifs disponibles à droite.";
  } else if (state.phase === "CHECK_OBJECTIVES") {
    banner.textContent = `Vérification des objectifs — fin du pli ${state.trick} de la manche ${state.round}.`;
    btnEnd.textContent = state.trick < 5 ? "Pli suivant" : state.round >= 4 ? "Terminer la partie" : "Manche suivante";
    btnEnd.classList.remove("hidden"); btnEnd.onclick = continueAfterObjectiveCheck;
  } else if (state.phase === "GAME_OVER") {
    const highScore = Math.max(...state.players.map(player => player.score));
    const winners = state.players.filter(player => player.score === highScore).map(player => player.name);
    banner.textContent = winners.length === 1
      ? `Partie terminée — ${winners[0]} gagne avec ${highScore} PV.`
      : `Partie terminée — égalité entre ${winners.join(", ")} avec ${highScore} PV.`;
  }

  const canDraft = state.phase === "DRAFT" && state.draftOrder[state.draftIndex] === 0;
  const fullOnObjectives = state.players[0].objectives.length >= 4;
  document.getElementById("objective-river").innerHTML = state.objectiveRiver.map((o, idx) =>
    renderObjectiveHTML(o, canDraft && !fullOnObjectives, canDraft && !fullOnObjectives ? `draftObjective(${idx})` : "")
  ).join("") + (canDraft && fullOnObjectives ? '<button class="skip-objective" onclick="skipObjectiveDraft()">Ignorer la rivière</button>' : "");

  document.getElementById("my-objectives").innerHTML = state.players[0].objectives.map(o =>
    renderObjectiveHTML(o)
  ).join("") || "<small style='color:#777'>Aucun</small>";

  if (state.actionMode?.type === "SWAP_PROD_OWN") {
    actionOptions.innerHTML = `<strong>Choisis ta carte à échanger :</strong> ${state.players[0].prod.map((slot, i) => `<button onclick="chooseSwapProdOwn(${i})">${CARD_TYPES[slot.card.type].name} ${slot.card.value} · ${slot.rotation >= 90 ? "engagée" : "prête"}</button>`).join("")}`;
  } else if (state.actionMode?.type === "SWAP_PROD_TARGET") {
    const opponents = state.players.slice(1).filter(p => p.prod.length);
    const ownIndex = state.actionMode.ownIndex;
    actionOptions.innerHTML = `<strong>Choisis une carte adverse à échanger :</strong> ${opponents.flatMap(p => p.prod.map((slot, i) => `<button ${canSwapProdCards(state.players[0], ownIndex, p, i) ? "" : "disabled"} onclick="chooseSwapProdTarget(${p.id},${i})">${p.name} · ${CARD_TYPES[slot.card.type].name} ${slot.card.value} · ${slot.rotation >= 90 ? "engagée" : "prête"}</button>`)).join("")}`;
  }

  document.getElementById("lead-suit").textContent = state.trickCards.length > 0 ? CARD_TYPES[state.trickCards[0].card.type].name : "-";
  document.getElementById("trick-cards").innerHTML = state.trickCards.map(entry => entry.faceUp
    ? `<div class="trick-card"><div class="trick-face">${renderCardHTML(entry.card, 0, false)}</div><span class="trick-owner-tag">${state.players[entry.playerId].name}${entry.secret ? " · SECRET" : ""}</span></div>`
    : `<div class="trick-card"><div class="hidden-play"><strong>Face cachée</strong><span>${state.players[entry.playerId].name}</span><small>${CARD_TYPES[entry.effectType].name}</small></div></div>`).join("");

  // Rendu SVG Hexagonal
  const hexGroup = document.getElementById("hex-grid-group");
  hexGroup.innerHTML = "";
  const size = 42;
  const boardBounds = [...state.board.values()].map(cell => ({ ...cell, ...BoardGameRender.hexCenter(cell.q, cell.r, size) }));
  const hexExtent = size * 0.9, mapPadding = 8;
  const minX = Math.min(...boardBounds.map(cell => cell.x - hexExtent)) - mapPadding;
  const maxX = Math.max(...boardBounds.map(cell => cell.x + hexExtent)) + mapPadding;
  const minY = Math.min(...boardBounds.map(cell => cell.y - hexExtent)) - mapPadding;
  const maxY = Math.max(...boardBounds.map(cell => cell.y + hexExtent)) + mapPadding;
  document.getElementById("hex-svg").setAttribute("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
  const svgNS = "http://www.w3.org/2000/svg";
  const appendPieceIcon = (group, piece, owner, x, y, width, height, opacity = 1) => {
    const href = BoardGameRender.playerIconAsset(piece, owner);
    if (!href) return null;
    const image = document.createElementNS(svgNS, "image");
    image.setAttribute("href", href);
    image.setAttribute("x", x); image.setAttribute("y", y);
    image.setAttribute("width", width); image.setAttribute("height", height);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    if (opacity < 1) image.setAttribute("opacity", opacity);
    group.appendChild(image);
    return image;
  };
  const appendCount = (group, value, x, y, color = "#fff") => {
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x); text.setAttribute("y", y);
    text.setAttribute("fill", color); text.setAttribute("stroke", "#111"); text.setAttribute("stroke-width", "2.5");
    text.setAttribute("paint-order", "stroke"); text.setAttribute("font-size", "8px");
    text.setAttribute("font-weight", "900"); text.setAttribute("text-anchor", "middle");
    text.textContent = `×${value}`;
    group.appendChild(text);
  };

  for (const [key, cell] of state.board.entries()) {
    const { x, y } = BoardGameRender.hexCenter(cell.q, cell.r, size);
    const edge = isHexEdge(cell.q, cell.r);
    const mode = state.actionMode;
    const attackSource = mode?.type === "ATTACK_FROM_TOWER" && !mode.selectedKey && cell.weapon === 0;
    const attackTarget = mode?.type === "ATTACK_FROM_TOWER" && mode.selectedKey && getHumanOwners(cell).some(owner => owner !== 0) && hexDistance(state.board.get(mode.selectedKey), cell) === 1;
    const moveSource = mode?.type === "MOVE_HUMAN" && !mode.selectedKey && getHumanOwners(cell).includes(0);
    const moveTarget = mode?.type === "MOVE_HUMAN" && mode.selectedKey && getHumanMoveDestinations(state.board.get(mode.selectedKey)).some(destination => destination.q === cell.q && destination.r === cell.r);
    const isSelectable = state.phase === "ACTION_RESOLVE" && (
      (mode?.type === "SPAWN_HUMAN" && isHumanAllowed(cell) && isAdjacentToPlayerHuman(cell.q, cell.r, 0)) ||
      (mode?.type === "BUILD" && cell.tower < 3 && canEvacuateHumansFrom(cell) && isAdjacentToAnyHuman(cell.q, cell.r)) ||
      (mode?.type === "SACRIFICE_HUMAN" && getHumanOwners(cell).includes(0)) ||
      (mode?.type === "PLACE_WEAPON" && cell.weapon === null && canEvacuateHumansFrom(cell) && isAdjacentToPlayerHuman(cell.q, cell.r, 0)) ||
      (mode?.type === "DISPLACE_HUMANS" && getHumanMoveDestinations(state.board.get(mode.sourceKey)).some(destination => destination.q === cell.q && destination.r === cell.r)) ||
      moveSource || moveTarget || attackSource || attackTarget
    );

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("onclick", `onHexClick(${cell.q}, ${cell.r})`);

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", BoardGameRender.hexPoints(x, y, size * 0.9));
    poly.setAttribute("class", `hex-tile ${edge ? "edge" : ""} ${isSelectable || ((mode?.type === "ATTACK_FROM_TOWER" || mode?.type === "MOVE_HUMAN") && mode.selectedKey === key) ? "selectable" : ""}`);
    g.appendChild(poly);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x); text.setAttribute("y", y - 21);
    text.setAttribute("fill", "#666"); text.setAttribute("font-size", "8px"); text.setAttribute("text-anchor", "middle");
    text.textContent = `${cell.q},${cell.r}`;
    g.appendChild(text);

    if (cell.tower > 0) {
      const owners = getTowerOwners(cell);
      const towerIconSize = owners.length > 1 ? 48 : 64;
      owners.forEach((owner, index) => {
        const offset = index - (owners.length - 1) / 2;
        if (owner === null || owner === undefined) {
          const fallback = document.createElementNS(svgNS, "image");
          fallback.setAttribute("href", "assets/token/token_grid.png");
          fallback.setAttribute("x", x - towerIconSize / 2 + offset * 4); fallback.setAttribute("y", y - towerIconSize / 2 - index * 3);
          fallback.setAttribute("width", towerIconSize); fallback.setAttribute("height", towerIconSize);
          g.appendChild(fallback);
        } else appendPieceIcon(g, "grid", owner, x - towerIconSize / 2 + offset * 4, y - towerIconSize / 2 - index * 3, towerIconSize, towerIconSize);
      });
      if (cell.tower > 1) appendCount(g, cell.tower, x + 13, y + 7, "#ffd166");
    }

    if (cell.deadHumans?.length) {
      const deadByOwner = new Map();
      cell.deadHumans.forEach(owner => deadByOwner.set(owner, (deadByOwner.get(owner) || 0) + 1));
      [...deadByOwner.entries()].forEach(([owner, count], index, entries) => {
        const cx = x - 11 + (index - (entries.length - 1) / 2) * 10;
        appendPieceIcon(g, "human", owner, cx - 7, y - 16, 14, 14, .55);
        const mark = document.createElementNS(svgNS, "path");
        mark.setAttribute("d", `M${cx - 4} ${y - 13} L${cx + 4} ${y - 5} M${cx + 4} ${y - 13} L${cx - 4} ${y - 5}`);
        mark.setAttribute("stroke", "#d94b48"); mark.setAttribute("stroke-width", "2"); mark.setAttribute("stroke-linecap", "round");
        g.appendChild(mark);
        if (count > 1) appendCount(g, count, cx + 7, y - 4, "#fff");
      });
    }
    const humansHere = getHumanOwners(cell);
    if (humansHere.length) {
      const humansByOwner = new Map();
      humansHere.forEach(owner => humansByOwner.set(owner, (humansByOwner.get(owner) || 0) + 1));
      const ownersHere = [...humansByOwner.entries()];
      ownersHere.forEach(([owner, count], index) => {
        const cx = x + (index - (ownersHere.length - 1) / 2) * 13;
        appendPieceIcon(g, "human", owner, cx - 15, y - 5, 30, 30);
        if (count > 1) appendCount(g, count, cx + 7, y + 18);
      });
    }
    if (cell.weapon !== null) {
      appendPieceIcon(g, "gun", cell.weapon, x - 32, y - 32, 64, 64);
    }
    hexGroup.appendChild(g);
  }

  document.getElementById("action-hint").textContent = state.actionMode ? (
    { SPAWN_HUMAN: "Pose un Humain adjacent à l'un des tiens. Les Humains peuvent se grouper sur une case.", BUILD: "Pose une grille à côté d’au moins un Humain. Les humains présents sur cette case devront se déplacer.", PLACE_WEAPON: "Pose une arme à côté d’un de tes Humains. Les humains présents sur cette case devront se déplacer.", DISPLACE_HUMANS: "Déplace chacun de tes humains vers une case adjacente sans grille ni gun.", MOVE_HUMAN: state.actionMode.selectedKey ? "Choisis une case adjacente pour déplacer cet Humain." : "Choisis un de tes Humains à déplacer d’une case.", ATTACK_FROM_TOWER: state.actionMode.selectedKey ? "Choisis un Humain adverse adjacent à ce fort pour tirer." : "Choisis un de tes forts comme origine du tir.", SACRIFICE_HUMAN: "Choisis un de tes Humains à retirer.", UNTAP_PROD: `Clique sur ${state.actionMode.remaining} carte(s) de production engagée(s) pour les redresser.`, CHOOSE_PROD_TO_TAP: "Choisis une carte de production à engager." }[state.actionMode.type] || ""
  ) : "";

  const prodStacks = new Map();
  state.players[0].prod.forEach((slot, index) => {
    if (!prodStacks.has(slot.card.type)) prodStacks.set(slot.card.type, []);
    prodStacks.get(slot.card.type).push({ slot, index });
  });
  document.getElementById("my-prod").innerHTML = [...prodStacks].map(([type, cards]) =>
    `<div class="prod-family-stack"><strong>${CARD_TYPES[type].familyName}</strong><div class="prod-family-cards">${cards.map(({ slot, index }) => {
      const symbols = getProductionSymbolCount(slot);
      const usesLeft = getProductionUsesLeft(slot);
      const used = symbols - usesLeft;
      const markers = Array.from({ length: symbols }, (_, marker) => `<i class="prod-use-dot ${marker < used ? "used" : ""}"></i>`).join("");
      return `<div class="prod-mini" title="${CARD_TYPES[type].name} ${slot.card.value} · ${used}/${symbols} symbole(s) engagé(s)" onclick="rotateProdSlot(${index})"><div class="prod-card-remnant">${renderCardHTML(slot.card, slot.rotation, false)}</div><div class="prod-meter">${markers}</div><span class="prod-used-label">${used}/${symbols}</span></div>`;
    }).join("")}</div></div>`
  ).join("");
  document.getElementById("resource-count").textContent = "Symboles disponibles consommés au paiement des actions.";

  const faceDownButton = document.getElementById("btn-face-down");
  const canPlay = state.phase === "PLAY_TRICK" && state.currentPlayer === 0 && state.trickCards.length > 0;
  faceDownButton.classList.toggle("hidden", !canPlay);
  faceDownButton.textContent = state.pendingFaceDown ? "Annuler le jeu caché" : "Jouer une carte face cachée";
  faceDownButton.onclick = () => { state.pendingFaceDown = !state.pendingFaceDown; render(); };

  document.querySelector(".hand-panel").classList.toggle("setup-hand", state.phase === "PROD");
  document.getElementById("my-hand").innerHTML = state.players[0].hand.map(c => {
    const isSel = state.selectedProdCards.some(sc => sc.id === c.id);
    const fn = state.phase === "PROD" ? `toggleProdSelection(${c.id})` : (state.pendingFaceDown ? `playHumanCardFaceDown(${c.id})` : `playHumanCard(${c.id})`);
    return `<div class="hand-card" onclick="${fn}">${renderCardHTML(c, 0, isSel)}</div>`;
  }).join("");
}

function renderObjectiveHTML(objective, draftable = false, onclick = "") {
  return BoardGameObjectiveRenderer.render(objective, "ui", { draftable, onClick: onclick });
}

function renderCardHTML(card, rotation = 0, selected = false, ownerTag = null) {
  const face = BoardGameCardStudio.renderCardFace(card, { assetRoot: "assets", rotation, selected });

  return ownerTag
    ? `<div class="card-display">${face}<span class="card-owner-tag">${ownerTag}</span></div>`
    : face;
}

