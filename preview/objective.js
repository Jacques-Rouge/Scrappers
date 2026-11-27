    const CARD_THEMES = {
      energie: { ink: '#654a2c', trim: '#ffd34e' },
      ressource: { ink: '#29465a', trim: '#81d3df' },
      humain: { ink: '#285444', trim: '#83e2b2' },
      construction: { ink: '#694038', trim: '#ffad94' },
      science: { ink: '#4c3760', trim: '#d59aff' }
    };
    let selectedTheme = 'humain';
    let selectedFamily = 'humains';
    const objectiveCard = document.querySelector('.objective-card');
    document.querySelectorAll('.theme-choice').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.theme-choice').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        selectedTheme = button.dataset.theme;
        objectiveCard.dataset.theme = selectedTheme;
      });
    });
    const familyTheme = { humains: 'humain', guerre: 'construction', veneration: 'ressource' };
    document.getElementById('objective-family').addEventListener('change', event => {
      selectedFamily = event.target.value;
      document.querySelector(`.theme-choice[data-theme="${familyTheme[selectedFamily]}"]`).click();
    });
    const tokenPaths = {
      grid: '../assets/token/token_grid.png', gun: '../assets/token/token_gun.png',
      human: '../assets/token/token_human.png', dead: '../assets/token/token_human_dead.png'
    };
    let selectedToken = 'grid';
    let selectedOwner = 'ally';
    document.getElementById('quantity').max = '3';

    document.querySelectorAll('.tool[data-token]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
        button.classList.add('active');
        selectedToken = button.dataset.token;
        const quantity = document.getElementById('quantity');
        quantity.max = selectedToken === 'gun' ? '1' : selectedToken === 'grid' ? '3' : '6';
        quantity.value = Math.min(Number(quantity.value) || 1, Number(quantity.max));
      });
    });
    document.querySelectorAll('.owner-select button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.owner-select button').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        selectedOwner = button.dataset.owner;
      });
    });
    let selectedCriterion = 'eq';
    document.querySelectorAll('.criterion-select button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.criterion-select button').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        selectedCriterion = button.dataset.criterion;
        const criterionImage = document.getElementById('criterion-image');
        criterionImage.src = `../assets/divers/div_${selectedCriterion}.png`;
        criterionImage.alt = selectedCriterion === 'eq' ? 'Quantité exacte' : 'Au moins cette quantité';
      });
    });
    const setPoints = value => {
      const image = document.getElementById('points-image');
      image.src = `../assets/numbers/num_${value}.png`;
      image.alt = `${value} points de victoire`;
      document.getElementById('points-picker').value = value;
      document.getElementById('points-control').value = value;
    };
    document.getElementById('points-picker').addEventListener('change', event => setPoints(event.target.value));
    document.getElementById('points-control').addEventListener('change', event => setPoints(event.target.value));

    // Build a compact 2x4 patch using the same flat-top axial hex geometry as
    // the game board, with full-size cells so neighboring hexes meet directly.
    const svgNS = 'http://www.w3.org/2000/svg';
    const mapSvg = document.getElementById('objective-map');
    const layoutPicker = document.getElementById('layout-picker');
    const mapContent = document.createElementNS(svgNS, 'g');
    mapSvg.appendChild(mapContent);
    const boardCells = new Map();
    const size = 128;
    const cellPoints = (x, y) => BoardGameRender.hexPoints(x, y, size);

    function drawCell(cell) {
      const { group, x, y, index } = cell;
      group.replaceChildren();
      const points = cellPoints(x, y);
      const base = document.createElementNS(svgNS, 'polygon');
      base.setAttribute('points', points);
      base.setAttribute('class', 'map-hex');
      group.appendChild(base);

      if (cell.token) {
        const image = document.createElementNS(svgNS, 'image');
        image.setAttribute('href', BoardGameRender.tokenAsset(cell.token, '../assets'));
        image.setAttribute('x', x - size); image.setAttribute('y', y - size * Math.sqrt(3) / 2);
        image.setAttribute('width', size * 2); image.setAttribute('height', size * Math.sqrt(3));
        image.setAttribute('preserveAspectRatio', 'none');
        image.setAttribute('class', 'map-token');
        group.appendChild(image);

        const occupiedOwners = ['enemy', 'ally'].filter(owner => cell.counts[owner] > 0);
        occupiedOwners.forEach(owner => {
          const amount = cell.counts[owner];
          const hasColorVariant = amount <= 4;
          const countImage = document.createElementNS(svgNS, 'image');
          countImage.setAttribute('href', BoardGameRender.numberAsset(amount, owner, '../assets'));
          const labelOffset = occupiedOwners.length === 2 ? (owner === 'ally' ? 30 : -30) : 0;
          countImage.setAttribute('x', x + labelOffset - 31);
          countImage.setAttribute('y', y - size * .98 - 12);
          countImage.setAttribute('width', 62); countImage.setAttribute('height', 62);
          countImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          countImage.setAttribute('data-owner', owner);
          countImage.setAttribute('class', `map-count-number${hasColorVariant ? '' : ' fallback'}`);
          group.appendChild(countImage);
        });
      }

    }

    function getMapOffset(activeCells = [...boardCells.values()].filter(cell => cell.enabled)) {
      const minX = Math.min(...activeCells.map(cell => cell.x - size));
      const maxX = Math.max(...activeCells.map(cell => cell.x + size));
      const minY = Math.min(...activeCells.map(cell => cell.y - size));
      const maxY = Math.max(...activeCells.map(cell => cell.y + size));
      return { offsetX: 416 - (minX + maxX) / 2, offsetY: 295 - (minY + maxY) / 2 };
    }
    function updateMapLayout() {
      const activeCells = [...boardCells.values()].filter(cell => cell.enabled);
      const { offsetX, offsetY } = getMapOffset(activeCells);
      mapContent.setAttribute('transform', `translate(${offsetX} ${offsetY})`);
      for (const cell of boardCells.values()) {
        cell.group.style.display = cell.enabled ? '' : 'none';
        cell.layoutGroup.classList.toggle('active', cell.enabled);
      }
    }

    let cellIndex = 0;
    const imageCells = [
      { q: 0, r: 0, x: 128, y: 240 }, { q: 0, r: 1, x: 128, y: 462 },
      { q: 1, r: -1, x: 320, y: 129 }, { q: 1, r: 0, x: 320, y: 351 },
      { q: 2, r: -1, x: 512, y: 240 }, { q: 2, r: 0, x: 512, y: 462 },
      { q: 3, r: -2, x: 704, y: 129 }, { q: 3, r: -1, x: 704, y: 351 }
    ];
    for (const { q, r, x, y } of imageCells) {
        const group = document.createElementNS(svgNS, 'g');
        group.style.cursor = 'pointer';
        const cell = { q, r, x, y, index: cellIndex++, group, token: null, counts: { ally: 0, enemy: 0 }, enabled: true };
        group.addEventListener('click', () => {
          if (selectedToken === 'clear') {
            cell.token = null; cell.counts = { ally: 0, enemy: 0 };
          } else {
            if (cell.token !== selectedToken) cell.counts = { ally: 0, enemy: 0 };
            cell.token = selectedToken;
            const maximum = selectedToken === 'gun' ? 1 : selectedToken === 'grid' ? 3 : 6;
            cell.amount = Math.max(1, Math.min(maximum, Number(document.getElementById('quantity').value) || 1));
            cell.counts[selectedOwner] = cell.amount;
          }
          drawCell(cell);
        });
        const layoutGroup = document.createElementNS(svgNS, 'g');
        layoutGroup.classList.add('layout-hex', 'active');
        const layoutPoly = document.createElementNS(svgNS, 'polygon');
        layoutPoly.setAttribute('points', cellPoints(x, y));
        layoutGroup.appendChild(layoutPoly);
        layoutGroup.addEventListener('click', () => {
          if (cell.enabled && [...boardCells.values()].filter(item => item.enabled).length === 1) return;
          cell.enabled = !cell.enabled;
          updateMapLayout();
        });
        cell.layoutGroup = layoutGroup;
        boardCells.set(`${q},${r}`, cell);
        mapContent.appendChild(group);
        layoutPicker.appendChild(layoutGroup);
        drawCell(cell);
    }

    // A small sample shows how the icons fill each connected board hex.
    [['0,0', 'grid', 'ally', 1], ['0,0', 'grid', 'enemy', 2], ['1,-1', 'gun', 'ally', 1], ['2,-1', 'gun', 'ally', 1]].forEach(([key, token, owner, amount]) => {
      const cell = boardCells.get(key);
      cell.token = token; cell.counts[owner] = amount; drawCell(cell);
    });
    updateMapLayout();

    const randomNames = {
      humains: ['La patrouille', 'Le rassemblement', 'La relève', 'La ligne humaine', 'Les voisins', 'Le survivant', 'Le passage', 'La compagnie'],
      guerre: ['Batterie avancée', 'Tir croisé', 'Le verrou', 'La brèche', 'La ligne de feu', 'Le siège', 'La contrebatterie', 'La forteresse'],
      veneration: ['L’autel', 'Le grand pilier', 'La procession', 'Le sanctuaire', 'Les deux piliers', 'Le sommet', 'Le cercle sacré', 'La consécration']
    };
    const axialNeighbors = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const pick = items => items[Math.floor(Math.random() * items.length)];
    function randomConnectedCells(amount, candidates = [...boardCells.values()].filter(cell => cell.enabled)) {
      const selected = [pick(candidates)];
      while (selected.length < amount) {
        const adjacent = candidates.filter(candidate => !selected.includes(candidate) && selected.some(cell =>
          axialNeighbors.some(([dq, dr]) => candidate.q === cell.q + dq && candidate.r === cell.r + dr)));
        if (!adjacent.length) break;
        selected.push(pick(adjacent));
      }
      return selected;
    }
    function randomizeObjective() {
      selectedFamily = document.getElementById('objective-family').value;
      document.querySelectorAll('.theme-choice').forEach(item => item.classList.remove('active'));
      const themeButton = document.querySelector(`.theme-choice[data-theme="${familyTheme[selectedFamily]}"]`);
      themeButton.classList.add('active'); selectedTheme = familyTheme[selectedFamily]; objectiveCard.dataset.theme = selectedTheme;
      for (const cell of boardCells.values()) { cell.token = null; cell.counts = { ally: 0, enemy: 0 }; drawCell(cell); }
      const tokenPool = selectedFamily === 'humains'
        ? ['human', 'human', 'human', 'dead']
        : selectedFamily === 'guerre' ? ['gun', 'gun', 'gun', 'human', 'grid'] : ['grid', 'grid', 'grid', 'human'];
      const cells = randomConnectedCells(2 + Math.floor(Math.random() * 3));
      cells.forEach((cell, index) => {
        cell.token = pick(tokenPool);
        const owner = index > 0 && Math.random() < .28 ? 'enemy' : 'ally';
        const amount = cell.token === 'grid' || cell.token === 'human' ? 1 + Math.floor(Math.random() * 3) : 1;
        cell.counts[owner] = amount;
        drawCell(cell);
      });
      selectedCriterion = Math.random() < .3 ? 'eq' : 'sup_eq';
      document.querySelectorAll('.criterion-select button').forEach(button => button.classList.toggle('active', button.dataset.criterion === selectedCriterion));
      document.getElementById('criterion-image').src = `../assets/divers/div_${selectedCriterion}.png`;
      document.getElementById('criterion-image').alt = selectedCriterion === 'eq' ? 'Quantité exacte' : 'Au moins cette quantité';
      const points = Math.min(6, 1 + Math.floor(cells.length / 2) + (selectedCriterion === 'eq' ? 1 : 0));
      setPoints(points);
      document.querySelector('.card-title').value = pick(randomNames[selectedFamily]);
    }
    document.getElementById('randomize-objective').addEventListener('click', randomizeObjective);

    function slugify(value) {
      return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'objectif';
    }

    const ideaGrid = document.getElementById('idea-grid');
    let objectiveIdeas = [];
    const familyTokenPools = {
      humains: ['human', 'human', 'human', 'dead', 'gun'],
      guerre: ['gun', 'gun', 'gun', 'human', 'grid'],
      veneration: ['grid', 'grid', 'grid', 'human', 'dead'],
    };
    const batchCells = imageCells.map(({ q, r }) => ({ q, r }));
    function makeRandomIdea(index, seen) {
      const families = ['humains', 'guerre', 'veneration'];
      const family = families[(index - 1) % families.length];
      let idea;
      for (let attempt = 0; attempt < 80; attempt++) {
        const count = 1 + Math.floor(Math.random() * 4);
        const chosen = randomConnectedCells(count, batchCells);
        const cells = chosen.map((cell, cellIndex) => {
          const token = pick(familyTokenPools[family]);
          const owner = cellIndex > 0 && Math.random() < .28 ? 'enemy' : 'ally';
          const max = token === 'gun' ? 1 : token === 'grid' ? 3 : 6;
          return { q: cell.q, r: cell.r, token, owner, count: 1 + Math.floor(Math.random() * Math.min(max, 3)) };
        });
        const criterion = Math.random() < .3 ? 'eq' : 'sup_eq';
        const signature = `${family}|${criterion}|${cells.map(cell => `${cell.q},${cell.r}:${cell.token}:${cell.owner}:${cell.count}`).sort().join('|')}`;
        idea = { family, theme: familyTheme[family], title: pick(randomNames[family]), text: '', pts: Math.min(6, Math.max(1, Math.ceil(count / 2) + (criterion === 'eq' ? 1 : 0))), pattern: { version: 1, criterion, cells } };
        if (!seen.has(signature)) { seen.add(signature); break; }
      }
      return idea;
    }
    function escapeIdeaText(value) {
      return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    }
    function renderIdeaPreview(article, idea) {
      article.querySelector('.idea-preview').innerHTML = BoardGameObjectiveRenderer.render(idea, 'ui', { assetRoot: '../assets' });
    }
    function renderIdeaCards() {
      ideaGrid.innerHTML = objectiveIdeas.map((idea, index) => `
        <article class="idea-card kept" data-idea-index="${index}">
          <header class="idea-card-header"><span>Piste ${String(index + 1).padStart(2, '0')}</span><label class="idea-keep"><input type="checkbox" checked> Garder</label></header>
          <div class="idea-preview"></div>
          <div class="idea-fields">
            <label>Titre<input data-field="title" maxlength="48" value="${escapeIdeaText(idea.title)}"></label>
            <label>Points<select data-field="pts">${[1,2,3,4,5,6].map(value => `<option value="${value}"${value === idea.pts ? ' selected' : ''}>${value} PV</option>`).join('')}</select></label>
            <label>Famille<select data-field="family">${[['humains','Humains'],['guerre','Guerre'],['veneration','Vénération']].map(([value,label]) => `<option value="${value}"${value === idea.family ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
            <label>Condition<select data-field="criterion"><option value="eq"${idea.pattern.criterion === 'eq' ? ' selected' : ''}>Exactement</option><option value="sup_eq"${idea.pattern.criterion === 'sup_eq' ? ' selected' : ''}>Au moins</option></select></label>
            <label class="idea-annotation">Annotation / règle<textarea data-field="text" maxlength="240" placeholder="Décris ce que le motif demande…">${escapeIdeaText(idea.text)}</textarea></label>
          </div>
        </article>`).join('');
      objectiveIdeas.forEach((idea, index) => renderIdeaPreview(ideaGrid.children[index], idea));
      document.getElementById('batch-status').textContent = `${objectiveIdeas.length} pistes générées. Annote-les et décoche celles à écarter.`;
    }
    document.getElementById('generate-batch').addEventListener('click', () => {
      const requested = Math.max(1, Math.min(60, Number(document.getElementById('batch-size').value) || 30));
      document.getElementById('batch-size').value = requested;
      const seen = new Set();
      objectiveIdeas = Array.from({ length: requested }, (_, index) => makeRandomIdea(index + 1, seen));
      renderIdeaCards();
    });
    ideaGrid.addEventListener('input', event => {
      const article = event.target.closest('.idea-card');
      if (!article) return;
      const idea = objectiveIdeas[Number(article.dataset.ideaIndex)];
      const field = event.target.dataset.field;
      if (field === 'title' || field === 'text') idea[field] = event.target.value;
      if (event.target.matches('.idea-keep input')) article.classList.toggle('kept', event.target.checked);
    });
    ideaGrid.addEventListener('change', event => {
      const article = event.target.closest('.idea-card');
      if (!article) return;
      const idea = objectiveIdeas[Number(article.dataset.ideaIndex)];
      const field = event.target.dataset.field;
      if (field === 'pts') idea.pts = Number(event.target.value);
      if (field === 'family') { idea.family = event.target.value; idea.theme = familyTheme[idea.family]; }
      if (field === 'criterion') idea.pattern.criterion = event.target.value;
      if (field === 'pts' || field === 'family' || field === 'criterion') renderIdeaPreview(article, idea);
    });
    document.getElementById('select-all-ideas').addEventListener('click', () => {
      ideaGrid.querySelectorAll('.idea-card').forEach(article => { article.querySelector('.idea-keep input').checked = true; article.classList.add('kept'); });
    });
    document.getElementById('clear-ideas').addEventListener('click', () => {
      ideaGrid.querySelectorAll('.idea-card').forEach(article => { article.querySelector('.idea-keep input').checked = false; article.classList.remove('kept'); });
    });
    document.getElementById('export-batch').addEventListener('click', async () => {
      const status = document.getElementById('batch-status');
      const chosen = [...ideaGrid.querySelectorAll('.idea-card')].filter(article => article.querySelector('.idea-keep input').checked);
      if (!chosen.length) { status.textContent = 'Coche au moins une piste à exporter.'; return; }
      try {
        if (!window.showDirectoryPicker) throw new Error('Choisis un dossier depuis un navigateur compatible avec l’écriture locale.');
        const selectedDirectory = await window.showDirectoryPicker({ mode: 'readwrite', id: 'boardgame-objectives' });
        const directory = await objectiveDirectoryFrom(selectedDirectory);
        const usedIds = new Set();
        for await (const [name, handle] of directory.entries()) {
          if (handle.kind !== 'file' || !name.toLowerCase().endsWith('.json')) continue;
          usedIds.add(createObjectiveDefinition(JSON.parse(await (await handle.getFile()).text())).id);
        }
        for (const article of chosen) {
          const index = Number(article.dataset.ideaIndex), idea = objectiveIdeas[index];
          const familyPrefix = idea.family === 'humains' ? 'hum' : idea.family === 'guerre' ? 'war' : 'ven';
          const baseId = `${familyPrefix}-${slugify(idea.title)}`;
          let id = baseId, suffix = 2;
          while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
          usedIds.add(id);
          const definition = createObjectiveDefinition({ ...idea, id });
          const file = await directory.getFileHandle(`${id}.json`, { create: true });
          const writable = await file.createWritable();
          await writable.write(JSON.stringify(definition, null, 2));
          await writable.close();
        }
        const catalogSize = await rebuildObjectiveCatalog(directory);
        status.textContent = `${chosen.length} définitions JSON enregistrées et catalogue moteur régénéré (${catalogSize} objectifs).`;
      } catch (error) {
        status.textContent = error.name === 'AbortError' ? 'Export annulé.' : `Export impossible : ${error.message}`;
      }
    });

    function objectiveDefinition() {
      const cells = [];
      for (const cell of boardCells.values()) {
        if (!cell.enabled || !cell.token) continue;
        for (const owner of ['ally', 'enemy']) {
          const count = Math.max(0, Number(cell.counts[owner]) || 0);
          if (count) cells.push({ q: cell.q, r: cell.r, token: cell.token, owner, count,
            ...(cell.token === 'human' && cell.minTower ? { minTower: cell.minTower } : {}) });
        }
      }
      const title = document.querySelector('.card-title').value.trim() || 'Objectif';
      const filename = `objectif-${slugify(title)}`;
      return createObjectiveDefinition({
        id: filename,
        family: selectedFamily,
        theme: selectedTheme,
        title,
        pts: Number(document.getElementById('points-picker').value),
        pattern: { version: 1, criterion: selectedCriterion, cells },
      });
    }
    async function renderObjectivePng(definition) {
      const container = document.createElement('div');
      container.innerHTML = BoardGameObjectiveRenderer.render(definition, 'card', { assetRoot: '../assets' });
      document.body.append(container);
      try {
        await Promise.all([...container.querySelectorAll('img')].map(image => image.decode()));
        await document.fonts.ready;
        const styles = await fetch('../src/render/objectives.css').then(response => response.text());
        return await BoardGameRender.elementToPngBlob(container.firstElementChild, {
          styles, width: 300, height: 460, scale: 2,
        });
      } finally {
        container.remove();
      }
    }
    async function objectiveDirectoryFrom(handle) {
      if (handle.name === 'objectives') return handle;
      if (handle.name === 'assets') return handle.getDirectoryHandle('objectives', { create: true });
      const assetsHandle = await handle.getDirectoryHandle('assets', { create: true });
      return assetsHandle.getDirectoryHandle('objectives', { create: true });
    }
    async function rebuildObjectiveCatalog(directory) {
      const definitions = new Map();
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind !== 'file' || !name.toLowerCase().endsWith('.json')) continue;
        const file = await handle.getFile();
        const definition = createObjectiveDefinition(JSON.parse(await file.text()));
        definitions.set(definition.id, definition);
      }
      const catalog = [...definitions.values()];
      const serialized = JSON.stringify(catalog, null, 2)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      const js = `// Generated by preview/objective.js from the JSON definitions in this folder.\nwindow.GENERATED_OBJECTIVES = ${serialized};\n`;
      const catalogHandle = await directory.getFileHandle('catalog.js', { create: true });
      const writable = await catalogHandle.createWritable();
      await writable.write(js);
      await writable.close();
      return catalog.length;
    }
    document.getElementById('export-png').addEventListener('click', async () => {
      const status = document.getElementById('export-status');
      const directoryPromise = window.showDirectoryPicker
        ? window.showDirectoryPicker({ mode: 'readwrite', id: 'boardgame-objectives' })
        : Promise.resolve(null);
      try {
        const chosenDirectory = await directoryPromise;
        if (!chosenDirectory) throw new Error('Ouvre cette page dans un navigateur qui permet de choisir un dossier.');
        const definition = objectiveDefinition();
        const blob = await renderObjectivePng(definition);
        const filename = `${definition.id}.png`;
        const targetDirectory = await objectiveDirectoryFrom(chosenDirectory);
        const fileHandle = await targetDirectory.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob); await writable.close();
        const jsonHandle = await targetDirectory.getFileHandle(`${definition.id}.json`, { create: true });
        const jsonWritable = await jsonHandle.createWritable();
        await jsonWritable.write(JSON.stringify(definition, null, 2)); await jsonWritable.close();
        const catalogSize = await rebuildObjectiveCatalog(targetDirectory);
        status.textContent = `Enregistrés : ${filename}, ${definition.id}.json et catalogue moteur (${catalogSize} objectifs).`;
      } catch (error) {
        status.textContent = error.name === 'AbortError' ? 'Export annulé.' : `Export impossible : ${error.message}`;
      }
    });
    document.getElementById('generate-batch').click();
