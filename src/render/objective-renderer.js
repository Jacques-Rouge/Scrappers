// One objective definition, rendered either as a physical card preview or as
// the compact in-game objective tile.
window.BoardGameObjectiveRenderer = (() => {
  function render(objective, view = "ui", options = {}) {
    const root = options.assetRoot || "assets";
    const criterion = objective.pattern?.criterion === "eq" ? "eq" : "sup_eq";
    const criterionImage = `${root}/divers/div_${criterion}.png`;
    const pointsImage = `${root}/numbers/num_${objective.pts}.png`;
    const pattern = BoardGameRender.patternSVG(objective.pattern, {
      assetRoot: root,
      className: view === "card" ? "objective-pattern-card" : "obj-pattern-preview",
      side: view === "card" ? 40 : 19,
      padding: view === "card" ? 8 : 3,
    });
    if (view === "card") {
      const safeTitle = escapeHTML(objective.title || "Objectif");
      const safeFamily = String(objective.family || "").replace(/[^a-z0-9_-]/gi, "");
      const safeTheme = String(objective.theme || "").replace(/[^a-z0-9_-]/gi, "");
      return `<article class="objective-card-face family-${safeFamily} theme-${safeTheme}">
        <header class="objective-card-heading"><img src="${criterionImage}" alt="${criterion === "eq" ? "Exactement" : "Au moins"}"><h2>${safeTitle}</h2><img src="${pointsImage}" alt="${objective.pts} points de victoire"></header>
        <div class="objective-card-art"><span>Motif à réaliser</span></div>
        <div class="objective-card-pattern">${pattern}</div>
      </article>`;
    }
    const click = options.onClick ? ` onclick="${options.onClick}"` : "";
    return `<div class="obj-card ${options.draftable ? "draftable" : ""}"${click}><img class="obj-criterion" src="${criterionImage}" alt=""><div class="obj-pattern-slot">${pattern}</div><img class="obj-points" src="${pointsImage}" alt="${objective.pts} points"></div>`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  return Object.freeze({ render });
})();
