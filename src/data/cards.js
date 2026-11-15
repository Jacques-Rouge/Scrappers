// Family-level definitions mirror the five reference cards in preview/cards.html.
// Keep action IDs stable; the engine resolves their rules separately.
const CARD_TYPES = {
  energie: {
    name: "Énergie", familyName: "ÉNERGIE", prodSymbols: ["ÉN", "ÉN"], badge: null,
    leftBadges: ["energie"], rightBadges: ["energie"],
    normalActions: [
      { id: "production_tap" },
      { id: "move_combat" },
    ],
    secretActions: [],
    previewTokens: [{ icon: "prod" }, { icon: "tap" }, { divider: true }, { text: "Déplacement et Combat" }],
  },
  ressource: {
    name: "Fer", familyName: "FER", prodSymbols: ["FER", "FER"], badge: null,
    leftBadges: ["fer"], rightBadges: ["fer"],
    normalActions: [
      { id: "production_tap" },
      { id: "move_combat" },
    ],
    secretActions: [],
    previewTokens: [{ icon: "prod" }, { icon: "tap" }, { divider: true }, { text: "Déplacement et Combat" }],
  },
  humain: {
    name: "Humain", familyName: "HUMAIN", prodSymbols: ["ÉN"], badge: "👤",
    leftBadges: ["humain"], rightBadges: ["energie"],
    normalActions: [
      { id: "pay_resource_place_human", cost: { oneOf: ["fer", "energie"] } },
      { id: "sacrifice_human_untap_two", cost: { piece: "human", amount: 1 }, result: { action: "untap", amount: 2 } },
    ],
    secretActions: [],
    previewTokens: [
      { icon: "fer" }, { choice: true }, { icon: "energie" }, { colon: true }, { icon: "tokenHumain" }, { text: "." },
      { divider: true }, { text: "retire " }, { icon: "tokenHumain" }, { text: " : " }, { icon: "untap" }, { icon: "untap" }, { text: "." },
    ],
  },
  construction: {
    name: "Usine", familyName: "USINE", prodSymbols: ["FER"], badge: "🏛️",
    leftBadges: ["usine"], rightBadges: ["fer"],
    normalActions: [
      { id: "pay_energy_and_fer_place_grid", cost: { all: ["energie", "fer"] }, result: { action: "place_grid" } },
      { id: "pay_energy_and_fer_create_weapon", cost: { all: ["energie", "fer"] }, result: { action: "create_weapon" } },
    ],
    secretActions: [],
    previewTokens: [
      { icon: "energie" }, { icon: "fer" }, { colon: true }, { icon: "tokenPlaque" }, { text: "." },
      { divider: true }, { icon: "energie" }, { icon: "fer" }, { colon: true }, { icon: "tokenArme" }, { text: "." },
    ],
  },
  science: {
    name: "Science", familyName: "SCIENCE", prodSymbols: ["ÉN/FER"], badge: "🔬",
    leftBadges: ["science"], rightBadges: ["fer"],
    normalActions: [
      { id: "science_badge_effects", conditions: [
        { badge: "science", action: "production" },
        { badge: "usine", action: "swap_production" },
        { badge: "humain", action: "take_main" },
      ] },
    ],
    secretActions: [],
    previewTokens: [
      { icon: "science" }, { text: " : " }, { icon: "prod" }, { br: true },
      { icon: "usine" }, { text: " : " }, { icon: "swap" }, { icon: "prod" }, { br: true },
      { icon: "humain" }, { text: " : " }, { icon: "main" },
    ],
  },
};

// Empty-by-default value overrides make future one-off card differences explicit.
// Example: "energie:1": { normalActions: [{ id: "..." }], secretActions: [...] }
const CARD_VARIANTS = {};

function createCard(type, value, id = `${type}-${value}`) {
  const family = CARD_TYPES[type];
  if (!family) throw new Error(`Unknown card family: ${type}`);
  const variant = CARD_VARIANTS[`${type}:${value}`] || {};
  return {
    id, type, value,
    productionSymbols: JSON.parse(JSON.stringify(variant.productionSymbols ?? family.prodSymbols)),
    leftBadges: JSON.parse(JSON.stringify(variant.leftBadges ?? family.leftBadges)),
    rightBadges: JSON.parse(JSON.stringify(variant.rightBadges ?? family.rightBadges)),
    normalActions: JSON.parse(JSON.stringify(variant.normalActions ?? family.normalActions)),
    secretActions: JSON.parse(JSON.stringify(variant.secretActions ?? family.secretActions)),
    previewTokens: JSON.parse(JSON.stringify(variant.previewTokens ?? family.previewTokens)),
    secretPreviewTokens: JSON.parse(JSON.stringify(variant.secretPreviewTokens ?? family.secretPreviewTokens ?? [])),
  };
}

function createDeck() {
  const deck = [];
  let id = 1;
  for (const type of Object.keys(CARD_TYPES)) {
    for (let value = 1; value <= 6; value++) deck.push(createCard(type, value, id++));
  }
  return deck;
}
