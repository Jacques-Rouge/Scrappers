// Printable card studio renderer: transforms the canonical card/action data
// and card-art vocabulary into the HTML surface used for preview and export.
window.BoardGameCardStudio = (() => {
  const icons = {
    energie: { src: "resources/badge_power.png", label: "ÉNERGIE", group: "Ressources" },
    fer: { src: "resources/badge_ressource.png", label: "FER", group: "Ressources" },
    humain: { src: "badges/badge_human.png", label: "HUMAIN", group: "Badges" },
    usine: { src: "badges/badge_factory.png", label: "USINE", group: "Badges" },
    science: { src: "badges/badge_science.png", label: "SCIENCE", group: "Badges" },
    tokenHumain: { src: "token/img_human.png", label: "JETON HUMAIN", group: "Pièces" },
    tokenPlaque: { src: "token/img_grid.png", label: "JETON PLAQUE", group: "Pièces" },
    tokenArme: { src: "token/img_gun.png", label: "JETON ARME", group: "Pièces" },
    prod: { src: "divers/div_prod.png", label: "PROD", group: "Actions" },
    tap: { src: "divers/div_tap.png", label: "TAP", group: "Actions" },
    untap: { src: "divers/div_untap.png", label: "UNTAP", group: "Actions" },
    main: { src: "divers/div_main.png", label: "MAIN", group: "Actions" },
    swap: { src: "divers/div_swap.png", label: "ÉCHANGE", group: "Actions" },
  };
  const groups = [
    { title: "Ressources", keys: ["energie", "fer"], descriptions: ["Ressource Énergie", "Ressource Fer"] },
    { title: "Badges", keys: ["humain", "usine", "science"], descriptions: ["Badge Humain", "Badge Usine", "Badge Science"] },
    { title: "Pièces", keys: ["tokenHumain", "tokenPlaque", "tokenArme"], descriptions: ["Jeton Humain", "Jeton Plaque", "Jeton Arme"] },
    { title: "Actions", keys: ["prod", "tap", "untap", "main", "swap"], descriptions: ["Zone de production", "Incliner une carte", "Redresser une carte", "Prendre l'initiative", "Échanger une carte"] },
  ];

  const icon = (key, className = "inline-icon", assetRoot = "../assets") => `<img src="${assetRoot}/${icons[key].src}" alt="${icons[key].label}" class="${className} icon-${key.toLowerCase()}">`;
  const tokenMarkup = (tokens, assetRoot = "../assets") => tokens.map(token => {
    if (token.icon) return icons[token.icon].group === "Actions" ? icon(token.icon, `effect-icon ${token.icon}`, assetRoot) : icon(token.icon, "inline-icon", assetRoot);
    if (token.choice) return '<span class="choice-slash" role="img" aria-label="choix"></span>';
    if (token.colon) return '<span class="effect-colon" role="img" aria-label="produit"></span>';
    if (token.divider) return '<div class="choice-divider" role="img" aria-label="autre option"><span class="choice-slash"></span></div>';
    if (token.br) return "<br>";
    return token.text || "";
  }).join(" ");

  function renderTerms() {
    document.getElementById("terms-list").innerHTML = groups.map(group => `
      <section class="term-group"><h3>${group.title}</h3>
        ${group.keys.map((key, i) => `<div class="term-item">${icon(key, `term-icon ${key}`)}<span><strong>${icons[key].label}</strong> — ${group.descriptions[i]}</span></div>`).join("")}
      </section>`).join("");
  }

  function renderCards() {
    const cards = Object.keys(CARD_TYPES).flatMap(type => Array.from({ length: 6 }, (_, i) => {
      const card = createCard(type, i + 1), family = CARD_TYPES[type];
      const preview = CARD_ART_VARIANTS[`${type}:${i + 1}`]?.previewTokens ?? CARD_ART[type].previewTokens;
      return { ...card, familyName: family.familyName, box1: tokenMarkup(preview), box2: "N/A" };
    }));
    document.getElementById("cards-list").innerHTML = cards.map((card, index) => {
      return `<div class="card-wrapper">
        ${renderCardFace(card, { assetRoot: "../assets", id: `card-${index}`, onClick: `cycleRotation(${index})`, exportKey: `${card.type}_${card.value}` })}
        <div class="card-actions-bar"><button class="btn-mini" onclick="exportCardPNG('card-${index}', '${card.type}_${card.value}')">Exporter PNG</button></div>
      </div>`;
    }).join("");
  }

  function renderCardFace(card, options = {}) {
    const assetRoot = options.assetRoot || "assets";
    const family = CARD_TYPES[card.type];
    const previewTokens = CARD_ART_VARIANTS[`${card.type}:${card.value}`]?.previewTokens ?? CARD_ART[card.type].previewTokens;
    const badgeClass = type => ["humain", "usine", "science"].includes(type) ? "badge-round" : "badge-square";
    const badges = keys => keys.map(type => `<div class="badge-icon ${badgeClass(type)}">${icon(type, "", assetRoot)}</div>`).join("");
    const selected = options.selected ? "selected" : "";
    return `<div class="card bg-${card.type} type-${card.type} rot-${options.rotation || 0} ${selected}"${options.id ? ` id="${options.id}"` : ""}${options.exportKey ? ` data-export-key="${options.exportKey}"` : ""} data-rot="${options.rotation || 0}"${options.onClick ? ` onclick="${options.onClick}"` : ""}>
      <div class="card-top"><div class="top-left-group"><div class="value-box"><img class="card-number" src="${assetRoot}/numbers/num_${card.value}.png" alt="Valeur ${card.value}"></div><div class="badges-left">${badges(card.leftBadges)}</div></div><div class="badges-right">${badges(card.rightBadges)}</div></div>
      <div class="family-banner">${family.familyName}</div>
      <div class="card-text-container"><div class="card-box"><div>${tokenMarkup(previewTokens, assetRoot)}</div></div><div class="card-box lower-box"><img class="sup-icon" src="${assetRoot}/divers/div_sup.png" alt=""><div>N/A</div></div></div>
    </div>`;
  }

  function render() { renderTerms(); renderCards(); }
  return Object.freeze({ render, renderTerms, renderCards, renderCardFace });
})();
