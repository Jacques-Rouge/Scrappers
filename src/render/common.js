// Shared presentation primitives for the game and the card studios.
// A classic script keeps direct file:// launch support.
window.BoardGameRender = (() => {
  const tokenAssets = { grid: "token_grid.png", gun: "token_gun.png", human: "token_human.png", dead: "token_human_dead.png" };

  function hexPoints(x, y, radius) {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = i * Math.PI / 3;
      return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
    }).join(" ");
  }

  function hexCenter(q, r, size) {
    return {
      x: size * 1.5 * q,
      y: size * Math.sqrt(3) * (r + q / 2),
    };
  }

  function tokenAsset(token, assetRoot = "assets") {
    return tokenAssets[token] ? `${assetRoot}/token/${tokenAssets[token]}` : "";
  }

  function playerIconAsset(piece, playerId, assetRoot = "assets") {
    const filenameByPiece = { human: "human", grid: "grill", gun: "gun" };
    const playerNumber = Number(playerId) + 1;
    if (!filenameByPiece[piece] || !Number.isInteger(playerNumber) || playerNumber < 1 || playerNumber > 4) return "";
    return `${assetRoot}/players_icon/${filenameByPiece[piece]}_j${playerNumber}.png`;
  }

  function numberAsset(amount, owner, assetRoot = "assets") {
    const variant = amount <= 4 ? `_${owner === "enemy" || owner === "r" ? "r" : "g"}` : "";
    return `${assetRoot}/numbers/num_${amount}${variant}.png`;
  }

  function patternSVG(pattern, options = {}) {
    if (!pattern?.cells?.length) return "";
    const side = options.side || 19;
    const rotateAxial = ({ q, r }) => ({ q: -r, r: q + r });
    const orientations = Array.from({ length: 6 }, (_, rotation) => {
      let cells = pattern.cells.map(cell => ({ ...cell }));
      for (let step = 0; step < rotation; step++) {
        cells = cells.map(cell => ({ ...cell, ...rotateAxial(cell) }));
      }
      const projected = cells.map(cell => ({ ...cell, ...hexCenter(cell.q, cell.r, side) }));
      const minX = Math.min(...projected.map(cell => cell.x - side)), maxX = Math.max(...projected.map(cell => cell.x + side));
      const minY = Math.min(...projected.map(cell => cell.y - side)), maxY = Math.max(...projected.map(cell => cell.y + side));
      return { cells: projected, width: maxX - minX, height: maxY - minY };
    });
    const { cells } = orientations.reduce((best, candidate) =>
      candidate.width / candidate.height > best.width / best.height ? candidate : best);
    const minX = Math.min(...cells.map(cell => cell.x - side)), maxX = Math.max(...cells.map(cell => cell.x + side));
    const minY = Math.min(...cells.map(cell => cell.y - side)), maxY = Math.max(...cells.map(cell => cell.y + side));
    const pad = options.padding ?? 3, root = options.assetRoot || "assets";
    const points = (cx, cy) => Array.from({ length: 6 }, (_, i) => {
      const angle = i * Math.PI / 3;
      return `${cx + side * Math.cos(angle)},${cy + side * Math.sin(angle)}`;
    }).join(" ");
    const shapes = cells.map(cell => {
      const cx = cell.x - minX + pad, cy = cell.y - minY + pad, token = tokenAsset(cell.token, root);
      if (!token) return "";
      const owner = cell.owner === "enemy" ? "r" : "g", count = cell.count || 1;
      const number = count <= 4
      ? `<image href="${numberAsset(count, owner, root)}" x="${cx - 10}" y="${cy - side - 7}" width="20" height="20" preserveAspectRatio="xMidYMid meet"/>`
        : `<text x="${cx}" y="${cy - side + 5}" fill="${owner === "g" ? "#65d08a" : "#fa6862"}" font-size="12" font-weight="900" text-anchor="middle">${count}</text>`;
      return `<polygon points="${points(cx, cy)}" fill="#37414c"/><image href="${token}" x="${cx - side}" y="${cy - side}" width="${side * 2}" height="${side * 2}" preserveAspectRatio="none"/>${number}`;
    }).join("");
    return `<svg class="${options.className || "obj-pattern-preview"}" viewBox="0 0 ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}" aria-label="Motif hexagonal">${shapes}</svg>`;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("La création du PNG a échoué.")), "image/png"));
  }

  const imageDataCache = new Map();

  function resourceAsDataURL(source) {
    if (/^data:/i.test(source)) return Promise.resolve(source);
    const url = new URL(source, document.baseURI).href;
    if (!imageDataCache.has(url)) {
      const data = fetch(url).then(response => {
        if (!response.ok) throw new Error(`Fichier image introuvable : ${url}`);
        return response.blob();
      }).then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Lecture image impossible : ${url}`));
        reader.readAsDataURL(blob);
      }));
      imageDataCache.set(url, data);
    }
    return imageDataCache.get(url);
  }

  function imageAsDataURL(image) {
    return resourceAsDataURL(image.getAttribute("src"));
  }

  async function elementToPngBlob(element, { styles, width = 240, height = 340, scale = 2, prepareClone } = {}) {
    if (!element) throw new Error("Élément à exporter introuvable.");
    if (location.protocol === "file:") {
      throw new Error("Pour exporter, lance preview/start-local-preview.ps1 et ouvre l’adresse locale.");
    }
    const clone = element.cloneNode(true);
    prepareClone?.(clone);
    const originals = [...element.querySelectorAll("img")];
    const copies = [...clone.querySelectorAll("img")];
    for (let index = 0; index < originals.length; index++) {
      if (!originals[index].complete || !originals[index].naturalWidth) {
        throw new Error(`Image pas encore chargée : ${originals[index].alt || index + 1}`);
      }
      copies[index].src = await imageAsDataURL(originals[index]);
      copies[index].removeAttribute("srcset");
    }
    const svgImages = [...element.querySelectorAll("svg image")];
    const svgImageCopies = [...clone.querySelectorAll("svg image")];
    for (let index = 0; index < svgImages.length; index++) {
      const source = svgImages[index].getAttribute("href") || svgImages[index].getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!source) continue;
      const dataURL = await resourceAsDataURL(source);
      svgImageCopies[index].setAttribute("href", dataURL);
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const htmlNS = "http://www.w3.org/1999/xhtml";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.setAttribute("width", String(width));
    foreignObject.setAttribute("height", String(height));
    const html = document.createElementNS(htmlNS, "div");
    const style = document.createElementNS(htmlNS, "style");
    style.textContent = styles || "";
    html.append(style, clone);
    foreignObject.appendChild(html);
    svg.appendChild(foreignObject);

    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const svgURL = URL.createObjectURL(svgBlob);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Le navigateur ne peut pas afficher le SVG de la carte."));
        image.src = svgURL;
      });
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      context.drawImage(image, 0, 0);
      return await canvasToBlob(canvas);
    } finally {
      URL.revokeObjectURL(svgURL);
    }
  }

  return Object.freeze({ patternSVG, canvasToBlob, elementToPngBlob, hexPoints, hexCenter, tokenAsset, numberAsset, playerIconAsset });
})();
