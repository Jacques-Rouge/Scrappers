function initGame() {
  initHexBoard(5, 4);
  state.players = [
    { id: 0, name: "Toi", isBot: false, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
    { id: 1, name: "Bot Nord", isBot: true, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
    { id: 2, name: "Bot Est", isBot: true, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
    { id: 3, name: "Bot Ouest", isBot: true, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
  ];
  const objectiveCatalog = normalizeObjectiveCatalog([...OBJECTIVES_DATA, ...(window.GENERATED_OBJECTIVES || [])]);
  state.objectiveDeck = shuffle(Array.from({ length: 5 }, (_, copy) => objectiveCatalog.map(o => ({ ...o, id: `${o.id}_${copy}` }))).flat());
  state.objectiveRiver = [];
  state.players.forEach(p => { p.pieces.human = 0; spawnOnRandomHexEdge(p.id, "HUMAN"); });
  startRound();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function log(msg) { const el = document.getElementById("game-log"); if (el) { const row = document.createElement("div"); row.textContent = msg; el.prepend(row); } }

function startRound() {
  const deck = shuffle(createDeck());
  state.trick = 1; state.trickCards = []; state.selectedProdCards = [];
  state.roundHands = deck.slice(0, 28);
  state.players.forEach((p, i) => { p.hand = state.roundHands.slice(i * 7, (i + 1) * 7); p.prod = []; });
  for (let i = 1; i < 4; i++) botSetupProd(state.players[i]);
  state.phase = "PROD"; state.leadPlayer = (state.round - 1) % 4; state.currentPlayer = state.leadPlayer;
  log(`— Manche ${state.round} : choisissez 2 cartes de production, puis jouez 5 plis.`);
  render();
}

function botSetupProd(bot) {
  const picked = shuffle([...bot.hand]).slice(0, 2);
  bot.prod = picked.map(card => ({ card, rotation: 0 }));
  bot.hand = bot.hand.filter(c => !picked.some(p => p.id === c.id));
}

function toggleProdSelection(cardId) {
  if (state.phase !== "PROD") return;
  const p = state.players[0], card = p.hand.find(c => c.id === cardId);
  if (!card) return;
  const idx = state.selectedProdCards.findIndex(c => c.id === cardId);
  if (idx >= 0) state.selectedProdCards.splice(idx, 1);
  else if (state.selectedProdCards.length < 2) state.selectedProdCards.push(card);
  render();
}

function confirmProd() {
  const p = state.players[0];
  if (state.selectedProdCards.length !== 2) { log("Choisis exactement 2 cartes de production."); return; }
  p.prod = state.selectedProdCards.map(card => ({ card, rotation: 0 }));
  p.hand = p.hand.filter(c => !state.selectedProdCards.some(s => s.id === c.id));
  state.selectedProdCards = []; beginTrick();
}

function beginTrick() {
  state.phase = "PLAY_TRICK"; state.trickCards = []; state.currentPlayer = state.leadPlayer;
  state.pendingFaceDown = false; state.objectiveRiver = state.objectiveDeck.splice(0, 5);
  log(`— Pli ${state.trick}/5 : ${state.players[state.currentPlayer].name} choisit la couleur.`);
  processTurn();
}

function rotateProdSlot(slotIndex) {
  const p = state.players[0], slot = p.prod[slotIndex];
  if (!slot) return;
  if (state.actionMode?.type === "CHOOSE_PROD_TO_TAP") { tapProdForEffect(slotIndex); return; }
  if (state.phase === "PAY_RESOURCES" && state.paymentContext) {
    const options = getPaymentTapOptions(state.paymentContext).filter(option => option.slotIndex === slotIndex);
    if (options.length === 1) tapProductionForPayment(slotIndex, options[0].resource);
    return;
  }
  if (state.actionMode?.type === "UNTAP_PROD") {
    if (slot.rotation === 0) return;
    slot.rotation = 0; state.actionMode.remaining--;
    if (state.actionMode.remaining <= 0) finishHumanCardAction(); else render();
    return;
  }
  if (state.phase === "PLAY_TRICK" && state.currentPlayer === 0) log("Les cartes de production s'engagent pour payer une action.");
}

function getProductionResourceOptions(slot) {
  const symbols = slot.card.productionSymbols || CARD_TYPES[slot.card.type].prodSymbols;
  const options = new Set();
  for (const symbol of symbols) {
    if (symbol.includes("/")) {
      if (symbol.toUpperCase().includes("ÉN") || symbol.toUpperCase().includes("EN")) options.add("energie");
      if (symbol.toUpperCase().includes("FER") || symbol.includes("🧱")) options.add("ressource");
    } else if (symbol.toUpperCase().includes("FER") || symbol.includes("🧱")) options.add("ressource");
    else options.add("energie");
  }
  return [...options];
}

function getProductionSymbolCount(slot) {
  const symbols = slot.card.productionSymbols || CARD_TYPES[slot.card.type].prodSymbols;
  return Math.max(1, symbols.length);
}

function getProductionUsesLeft(slot) {
  const total = getProductionSymbolCount(slot);
  const used = slot.rotation === 45 ? 1 : slot.rotation >= 90 ? total : 0;
  return Math.max(0, total - used);
}

function getNextProductionRotation(slot) {
  const remaining = getProductionUsesLeft(slot);
  if (remaining <= 0) return slot.rotation;
  const used = getProductionSymbolCount(slot) - remaining + 1;
  return used >= getProductionSymbolCount(slot) ? 90 : 45;
}

function tapProductionSlot(player, slotIndex, resourceChoice = null) {
  const slot = player.prod[slotIndex];
  if (!slot || getProductionUsesLeft(slot) <= 0) { log("Cette carte de production est déjà engagée."); return; }
  const options = getProductionResourceOptions(slot);
  const resource = resourceChoice || options[0];
  if (!options.includes(resource)) return;
  slot.rotation = getNextProductionRotation(slot);
  return resource;
}

function tapProdForEffect(slotIndex, resource) {
  if (state.actionMode?.type !== "CHOOSE_PROD_TO_TAP") return;
  if (!resource) resource = getProductionResourceOptions(state.players[0].prod[slotIndex])[0];
  const produced = tapProductionSlot(state.players[0], slotIndex, resource);
  if (!produced) return;
  log(`${produced === "energie" ? "Énergie" : "Fer"} produit immédiatement, puis perdu (aucun coût à payer).`);
  finishHumanCardAction();
}

function tapProductionForPayment(slotIndex, resource) {
  if (state.phase !== "PAY_RESOURCES" || !state.paymentContext) return;
  const context = state.paymentContext;
  const option = getPaymentTapOptions(context).find(item => item.slotIndex === slotIndex && item.resource === resource);
  if (!option) return;
  const produced = tapProductionSlot(state.players[0], slotIndex, resource);
  if (!produced) return;
  context.bill = { ...option.billAfter };
  context.alternatives = null;
  log(`${produced === "energie" ? "Énergie" : "Fer"} produit et dépensé immédiatement.`);
  if (Object.values(context.bill).every(amount => amount <= 0)) {
    state.paymentContext = null;
    state.phase = "ACTION_RESOLVE";
    executePaidAction(state.players[0], context.action, true);
  } else render();
}

function processTurn() {
  render();
  if (state.trickCards.length === 4) { resolveTrickEnd(); return; }
  const p = state.players[state.currentPlayer];
  if (p?.isBot) setTimeout(() => playBotCard(p), 450);
}

function checkBonus(card) {
  if (!state.trickCards.length) return false;
  const lead = state.trickCards[0].card;
  return card.type === lead.type && card.value >= lead.value;
}

function playBotCard(bot) {
  if (state.phase !== "PLAY_TRICK" || state.players[state.currentPlayer] !== bot) return;
  const lead = state.trickCards[0]?.card;
  const card = bot.hand.shift();
  if (!card) { advancePlayer(); return; }
  const faceUp = !lead || Math.random() > 0.25;
  const qualifies = faceUp && checkBonus(card);
  const effectType = faceUp || !lead ? card.type : lead.type;
  state.pendingFaceDown = false;
  state.trickCards.push({ playerId: bot.id, card, faceUp, effectType, secret: qualifies });
  resolveCardEffect(bot, card, effectType, qualifies, false);
  log(`${bot.name} joue ${faceUp ? CARD_TYPES[card.type].name : "une carte cachée"}${qualifies ? " — effet secret !" : ""}`);
}

function playHumanCard(cardId, faceUp = true) {
  if (state.phase !== "PLAY_TRICK" || state.currentPlayer !== 0) return;
  const p = state.players[0], idx = p.hand.findIndex(c => c.id === cardId);
  if (idx < 0) return;
  const card = p.hand.splice(idx, 1)[0], lead = state.trickCards[0]?.card;
  if (!lead) faceUp = true;
  const qualifies = faceUp && !!lead && card.type === lead.type && card.value >= lead.value;
  const effectType = faceUp || !lead ? card.type : lead.type;
  state.pendingFaceDown = false;
  state.trickCards.push({ playerId: 0, card, faceUp, effectType, secret: qualifies });
  log(`Tu joues ${faceUp ? `${CARD_TYPES[card.type].name} ${card.value}` : `une carte cachée (effet ${CARD_TYPES[effectType].name})`}${qualifies ? " — effet secret !" : ""}`);
  resolveCardEffect(p, card, effectType, qualifies, true);
}

function playHumanCardFaceDown(cardId) { playHumanCard(cardId, false); }

function resolveCardEffect(player, card, type, secret, interactive) {
  state.pendingActionCard = card;
  state.pendingEffectType = type;
  state.pendingSecretActions = secret ? [...(card.secretActions || [])] : [];
  if (secret) {
    if (state.pendingSecretActions.length === 0) log("Effet secret déclenché (son action reste à définir). L'effet normal s'applique aussi.");
  }

  const familyActions = CARD_TYPES[type].normalActions || [];
  if (type === "science") {
    const available = scienceActionsFor(player, familyActions);
    if (available.length === 0) {
      log("Aucun badge correspondant dans ta production.");
      if (interactive) finishHumanCardAction(); else { checkAllObjectives(); advancePlayer(); }
    } else if (interactive) {
      state.actionQueue = available;
      finishHumanCardAction();
    } else applyBotScienceActions(player, card, available);
    return;
  }
  offerActionChoices(player, familyActions, interactive);
}

function scienceActionsFor(player, familyActions) {
  const spec = familyActions.find(action => action.conditions);
  if (!spec) return [];
  const badges = new Set(player.prod.flatMap(slot => slot.card.leftBadges || CARD_TYPES[slot.card.type].leftBadges || []));
  return spec.conditions.filter(condition => badges.has(condition.badge)).map(condition => ({
    id: `science_${condition.action}`, badge: condition.badge, scienceAction: condition.action,
  }));
}

function actionLabel(action) {
  const labels = {
    production_tap: "Envoyer cette carte en prod, puis engager une carte",
    tower_attack: "Tirer avec un fort sur une case adjacente",
    move_and_shoot: "Déplacer un Humain d’une case, puis tirer avec un fort",
    pay_resource_place_human: "Payer 1 Énergie ou 1 Fer pour poser un Humain",
    pay_energy_place_human: "Payer 1 Énergie pour poser un Humain",
    pay_fer_place_human: "Payer 1 Fer pour poser un Humain",
    sacrifice_human_untap_two: "Retirer un Humain pour redresser 2 cartes de production",
    pay_energy_and_fer_place_grid: "Payer 1 Énergie + 1 Fer : poser une Grille",
    pay_energy_and_fer_create_weapon: "Payer 1 Énergie + 1 Fer : créer une Arme",
    science_production: "Science : envoyer cette carte en production",
    science_swap_production: "Usine : échanger une carte de production avec un adversaire",
    science_take_main: "Humain : prendre l'initiative",
  };
  return labels[action.id] || `Action : ${action.id}`;
}

function getTapActivations(player) {
  const activations = [];
  player.prod.forEach((slot, slotIndex) => {
    const usesLeft = getProductionUsesLeft(slot);
    const resourceOptions = getProductionResourceOptions(slot);
    for (let use = 0; use < usesLeft; use++) activations.push({ slotIndex, resourceOptions });
  });
  return activations;
}

function findPaymentPlan(player, bill) {
  const demands = Object.entries(bill).flatMap(([resource, amount]) => Array.from({ length: Math.max(0, amount) }, () => resource));
  const activations = getTapActivations(player);
  function assign(remaining, used) {
    if (!remaining.length) return [];
    const resource = remaining[0];
    for (let i = 0; i < activations.length; i++) {
      if (used.has(i) || !activations[i].resourceOptions.includes(resource)) continue;
      const nextUsed = new Set(used); nextUsed.add(i);
      const rest = assign(remaining.slice(1), nextUsed);
      if (rest) return [{ slotIndex: activations[i].slotIndex, resource }, ...rest];
    }
    return null;
  }
  return assign(demands, new Set());
}

function canPayWithProduction(player, bills) {
  return bills.some(bill => findPaymentPlan(player, bill) !== null);
}

function getPaymentTapOptions(context) {
  const player = state.players[context.playerId];
  const bills = context.bill ? [context.bill] : context.alternatives;
  const options = [];
  player.prod.forEach((slot, slotIndex) => {
    if (getProductionUsesLeft(slot) <= 0) return;
    for (const resource of getProductionResourceOptions(slot)) {
      for (const bill of bills) {
        if ((bill[resource] || 0) <= 0) continue;
        const billAfter = { ...bill, [resource]: bill[resource] - 1 };
        const remaining = Object.values(billAfter).every(amount => amount <= 0);
        const simulated = { ...player, prod: player.prod.map((item, i) => i === slotIndex ? { ...item, rotation: getNextProductionRotation(item) } : { ...item }) };
        if (remaining || findPaymentPlan(simulated, billAfter)) options.push({ slotIndex, resource, billAfter });
      }
    }
  });
  return options;
}

function startPayment(player, bills, action, interactive) {
  if (!canPayWithProduction(player, bills)) {
    log("Ta production n'a pas les symboles disponibles pour payer ce coût.");
    if (interactive) finishHumanCardAction(); else advancePlayer();
    return;
  }
  if (!interactive) {
    const bill = bills.find(candidate => findPaymentPlan(player, candidate));
    const plan = findPaymentPlan(player, bill);
    for (const tap of plan) tapProductionSlot(player, tap.slotIndex, tap.resource);
    log("Coût payé en engageant la production.");
    executePaidAction(player, action, false);
    return;
  }
  state.paymentContext = {
    playerId: player.id,
    bill: bills.length === 1 ? { ...bills[0] } : null,
    alternatives: bills.length > 1 ? bills.map(bill => ({ ...bill })) : null,
    action,
    initialRotations: player.prod.map(slot => slot.rotation),
  };
  state.phase = "PAY_RESOURCES";
  render();
}

function canPlayerUseAction(action, player = state.players[0]) {
  if (action.id === "pay_resource_place_human") return canPayWithProduction(player, [{ energie: 1 }, { ressource: 1 }]);
  if (action.id === "pay_energy_place_human") return canPayWithProduction(player, [{ energie: 1 }]);
  if (action.id === "pay_fer_place_human") return canPayWithProduction(player, [{ ressource: 1 }]);
  if (action.id === "pay_energy_and_fer_place_grid") return canPayWithProduction(player, [{ energie: 1, ressource: 1 }]) && canPlaceGrid();
  if (action.id === "pay_energy_and_fer_create_weapon") return canPayWithProduction(player, [{ energie: 1, ressource: 1 }]) && canPlaceWeapon(player.id);
  return true;
}

function offerActionChoices(player, actions, interactive) {
  if (!actions.length) {
    if (interactive) finishHumanCardAction(); else { checkAllObjectives(); advancePlayer(); }
    return;
  }
  if (interactive) {
    state.actionChoices = actions;
    state.actionQueue = null;
    state.phase = "CHOOSE_ACTION";
    render();
  } else {
    const action = actions.find(a => botCanUseAction(player, a));
    if (action) performCardAction(player, action, false);
    else { checkAllObjectives(); advancePlayer(); }
  }
}

function botCanUseAction(player, action) {
  return canPlayerUseAction(action, player);
}

function chooseCardAction(index) {
  if (state.phase !== "CHOOSE_ACTION") return;
  const action = state.actionChoices[index];
  if (!action || !canPlayerUseAction(action)) return;
  state.actionChoices = [];
  performCardAction(state.players[0], action, true);
}

function skipCurrentAction() {
  if (!["CHOOSE_ACTION", "ACTION_RESOLVE", "PAY_RESOURCES"].includes(state.phase)) return;
  if (state.actionMode?.type === "DISPLACE_HUMANS") return;
  if (state.phase === "PAY_RESOURCES") {
    const initialRotations = state.paymentContext?.initialRotations;
    if (initialRotations) state.players[0].prod.forEach((slot, index) => { slot.rotation = initialRotations[index]; });
    state.paymentContext = null;
  }
  state.actionChoices = [];
  state.actionQueue = null;
  state.pendingSecretActions = [];
  state.actionMode = null;
  log("Carte ignorée : aucun effet résolu.");
  finishHumanCardAction();
}

function chooseSwapProdOwn(index) {
  if (state.actionMode?.type !== "SWAP_PROD_OWN" || !state.players[0].prod[index]) return;
  state.actionMode = { type: "SWAP_PROD_TARGET", ownIndex: index };
  render();
}

function canSwapProdCards(playerA, indexA, playerB, indexB) {
  return !!playerA.prod[indexA] && !!playerB.prod[indexB];
}

function chooseSwapProdTarget(playerId, slotIndex) {
  if (state.actionMode?.type !== "SWAP_PROD_TARGET") return;
  const player = state.players[0], opponent = state.players[playerId];
  const own = player.prod[state.actionMode.ownIndex];
  const other = opponent?.prod[slotIndex];
  if (!own || !other) return;
  player.prod[state.actionMode.ownIndex] = other;
  opponent.prod[slotIndex] = own;
  log(`Carte de production échangée avec ${opponent.name}.`);
  finishHumanCardAction();
}

function placeCardInProduction(player, card, interactive) {
  player.prod.push({ card, rotation: 0 });
  return true;
}

function performCardAction(player, action, interactive) {
  const card = state.pendingActionCard;
  const id = action.id;
  if (id === "production_tap") {
    placeCardInProduction(player, card, interactive);
    if (interactive) { state.actionMode = { type: "CHOOSE_PROD_TO_TAP" }; state.phase = "ACTION_RESOLVE"; render(); }
    else {
      const idx = player.prod.findIndex(slot => slot.rotation < 90);
      if (idx >= 0) tapProductionSlot(player, idx);
      log("Le symbole produit est perdu : aucun coût n'est en cours de paiement.");
      checkAllObjectives(); advancePlayer();
    }
  } else if (id === "science_production") {
    placeCardInProduction(player, card, interactive);
    if (interactive) finishHumanCardAction();
    else { checkAllObjectives(); advancePlayer(); }
  } else if (id === "tower_attack") {
    if (interactive) { state.actionMode = { type: "ATTACK_FROM_TOWER" }; state.phase = "ACTION_RESOLVE"; render(); }
    else { botFortShoot(player.id); checkAllObjectives(); advancePlayer(); }
  } else if (id === "move_and_shoot") {
    if (interactive) { state.actionMode = { type: "MOVE_HUMAN" }; state.phase = "ACTION_RESOLVE"; render(); }
    else { botMoveAndShoot(player.id); checkAllObjectives(); advancePlayer(); }
  } else if (id === "pay_energy_place_human" || id === "pay_fer_place_human" || id === "pay_resource_place_human") {
    const bills = id === "pay_fer_place_human" ? [{ ressource: 1 }] : id === "pay_energy_place_human" ? [{ energie: 1 }] : [{ energie: 1 }, { ressource: 1 }];
    startPayment(player, bills, action, interactive);
  } else if (id === "sacrifice_human_untap_two") {
    if (interactive) { state.actionMode = { type: "SACRIFICE_HUMAN" }; state.phase = "ACTION_RESOLVE"; render(); }
    else { const human = [...state.board.values()].find(cell => getHumanOwners(cell).includes(player.id)); if (human) { addHumanCorpse(human, player.id); removeHuman(human, player.id); player.pieces.human = Math.max(0, player.pieces.human - 1); } player.prod.slice(0, 2).forEach(slot => { slot.rotation = 0; }); checkAllObjectives(); advancePlayer(); }
  } else if (id === "pay_energy_and_fer_place_grid" || id === "pay_energy_and_fer_create_weapon") {
    startPayment(player, [{ energie: 1, ressource: 1 }], action, interactive);
  } else if (id === "science_swap_production") {
    if (interactive) { state.actionMode = { type: "SWAP_PROD_OWN" }; state.phase = "ACTION_RESOLVE"; render(); }
    else {
      const opponent = state.players.find(p => p.id !== player.id && p.prod.length);
      const pair = opponent && player.prod.flatMap((_, ownIndex) => opponent.prod.map((__, targetIndex) => ({ ownIndex, targetIndex })))
        .find(({ ownIndex, targetIndex }) => canSwapProdCards(player, ownIndex, opponent, targetIndex));
      if (pair) [player.prod[pair.ownIndex], opponent.prod[pair.targetIndex]] = [opponent.prod[pair.targetIndex], player.prod[pair.ownIndex]];
      checkAllObjectives(); advancePlayer();
    }
  } else if (id === "science_take_main") {
    state.forcedLeadPlayer = player.id;
    log(`${player.name} prend l'initiative.`);
    if (interactive) finishHumanCardAction(); else { checkAllObjectives(); advancePlayer(); }
  } else {
    log(`Action « ${id} » en attente de règles précises.`);
    if (interactive) finishHumanCardAction(); else advancePlayer();
  }
}

function executePaidAction(player, action, interactive) {
  if (action.id === "pay_resource_place_human" || action.id === "pay_energy_place_human" || action.id === "pay_fer_place_human") {
    if (interactive) { state.actionMode = { type: "SPAWN_HUMAN" }; state.phase = "ACTION_RESOLVE"; render(); }
    else { spawnAdjacentHuman(player.id); checkAllObjectives(); advancePlayer(); }
  } else if (action.id === "pay_energy_and_fer_place_grid") {
    if (interactive) { state.actionMode = { type: "BUILD" }; state.phase = "ACTION_RESOLVE"; render(); }
    else if (!spawnOnRandomHexEdge(player.id, "TOWER", true)) { checkAllObjectives(); advancePlayer(); }
  } else if (action.id === "pay_energy_and_fer_create_weapon") {
    if (interactive) { state.actionMode = { type: "PLACE_WEAPON" }; state.phase = "ACTION_RESOLVE"; render(); }
    else {
      const destination = [...state.board.values()].find(cell => cell.weapon === null && canEvacuateHumansFrom(cell) && isAdjacentToPlayerHuman(cell.q, cell.r, player.id));
      if (destination) { destination.weapon = player.id; player.pieces.weapon++; relocateHumansAutomatically(destination, true); }
      else { checkAllObjectives(); advancePlayer(); }
    }
  }
}

function applyBotScienceActions(player, card, actions) {
  for (const action of actions) {
    if (action.scienceAction === "production") placeCardInProduction(player, card, false);
    else if (action.scienceAction === "swap_production") {
      const opponent = state.players.find(p => p.id !== player.id && p.prod.length);
      const pair = opponent && player.prod.flatMap((_, ownIndex) => opponent.prod.map((__, targetIndex) => ({ ownIndex, targetIndex })))
        .find(({ ownIndex, targetIndex }) => canSwapProdCards(player, ownIndex, opponent, targetIndex));
      if (pair) [player.prod[pair.ownIndex], opponent.prod[pair.targetIndex]] = [opponent.prod[pair.targetIndex], player.prod[pair.ownIndex]];
    } else if (action.scienceAction === "take_main") state.forcedLeadPlayer = player.id;
  }
  checkAllObjectives(); advancePlayer();
}

function botFortShoot(pId) {
  const towers = [...state.board.values()].filter(cell => cell.weapon === pId);
  const targets = towers.flatMap(tower => [...state.board.values()]
    .filter(cell => getHumanOwners(cell).some(owner => owner !== pId) && hexDistance(tower, cell) === 1));
  if (targets.length) {
    const targetPlayer = getHumanOwners(targets[0]).find(owner => owner !== pId);
    addHumanCorpse(targets[0], targetPlayer);
    removeHuman(targets[0], targetPlayer);
    state.players[targetPlayer].pieces.human = Math.max(0, state.players[targetPlayer].pieces.human - 1);
  }
}

function botMoveAndShoot(pId) {
  const source = [...state.board.values()].find(cell => getHumanOwners(cell).includes(pId) && getHumanMoveDestinations(cell).length);
  if (!source) return;
  const destination = getHumanMoveDestinations(source)[0];
  removeHuman(source, pId);
  addHuman(destination, pId);
  log(`${state.players[pId].name} déplace un Humain d’une case.`);
  botFortShoot(pId);
}

function advancePlayer() {
  const player = state.players[state.currentPlayer];
  if (player?.isBot && state.pendingSecretActions?.length) {
    const action = state.pendingSecretActions.shift();
    performCardAction(player, action, false);
    return;
  }
  state.pendingSecretActions = [];
  state.actionMode = null; state.phase = "PLAY_TRICK";
  state.currentPlayer = (state.currentPlayer + 1) % 4;
  if (state.trickCards.length === 4) resolveTrickEnd(); else processTurn();
}

function finishHumanCardAction() {
  if (state.actionQueue?.length) {
    const next = state.actionQueue.shift();
    performCardAction(state.players[0], next, true);
    return;
  }
  state.actionQueue = null;
  if (state.pendingSecretActions?.length) {
    const secretAction = state.pendingSecretActions.shift();
    performCardAction(state.players[0], secretAction, true);
    return;
  }
  state.pendingSecretActions = [];
  state.actionMode = null; state.phase = "PLAY_TRICK"; checkAllObjectives();
  state.currentPlayer = (state.currentPlayer + 1) % 4;
  if (state.trickCards.length === 4) resolveTrickEnd(); else processTurn();
}

function onHexClick(q, r) {
  if (state.phase !== "ACTION_RESOLVE" || !state.actionMode) return;
  const cell = state.board.get(`${q},${r}`), mode = state.actionMode;
  if (!cell) return;
  if (mode.type === "DISPLACE_HUMANS") {
    if (getHumanMoveDestinations(state.board.get(mode.sourceKey)).some(destination => destination.q === q && destination.r === r)) {
      const owner = mode.queue[0];
      if (removeHuman(state.board.get(mode.sourceKey), owner)) {
        addHuman(cell, owner);
        mode.queue.shift();
        log(`Un Humain de J${owner} est déplacé vers une case adjacente.`);
        continueHumanEvacuation(mode, true);
      }
    }
  } else if (mode.type === "MOVE_HUMAN") {
    if (!mode.selectedKey && getHumanOwners(cell).includes(0)) {
      mode.selectedKey = `${q},${r}`;
      render();
      return;
    }
    const source = mode.selectedKey ? state.board.get(mode.selectedKey) : null;
    if (source && getHumanMoveDestinations(source).some(destination => destination.q === q && destination.r === r)) {
      removeHuman(source, 0);
      addHuman(cell, 0);
      log("Tu déplaces un Humain d’une case.");
      const canShoot = [...state.board.values()].some(tower => tower.weapon === 0 && [...state.board.values()].some(target =>
        getHumanOwners(target).some(owner => owner !== 0) && hexDistance(tower, target) === 1));
      if (canShoot) {
        state.actionMode = { type: "ATTACK_FROM_TOWER" };
        render();
        return;
      }
      finishHumanCardAction();
    }
  } else if (mode.type === "SPAWN_HUMAN" && isHumanAllowed(cell) && isAdjacentToPlayerHuman(q, r, 0)) {
    addHuman(cell, 0); state.players[0].pieces.human++; finishHumanCardAction();
  } else if (mode.type === "BUILD" && cell.tower < 3 && canEvacuateHumansFrom(cell) && isAdjacentToAnyHuman(cell.q, cell.r)) {
    const hasHumans = getHumanOwners(cell).length > 0;
    addTowerPiece(cell, 0); state.players[0].pieces.grid++;
    if (hasHumans) beginHumanEvacuation(cell); else finishHumanCardAction();
  } else if (mode.type === "SACRIFICE_HUMAN" && getHumanOwners(cell).includes(0)) {
    addHumanCorpse(cell, 0);
    removeHuman(cell, 0); state.players[0].pieces.human = Math.max(0, state.players[0].pieces.human - 1);
    state.actionMode = { type: "UNTAP_PROD", remaining: 2 };
    if (!state.players[0].prod.some(slot => slot.rotation >= 90)) finishHumanCardAction(); else render();
  } else if (mode.type === "PLACE_WEAPON" && cell.weapon === null && canEvacuateHumansFrom(cell) && isAdjacentToPlayerHuman(q, r, 0)) {
    const hasHumans = getHumanOwners(cell).length > 0;
    cell.weapon = 0; state.players[0].pieces.weapon++; log("Arme construite sur le plateau.");
    if (hasHumans) beginHumanEvacuation(cell); else finishHumanCardAction();
  } else if (mode.type === "ATTACK_FROM_TOWER") {
    if (!mode.selectedKey && cell.weapon === 0) {
      mode.selectedKey = `${q},${r}`;
      render();
      return;
    }
    const targetPlayer = getHumanOwners(cell).find(owner => owner !== 0);
    if (mode.selectedKey && targetPlayer !== undefined && hexDistance(state.board.get(mode.selectedKey), cell) === 1) {
      addHumanCorpse(cell, targetPlayer);
      removeHuman(cell, targetPlayer);
      state.players[targetPlayer].pieces.human = Math.max(0, state.players[targetPlayer].pieces.human - 1);
      log(`Attaque depuis la tour : un Humain de ${state.players[targetPlayer].name} est retiré.`);
      finishHumanCardAction();
    } else if (cell.weapon === 0) {
      mode.selectedKey = `${q},${r}`;
      render();
      return;
    }
  }
  render();
}

function isHumanAllowed(cell) {
  return !!cell && cell.tower === 0 && cell.weapon === null;
}

function getHumanMoveDestinations(sourceCell) {
  if (!sourceCell) return [];
  return HEX_DIRS
    .map(direction => state.board.get(`${sourceCell.q + direction.q},${sourceCell.r + direction.r}`))
    .filter(cell => isHumanAllowed(cell));
}

function canEvacuateHumansFrom(cell) {
  return getHumanOwners(cell).length === 0 || getHumanMoveDestinations(cell).length > 0;
}

function beginHumanEvacuation(cell) {
  const owners = [...getHumanOwners(cell)];
  if (!owners.length) { finishHumanCardAction(); return; }
  owners.sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : 0));
  const mode = { type: "DISPLACE_HUMANS", sourceKey: `${cell.q},${cell.r}`, queue: owners };
  state.actionMode = mode;
  continueHumanEvacuation(mode, true);
}

function continueHumanEvacuation(mode, interactive) {
  const source = state.board.get(mode.sourceKey);
  while (mode.queue.length) {
    const owner = mode.queue[0];
    if (interactive && owner === 0) {
      state.actionMode = mode;
      state.phase = "ACTION_RESOLVE";
      render();
      return;
    }
    const destinations = getHumanMoveDestinations(source);
    if (!destinations.length) {
      log(`Aucun déplacement adjacent possible pour J${owner}.`);
      mode.queue.shift();
      continue;
    }
    destinations.sort((a, b) => getHumanOwners(a).length - getHumanOwners(b).length);
    const destination = destinations[0];
    removeHuman(source, owner);
    addHuman(destination, owner);
    mode.queue.shift();
    log(`Un Humain de J${owner} est déplacé vers une case adjacente.`);
  }
  if (mode.resumeBotTurn) { checkAllObjectives(); advancePlayer(); }
  else if (interactive) finishHumanCardAction();
}

function relocateHumansAutomatically(cell, resumeBotTurn = false) {
  const mode = { type: "DISPLACE_HUMANS", sourceKey: `${cell.q},${cell.r}`, queue: [...getHumanOwners(cell)], resumeBotTurn };
  continueHumanEvacuation(mode, resumeBotTurn);
}

function resolveTrickEnd() {
  if (state.phase === "DRAFT") return;
  const leadType = state.trickCards[0].card.type;
  const eligible = state.trickCards.filter(e => e.faceUp && e.card.type === leadType);
  const winner = (state.forcedLeadPlayer !== null && state.trickCards.find(e => e.playerId === state.forcedLeadPlayer)) || eligible.sort((a, b) => b.card.value - a.card.value)[0] || state.trickCards[0];
  state.forcedLeadPlayer = null;
  state.leadPlayer = winner.playerId;
  state.draftOrder = [...state.trickCards].sort((a, b) => a.card.value - b.card.value).map(e => e.playerId);
  state.draftIndex = 0;
  state.phase = "DRAFT"; log(`${state.players[winner.playerId].name} remporte le pli. Choix d'objectif du plus petit au plus grand.`);
  processDraft();
}

function processDraft() {
  if (state.draftIndex >= 4) { state.objectiveRiver = []; endTrick(); return; }
  const pId = state.draftOrder[state.draftIndex], player = state.players[pId];
  if (player.isBot) {
    if (player.objectives.length >= 4) {
      log(`${player.name} a déjà quatre objectifs et ignore la rivière.`);
      state.draftIndex++; processDraft(); return;
    }
    const idx = Math.floor(Math.random() * state.objectiveRiver.length), chosen = state.objectiveRiver.splice(idx, 1)[0];
    if (chosen) { player.objectives.push(chosen); state.objectiveDeck = state.objectiveDeck.filter(o => o.id !== chosen.id); }
    state.draftIndex++; processDraft();
  } else render();
}

function draftObjective(index) {
  if (state.phase !== "DRAFT" || state.draftOrder[state.draftIndex] !== 0 || state.players[0].objectives.length >= 4 || !state.objectiveRiver[index]) return;
  const chosen = state.objectiveRiver.splice(index, 1)[0];
  state.objectiveDeck = state.objectiveDeck.filter(o => o.id !== chosen.id);
  state.players[0].objectives.push(chosen); log("Objectif ajouté à ta main.");
  state.draftIndex++; processDraft();
}

function skipObjectiveDraft() {
  if (state.phase !== "DRAFT" || state.draftOrder[state.draftIndex] !== 0 || state.players[0].objectives.length < 4) return;
  log("Tu as déjà quatre objectifs : tu ignores la rivière.");
  state.draftIndex++;
  processDraft();
}

function endTrick() {
  state.trickCards = [];
  state.phase = "CHECK_OBJECTIVES";
  log(`— Fin du pli ${state.trick} : vérification des objectifs.`);
  checkAllObjectives();
  render();
}

function continueAfterObjectiveCheck() {
  if (state.phase !== "CHECK_OBJECTIVES") return;
  if (state.trick < 5) {
    state.trick++;
    beginTrick();
    return;
  }
  if (state.round >= 4) {
    state.phase = "GAME_OVER";
    const highScore = Math.max(...state.players.map(player => player.score));
    const winners = state.players.filter(player => player.score === highScore);
    log(winners.length === 1
      ? `${winners[0].name} gagne la partie avec ${highScore} PV.`
      : `Égalité à ${highScore} PV : ${winners.map(player => player.name).join(", ")}.`);
    render();
    return;
  }
  state.round++;
  startRound();
}

function checkAllObjectives() {
  if (state.phase !== "CHECK_OBJECTIVES") return;
  state.players.forEach(p => {
    for (let i = p.objectives.length - 1; i >= 0; i--) {
      const obj = p.objectives[i];
      const valid = matchesObjectivePattern(state.board, p.id, obj.pattern);
      if (valid) { p.score += obj.pts; p.objectives.splice(i, 1); log(`${p.name} valide un motif (+${obj.pts} PV).`); }
    }
  });
}

function spawnOnRandomHexEdge(pId, kind, resumeBotTurn = false) {
  const cells = [...state.board.values()].filter(c => kind === "HUMAN"
    ? isHexEdge(c.q, c.r) && isHumanAllowed(c)
    : c.tower < 3 && canEvacuateHumansFrom(c) && isAdjacentToAnyHuman(c.q, c.r));
  if (!cells.length) return false;
  const cell = cells[Math.floor(Math.random() * cells.length)];
  if (kind === "HUMAN") { addHuman(cell, pId); state.players[pId].pieces.human++; }
  else { addTowerPiece(cell, pId); state.players[pId].pieces.grid++; relocateHumansAutomatically(cell, resumeBotTurn); }
  return true;
}

function isAdjacentToPlayerHuman(q, r, playerId) {
  return HEX_DIRS.some(direction => getHumanOwners(state.board.get(`${q + direction.q},${r + direction.r}`)).includes(playerId));
}

function isAdjacentToAnyHuman(q, r) {
  return HEX_DIRS.some(direction => getHumanOwners(state.board.get(`${q + direction.q},${r + direction.r}`)).length > 0);
}

function canPlaceGrid() {
  return [...state.board.values()].some(cell => cell.tower < 3 && canEvacuateHumansFrom(cell) && isAdjacentToAnyHuman(cell.q, cell.r));
}

function canPlaceWeapon(playerId) {
  return [...state.board.values()].some(cell => cell.weapon === null && canEvacuateHumansFrom(cell) && isAdjacentToPlayerHuman(cell.q, cell.r, playerId));
}

function spawnAdjacentHuman(playerId) {
  const cells = [...state.board.values()].filter(cell => isHumanAllowed(cell) && isAdjacentToPlayerHuman(cell.q, cell.r, playerId));
  if (!cells.length) return false;
  const cell = cells[Math.floor(Math.random() * cells.length)];
  addHuman(cell, playerId);
  state.players[playerId].pieces.human++;
  return true;
}
