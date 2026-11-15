function initGame() {
  initHexBoard(2);
  state.players = [
    { id: 0, name: "Toi", isBot: false, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
    { id: 1, name: "Bot Nord", isBot: true, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
    { id: 2, name: "Bot Est", isBot: true, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
    { id: 3, name: "Bot Ouest", isBot: true, score: 0, hand: [], prod: [], objectives: [], pieces: { human: 1, weapon: 0, grid: 0 } },
  ];
  state.objectiveDeck = shuffle(Array.from({ length: 4 }, (_, copy) => OBJECTIVES_DATA.map(o => ({ ...o, id: `${o.id}_${copy}` }))).flat());
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
  const picked = [];
  for (const card of shuffle([...bot.hand])) {
    if (picked.length === 2) break;
    if (!picked.some(c => c.type === card.type) || new Set(picked.map(c => c.type)).size < 2) picked.push(card);
  }
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
  if (state.phase === "OVERWRITE_PROD" && state.pendingCardToProd) {
    const overwrittenType = slot.card.type;
    p.prod = p.prod.filter(item => item.card.type !== overwrittenType);
    p.prod.push({ card: state.pendingCardToProd, rotation: 0 });
    state.pendingCardToProd = null;
    const follow = state.actionMode?.type;
    if (follow === "OVERWRITE_THEN_TAP") {
      state.actionMode = { type: "CHOOSE_PROD_TO_TAP" };
      state.phase = "ACTION_RESOLVE";
      render();
    }
    else finishHumanCardAction();
    return;
  }
  if (state.actionMode?.type === "CHOOSE_PROD_TO_TAP") { tapProdForEffect(slotIndex); return; }
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

function tapProductionSlot(player, slotIndex, resourceChoice = null) {
  const slot = player.prod[slotIndex];
  if (!slot || slot.rotation >= 90) { log("Cette carte de production est déjà engagée."); return; }
  const options = getProductionResourceOptions(slot);
  const resource = resourceChoice || options[0];
  if (!options.includes(resource)) return;
  slot.rotation = slot.rotation === 0 ? 45 : 90;
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
    move_combat: "Déplacement et combat",
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
    const usesLeft = slot.rotation === 0 ? 2 : slot.rotation === 45 ? 1 : 0;
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
    if (slot.rotation >= 90) return;
    for (const resource of getProductionResourceOptions(slot)) {
      for (const bill of bills) {
        if ((bill[resource] || 0) <= 0) continue;
        const billAfter = { ...bill, [resource]: bill[resource] - 1 };
        const remaining = Object.values(billAfter).every(amount => amount <= 0);
        const simulated = { ...player, prod: player.prod.map((item, i) => i === slotIndex ? { ...item, rotation: item.rotation === 0 ? 45 : 90 } : { ...item }) };
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
  };
  state.phase = "PAY_RESOURCES";
  render();
}

function canPlayerUseAction(action, player = state.players[0]) {
  if (action.id === "pay_resource_place_human") return canPayWithProduction(player, [{ energie: 1 }, { ressource: 1 }]);
  if (action.id === "pay_energy_place_human") return canPayWithProduction(player, [{ energie: 1 }]);
  if (action.id === "pay_fer_place_human") return canPayWithProduction(player, [{ ressource: 1 }]);
  if (action.id.startsWith("pay_energy_and_fer")) return canPayWithProduction(player, [{ energie: 1, ressource: 1 }]);
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
    const action = actions.find(a => botCanUseAction(player, a)) || actions[0];
    performCardAction(player, action, false);
  }
}

function botCanUseAction(player, action) {
  return canPlayerUseAction(action, player);
}

function chooseCardAction(index) {
  if (state.phase !== "CHOOSE_ACTION") return;
  const action = state.actionChoices[index];
  if (!action) return;
  state.actionChoices = [];
  performCardAction(state.players[0], action, true);
}

function chooseSwapProdOwn(index) {
  if (state.actionMode?.type !== "SWAP_PROD_OWN" || !state.players[0].prod[index]) return;
  state.actionMode = { type: "SWAP_PROD_TARGET", ownIndex: index };
  render();
}

function canSwapProdCards(playerA, indexA, playerB, indexB) {
  const cardA = playerA.prod[indexA], cardB = playerB.prod[indexB];
  if (!cardA || !cardB) return false;
  const typesA = new Set(playerA.prod.map((slot, i) => i === indexA ? cardB.card.type : slot.card.type));
  const typesB = new Set(playerB.prod.map((slot, i) => i === indexB ? cardA.card.type : slot.card.type));
  return typesA.size <= 2 && typesB.size <= 2;
}

function chooseSwapProdTarget(playerId, slotIndex) {
  if (state.actionMode?.type !== "SWAP_PROD_TARGET") return;
  const player = state.players[0], opponent = state.players[playerId];
  const own = player.prod[state.actionMode.ownIndex];
  const other = opponent?.prod[slotIndex];
  if (!own || !other) return;
  if (!canSwapProdCards(player, state.actionMode.ownIndex, opponent, slotIndex)) {
    log("Cet échange ferait dépasser la limite de deux familles en production.");
    return;
  }
  player.prod[state.actionMode.ownIndex] = other;
  opponent.prod[slotIndex] = own;
  log(`Carte de production échangée avec ${opponent.name}.`);
  finishHumanCardAction();
}

function placeCardInProduction(player, card, interactive) {
  const families = new Set(player.prod.map(slot => slot.card.type));
  if (families.has(card.type) || families.size < 2) player.prod.push({ card, rotation: 0 });
  else if (interactive) {
    state.pendingCardToProd = card;
    state.phase = "OVERWRITE_PROD";
    log("La production contient déjà deux familles : choisis une famille entière à remplacer.");
    render();
    return false;
  } else {
    const replacedType = player.prod[0]?.card.type;
    player.prod = player.prod.filter(slot => slot.card.type !== replacedType);
    player.prod.push({ card, rotation: 0 });
  }
  return true;
}

function performCardAction(player, action, interactive) {
  const card = state.pendingActionCard;
  const id = action.id;
  if (id === "production_tap") {
    const placed = placeCardInProduction(player, card, interactive);
    if (!placed) { state.actionMode = { type: "OVERWRITE_THEN_TAP" }; return; }
    if (interactive) { state.actionMode = { type: "CHOOSE_PROD_TO_TAP" }; state.phase = "ACTION_RESOLVE"; render(); }
    else {
      const idx = player.prod.findIndex(slot => slot.rotation < 90);
      if (idx >= 0) tapProductionSlot(player, idx);
      log("Le symbole produit est perdu : aucun coût n'est en cours de paiement.");
      checkAllObjectives(); advancePlayer();
    }
  } else if (id === "science_production") {
    const placed = placeCardInProduction(player, card, interactive);
    if (!placed) { state.actionMode = { type: "OVERWRITE_QUEUE" }; return; }
    if (interactive) finishHumanCardAction();
    else { checkAllObjectives(); advancePlayer(); }
  } else if (id === "move_combat") {
    if (interactive) { state.actionMode = { type: "MOVE_ATTACK" }; state.phase = "ACTION_RESOLVE"; render(); }
    else { botMoveAndAttack(player.id); checkAllObjectives(); advancePlayer(); }
  } else if (id === "pay_energy_place_human" || id === "pay_fer_place_human" || id === "pay_resource_place_human") {
    const bills = id === "pay_fer_place_human" ? [{ ressource: 1 }] : id === "pay_energy_place_human" ? [{ energie: 1 }] : [{ energie: 1 }, { ressource: 1 }];
    startPayment(player, bills, action, interactive);
  } else if (id === "sacrifice_human_untap_two") {
    if (interactive) { state.actionMode = { type: "SACRIFICE_HUMAN" }; state.phase = "ACTION_RESOLVE"; render(); }
    else { const human = [...state.board.values()].find(cell => cell.human === player.id); if (human) human.human = null; player.prod.slice(0, 2).forEach(slot => { slot.rotation = 0; }); checkAllObjectives(); advancePlayer(); }
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
    else { spawnOnRandomHexEdge(player.id, "TOWER"); checkAllObjectives(); advancePlayer(); }
  } else if (action.id === "pay_energy_and_fer_create_weapon") {
    player.pieces.weapon++;
    if (interactive) { state.actionMode = { type: "ATTACH_WEAPON" }; state.phase = "ACTION_RESOLVE"; render(); }
    else {
      const human = [...state.board.values()].find(cell => cell.human === player.id && cell.weapon !== player.id);
      if (human) human.weapon = player.id;
      checkAllObjectives(); advancePlayer();
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

function botAttack(player, type) {
  const cells = [...state.board.values()].filter(c => type === "energie" ? c.human !== null && c.human !== player.id : c.tower > 0);
  if (!cells.length) return;
  if (type === "energie") cells[0].human = null; else cells[0].tower--;
}

function botMove(pId) {
  const from = [...state.board.values()].find(c => c.human === pId);
  if (!from) { spawnOnRandomHexEdge(pId, "HUMAN"); return; }
  const to = HEX_DIRS.map(d => state.board.get(`${from.q + d.q},${from.r + d.r}`)).find(c => c && c.human === null);
  if (to) { to.weapon = from.weapon; from.human = null; from.weapon = null; to.human = pId; }
}

function botMoveAndAttack(pId) {
  botMove(pId);
  const from = [...state.board.values()].find(c => c.human === pId);
  if (!from) return;
  const targets = [...state.board.values()].filter(cell => cell.human !== null && cell.human !== pId && canAttackFrom(from, cell));
  if (targets.length) {
    const targetPlayer = targets[0].human;
    if (targets[0].weapon !== null) state.players[targetPlayer].pieces.weapon = Math.max(0, state.players[targetPlayer].pieces.weapon - 1);
    targets[0].human = null; targets[0].weapon = null;
    state.players[targetPlayer].pieces.human = Math.max(0, state.players[targetPlayer].pieces.human - 1);
  }
}

function canAttackFrom(from, target) {
  const dq = target.q - from.q, dr = target.r - from.r;
  const distance = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  if (from.weapon !== null) return HEX_DIRS.some(d => d.q * 2 === dq && d.r * 2 === dr);
  return distance === 1;
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
  if (mode.type === "SPAWN_HUMAN" && cell.human === null && isAdjacentToPlayerHuman(q, r, 0)) {
    cell.human = 0; state.players[0].pieces.human++; finishHumanCardAction();
  } else if (mode.type === "BUILD" && cell.tower < 3) {
    cell.tower++; state.players[0].pieces.grid++; finishHumanCardAction();
  } else if (mode.type === "SACRIFICE_HUMAN" && cell.human === 0) {
    if (cell.weapon !== null) state.players[0].pieces.weapon = Math.max(0, state.players[0].pieces.weapon - 1);
    cell.human = null; state.players[0].pieces.human = Math.max(0, state.players[0].pieces.human - 1);
    cell.weapon = null;
    state.actionMode = { type: "UNTAP_PROD", remaining: 2 };
    if (!state.players[0].prod.some(slot => slot.rotation >= 90)) finishHumanCardAction(); else render();
  } else if (mode.type === "ATTACH_WEAPON" && cell.human === 0) {
    cell.weapon = 0; log("Pistolet équipé sur ton Humain."); finishHumanCardAction();
  } else if (mode.type === "MOVE_ATTACK") {
    if (!mode.selectedKey && cell.human === 0) mode.selectedKey = `${q},${r}`;
    else if (mode.selectedKey) {
      const [sq, sr] = mode.selectedKey.split(",").map(Number);
      const dist = (Math.abs(q - sq) + Math.abs(r - sr) + Math.abs(q + r - sq - sr)) / 2;
      if (dist === 1 && cell.human === null) {
        const from = state.board.get(mode.selectedKey), weapon = from.weapon;
        from.human = null; from.weapon = null; cell.human = 0; cell.weapon = weapon;
        const hasTarget = [...state.board.values()].some(target => target.human !== null && target.human !== 0 && canAttackFrom(cell, target));
        if (hasTarget) { state.actionMode = { type: "ATTACK_HUMAN", fromKey: `${q},${r}` }; render(); }
        else finishHumanCardAction();
      }
      else mode.selectedKey = null;
    }
  } else if (mode.type === "ATTACK_HUMAN" && cell.human !== null && cell.human !== 0) {
    const origin = mode.fromKey ? state.board.get(mode.fromKey) : null;
    if (!origin || canAttackFrom(origin, cell)) {
      const targetPlayer = cell.human;
      if (cell.weapon !== null) state.players[targetPlayer].pieces.weapon = Math.max(0, state.players[targetPlayer].pieces.weapon - 1);
      cell.human = null; cell.weapon = null;
      state.players[targetPlayer].pieces.human = Math.max(0, state.players[targetPlayer].pieces.human - 1);
      finishHumanCardAction();
    }
  } else if (mode.type === "ATTACK_TOWER" && cell.tower > 0) {
    cell.tower--; finishHumanCardAction();
  }
  render();
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
  checkAllObjectives();
  if (state.draftIndex >= 4) { state.objectiveRiver = []; endTrick(); return; }
  const pId = state.draftOrder[state.draftIndex], player = state.players[pId];
  if (player.isBot) {
    const idx = Math.floor(Math.random() * state.objectiveRiver.length), chosen = state.objectiveRiver.splice(idx, 1)[0];
    if (chosen) { player.objectives.push(chosen); state.objectiveDeck = state.objectiveDeck.filter(o => o.id !== chosen.id); }
    state.draftIndex++; processDraft();
  } else render();
}

function draftObjective(index) {
  if (state.phase !== "DRAFT" || state.draftOrder[state.draftIndex] !== 0 || !state.objectiveRiver[index]) return;
  const chosen = state.objectiveRiver.splice(index, 1)[0];
  state.objectiveDeck = state.objectiveDeck.filter(o => o.id !== chosen.id);
  state.players[0].objectives.push(chosen); log(`Objectif choisi : ${chosen.text}`);
  state.draftIndex++; processDraft();
}

function endTrick() {
  state.trickCards = [];
  if (state.trick < 5) { state.trick++; beginTrick(); }
  else { state.round++; startRound(); }
}

function checkAllObjectives() {
  state.players.forEach(p => {
    for (let i = p.objectives.length - 1; i >= 0; i--) {
      const obj = p.objectives[i];
      if (obj.check && obj.check(state.board, p.id)) { p.score += obj.pts; p.objectives.splice(i, 1); log(`${p.name} valide « ${obj.text} » (+${obj.pts} PV).`); }
    }
  });
}

function spawnOnRandomHexEdge(pId, kind) {
  const cells = [...state.board.values()].filter(c => isHexEdge(c.q, c.r) && (kind === "HUMAN" ? c.human === null : c.tower < 3));
  if (!cells.length) return;
  const cell = cells[Math.floor(Math.random() * cells.length)];
  if (kind === "HUMAN") { cell.human = pId; state.players[pId].pieces.human++; } else { cell.tower++; state.players[pId].pieces.grid++; }
}

function isAdjacentToPlayerHuman(q, r, playerId) {
  return HEX_DIRS.some(direction => state.board.get(`${q + direction.q},${r + direction.r}`)?.human === playerId);
}

function spawnAdjacentHuman(playerId) {
  const cells = [...state.board.values()].filter(cell => cell.human === null && isAdjacentToPlayerHuman(cell.q, cell.r, playerId));
  if (!cells.length) return false;
  const cell = cells[Math.floor(Math.random() * cells.length)];
  cell.human = playerId;
  state.players[playerId].pieces.human++;
  return true;
}
