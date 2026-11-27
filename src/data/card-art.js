// Visual vocabulary used by the printable card studio. Kept outside gameplay
// rules so balancing actions never requires editing presentation markup.
const CARD_ART = {
  energie: { previewTokens: [{ icon: "prod" }, { icon: "tap" }, { divider: true }, { text: "Déplacement et tir" }] },
  ressource: { previewTokens: [{ icon: "prod" }, { icon: "tap" }, { divider: true }, { text: "Déplacement et tir" }] },
  humain: { previewTokens: [{ icon: "fer" }, { choice: true }, { icon: "energie" }, { colon: true }, { icon: "tokenHumain" }, { text: "." }, { divider: true }, { text: "retire " }, { icon: "tokenHumain" }, { text: " : " }, { icon: "untap" }, { icon: "untap" }, { text: "." }] },
  construction: { previewTokens: [{ icon: "energie" }, { icon: "fer" }, { colon: true }, { icon: "tokenPlaque" }, { text: "." }, { divider: true }, { icon: "energie" }, { icon: "fer" }, { colon: true }, { icon: "tokenArme" }, { text: "." }] },
  science: { previewTokens: [{ icon: "science" }, { text: " : " }, { icon: "prod" }, { br: true }, { icon: "usine" }, { text: " : " }, { icon: "swap" }, { icon: "prod" }, { br: true }, { icon: "humain" }, { text: " : " }, { icon: "main" }] },
};

const CARD_ART_VARIANTS = {};
