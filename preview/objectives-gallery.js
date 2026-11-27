const objectiveDefinitions = normalizeObjectiveCatalog([
  ...OBJECTIVES_DATA,
  ...(window.GENERATED_OBJECTIVES || []),
]);

function renderObjectiveGallery() {
  const family = document.getElementById("family-filter").value;
  const objectives = family === "all" ? objectiveDefinitions : objectiveDefinitions.filter(item => item.family === family);
  document.getElementById("objective-count").textContent = `${objectives.length} objectifs · mêmes données que le jeu`;
  document.getElementById("objectives-gallery").innerHTML = objectives.map(objective => `
    <section class="objective-gallery-item family-${objective.family}">
      <header><h2>${escapeGalleryText(objective.title)}</h2><span>${objective.pts} PV</span></header>
      <div class="objective-gallery-views">
        ${BoardGameObjectiveRenderer.render(objective, "card", { assetRoot: "../assets" })}
        <div class="ui-preview"><div class="ui-preview-label">Format jeu</div>${BoardGameObjectiveRenderer.render(objective, "ui", { assetRoot: "../assets" })}</div>
      </div>
    </section>`).join("");
}

function escapeGalleryText(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

document.getElementById("family-filter").addEventListener("change", renderObjectiveGallery);
renderObjectiveGallery();
