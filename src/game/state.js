const state = {
  round: 1, trick: 1, phase: "PROD", leadPlayer: 0, currentPlayer: 0, forcedLeadPlayer: null,
  board: new Map(), players: [], trickCards: [], objectiveDeck: [], objectiveRiver: [], roundHands: [],
  draftOrder: [], draftIndex: 0, selectedProdCards: [],
  pendingCardToProd: null, pendingActionCard: null, pendingEffectType: null,
  actionChoices: [], actionQueue: null, pendingSecretActions: [], paymentContext: null,
  actionMode: null, pendingFaceDown: false
};

