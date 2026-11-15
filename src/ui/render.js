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
    if (state.actionMode?.type !== "CHOOSE_PROD_TO_TAP") {
      btnEnd.textContent = "Passer"; btnEnd.classList.remove("hidden"); btnEnd.onclick = finishHumanCardAction;
    }
    if (state.actionMode?.type === "CHOOSE_PROD_TO_TAP") {
      actionOptions.innerHTML = state.players[0].prod.flatMap((slot, index) =>
        slot.rotation < 90 ? getProductionResourceOptions(slot).map(resource => {
          const angle = slot.rotation === 0 ? "45°" : "90°";
          return `<button onclick="tapProdForEffect(${index},'${resource}')">Tourner ${CARD_TYPES[slot.card.type].name} ${slot.card.value} à ${angle} → ${resource === "energie" ? "Énergie" : "Fer"} (perdue)</button>`;
        }) : []
      ).join("");
    }
  } else if (state.phase === "OVERWRITE_PROD") {
    banner.textContent = "Choisis une famille de production à détruire pour planter cette nouvelle famille.";
  } else if (state.phase === "CHOOSE_ACTION") {
    banner.textContent = "Choisis une action de la carte.";
    actionOptions.innerHTML = state.actionChoices.map((action, i) => `<button ${canPlayerUseAction(action) ? "" : "disabled"} onclick="chooseCardAction(${i})">${actionLabel(action)}</button>`).join("");
  } else if (state.phase === "PAY_RESOURCES") {
    const context = state.paymentContext;
    const bill = context?.bill || context?.alternatives?.[0] || {};
    banner.textContent = `Paie le coût en engageant ta production : ${Object.entries(bill).filter(([, amount]) => amount > 0).map(([resource, amount]) => `${amount} ${resource === "energie" ? "Énergie" : "Fer"}`).join(" + ") || "choisis une ressource"}.`;
    const options = context ? getPaymentTapOptions(context) : [];
    actionOptions.innerHTML = options.map(option => {
      const slot = state.players[0].prod[option.slotIndex];
      const angle = slot.rotation === 0 ? "45°" : "90°";
      return `<button onclick="tapProductionForPayment(${option.slotIndex},'${option.resource}')">Engager ${CARD_TYPES[slot.card.type].name} ${slot.card.value} → ${option.resource === "energie" ? "Énergie" : "Fer"} (${angle})</button>`;
    }).join("") || "<small>Aucun engagement disponible pour terminer ce coût.</small>";
  } else if (state.phase === "DRAFT") {
    banner.textContent = "Draft Objectif : Clique dans la rivière (colonne gauche).";
  }

  document.getElementById("players-summary").innerHTML = state.players.map(p =>
    `<div class="player-stat"><span><strong class="p${p.id}-color">J${p.id}</strong> ${p.name}</span><span><strong>${p.score} PV</strong> (${p.objectives.length}/4)</span></div>`
  ).join("");

  const canDraft = state.phase === "DRAFT" && state.draftOrder[state.draftIndex] === 0;
  document.getElementById("objective-river").innerHTML = state.objectiveRiver.map((o, idx) =>
    `<div class="obj-card ${canDraft ? "draftable" : ""}" onclick="draftObjective(${idx})"><strong>[${o.pts} PV]</strong> ${o.text}</div>`
  ).join("");

  document.getElementById("my-objectives").innerHTML = state.players[0].objectives.map(o =>
    `<div class="obj-card"><strong>[${o.pts} PV]</strong> ${o.text}</div>`
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
    ? renderCardHTML(entry.card, 0, false, `${state.players[entry.playerId].name}${entry.secret ? " · SECRET" : ""}`)
    : `<div class="hidden-play"><strong>Carte cachée</strong><span>${state.players[entry.playerId].name}</span><small>Effet ${CARD_TYPES[entry.effectType].name}</small></div>`).join("");

  // Rendu SVG Hexagonal
  const hexGroup = document.getElementById("hex-grid-group");
  hexGroup.innerHTML = "";
  const size = 38;

  for (const [key, cell] of state.board.entries()) {
    const x = size * (Math.sqrt(3) * cell.q + Math.sqrt(3)/2 * cell.r);
    const y = size * (3/2 * cell.r);
    const edge = isHexEdge(cell.q, cell.r);
    const mode = state.actionMode;
    const selectedFrom = mode?.selectedKey ? state.board.get(mode.selectedKey) : null;
    const adjacentToSelected = selectedFrom && (Math.abs(cell.q - selectedFrom.q) + Math.abs(cell.r - selectedFrom.r) + Math.abs(cell.q + cell.r - selectedFrom.q - selectedFrom.r)) / 2 === 1;
    const isAttackTarget = mode?.type === "ATTACK_HUMAN" && cell.human !== null && cell.human !== 0 && (!mode.fromKey || canAttackFrom(state.board.get(mode.fromKey), cell));
    const isSelectable = state.phase === "ACTION_RESOLVE" && (
      (mode?.type === "SPAWN_HUMAN" && cell.human === null && isAdjacentToPlayerHuman(cell.q, cell.r, 0)) ||
      (mode?.type === "BUILD" && cell.tower < 3) ||
      (mode?.type === "SACRIFICE_HUMAN" && cell.human === 0) ||
      (mode?.type === "ATTACH_WEAPON" && cell.human === 0) ||
      (mode?.type === "MOVE_ATTACK" && (!mode.selectedKey ? cell.human === 0 : cell.human === null && adjacentToSelected)) ||
      isAttackTarget
    );
    const isSelectedMove = mode?.type === "MOVE_ATTACK" && mode.selectedKey === key;

    let points = "";
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      points += `${x + size * 0.9 * Math.cos(angle)},${y + size * 0.9 * Math.sin(angle)} `;
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("onclick", `onHexClick(${cell.q}, ${cell.r})`);

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", points.trim());
    poly.setAttribute("class", `hex-tile ${edge ? "edge" : ""} ${isSelectable || isSelectedMove ? "selectable" : ""}`);
    g.appendChild(poly);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x); text.setAttribute("y", y - 10);
    text.setAttribute("fill", "#666"); text.setAttribute("font-size", "9px"); text.setAttribute("text-anchor", "middle");
    text.textContent = `${cell.q},${cell.r}`;
    g.appendChild(text);

    if (cell.tower > 0) {
      const towerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      towerText.setAttribute("x", x); towerText.setAttribute("y", y + 5);
      towerText.setAttribute("fill", "#ffd166"); towerText.setAttribute("font-size", "11px"); towerText.setAttribute("font-weight", "bold"); towerText.setAttribute("text-anchor", "middle");
      towerText.textContent = `🏛️ ${cell.tower}`;
      g.appendChild(towerText);
    }

    if (cell.human !== null) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x); circle.setAttribute("cy", y + 15); circle.setAttribute("r", "10");
      let colorHex = "#457b9d";
      if (cell.human === 1) colorHex = "#e07a5f";
      if (cell.human === 2) colorHex = "#81b29a";
      if (cell.human === 3) colorHex = "#f4a261";
      circle.setAttribute("fill", colorHex); circle.setAttribute("stroke", "#111"); circle.setAttribute("stroke-width", "1.5");
      g.appendChild(circle);

      const hText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      hText.setAttribute("x", x); hText.setAttribute("y", y + 19);
      hText.setAttribute("fill", "#fff"); hText.setAttribute("font-size", "9px"); hText.setAttribute("font-weight", "bold"); hText.setAttribute("text-anchor", "middle");
      hText.textContent = `J${cell.human}`;
      g.appendChild(hText);
    }
    if (cell.weapon !== null && cell.human !== null) {
      const gun = document.createElementNS("http://www.w3.org/2000/svg", "image");
      gun.setAttribute("href", "assets/token/token_gun.png");
      gun.setAttribute("x", x + 9); gun.setAttribute("y", y + 2);
      gun.setAttribute("width", "18"); gun.setAttribute("height", "18");
      g.appendChild(gun);
    }
    hexGroup.appendChild(g);
  }

  document.getElementById("action-hint").textContent = state.actionMode ? (
    { SPAWN_HUMAN: "Pose un Humain sur une case libre adjacente à l'un de tes Humains.", BUILD: "Pose une Grille.", MOVE_ATTACK: state.actionMode.selectedKey ? "Déplace vers une case voisine libre." : "Choisis l'Humain à déplacer.", ATTACK_HUMAN: "Choisis un Humain adverse à attaquer.", ATTACH_WEAPON: "Choisis l'Humain qui portera le pistolet.", ATTACK_TOWER: "Détruis une Grille ennemie.", SACRIFICE_HUMAN: "Choisis un de tes Humains à retirer.", UNTAP_PROD: `Clique sur ${state.actionMode.remaining} carte(s) de production engagée(s) pour les redresser.`, CHOOSE_PROD_TO_TAP: "Choisis une carte de production à engager." }[state.actionMode.type] || ""
  ) : "";

  const prodStacks = new Map();
  state.players[0].prod.forEach((slot, index) => {
    if (!prodStacks.has(slot.card.type)) prodStacks.set(slot.card.type, []);
    prodStacks.get(slot.card.type).push({ slot, index });
  });
  document.getElementById("my-prod").innerHTML = [...prodStacks].map(([type, cards]) =>
    `<div class="prod-family-stack"><strong>${CARD_TYPES[type].familyName} · ${cards.length}</strong><div class="prod-family-cards">${cards.map(({ slot, index }) =>
      `<div onclick="rotateProdSlot(${index})">${renderCardHTML(slot.card, slot.rotation, false)}</div>`
    ).join("")}</div></div>`
  ).join("");
  document.getElementById("resource-count").textContent = "Pas de réserve : chaque symbole engagé paie l'action en cours.";

  const faceDownButton = document.getElementById("btn-face-down");
  const canPlay = state.phase === "PLAY_TRICK" && state.currentPlayer === 0 && state.trickCards.length > 0;
  faceDownButton.classList.toggle("hidden", !canPlay);
  faceDownButton.textContent = state.pendingFaceDown ? "Annuler le jeu caché" : "Jouer une carte face cachée";
  faceDownButton.onclick = () => { state.pendingFaceDown = !state.pendingFaceDown; render(); };

  document.getElementById("my-hand").innerHTML = state.players[0].hand.map(c => {
    const isSel = state.selectedProdCards.some(sc => sc.id === c.id);
    const fn = state.phase === "PROD" ? `toggleProdSelection(${c.id})` : (state.pendingFaceDown ? `playHumanCardFaceDown(${c.id})` : `playHumanCard(${c.id})`);
    return `<div onclick="${fn}">${renderCardHTML(c, 0, isSel)}</div>`;
  }).join("");
}

function renderCardHTML(card, rotation = 0, selected = false, ownerTag = null) {
  const face = `
    <div class="card card-image type-${card.type} rot-${rotation} ${selected ? "selected" : ""}">
      <img class="card-image-face" src="assets/cards/${card.type}_${card.value}.png" alt="${CARD_TYPES[card.type].name} ${card.value}">
    </div>`;

  return ownerTag
    ? `<div class="card-display">${face}<span class="card-owner-tag">${ownerTag}</span></div>`
    : face;
}

