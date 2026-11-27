    BoardGameCardStudio.render();

    const exportKey = new URLSearchParams(location.search).get("card");
    if (exportKey) {
      document.body.classList.add("single-export");
      document.querySelectorAll(".card-wrapper").forEach(wrapper => {
        wrapper.classList.toggle("export-target", wrapper.querySelector(".card")?.dataset.exportKey === exportKey);
      });
    }

    function cycleRotation(idx) {
      const el = document.getElementById(`card-${idx}`);
      const cur = parseInt(el.dataset.rot, 10);
      const next = cur === 0 ? 45 : (cur === 45 ? 90 : 0);
      el.classList.remove(`rot-${cur}`);
      el.classList.add(`rot-${next}`);
      el.dataset.rot = next;
    }

    function resetAllRotations() {
      document.querySelectorAll(".card").forEach(el => {
        el.classList.remove("rot-45", "rot-90");
        el.classList.add("rot-0");
        el.dataset.rot = 0;
      });
    }

    async function renderCardPNG(elementId) {
      const node = document.getElementById(elementId);
      const [pageStyles, sharedStyles] = await Promise.all([
        fetch("cards.css").then(response => response.text()),
        fetch("../src/render/cards.css").then(response => response.text()),
      ]);
      return BoardGameRender.elementToPngBlob(node, {
        styles: `${sharedStyles}\n${pageStyles.replace(/^@import[^;]+;\s*/m, "")}`,
        width: 240,
        height: 340,
        scale: 2,
        prepareClone(clone) {
          clone.classList.remove("rot-45", "rot-90");
          clone.classList.add("rot-0");
          clone.style.margin = "0";
          clone.style.boxShadow = "none";
        },
      }).catch(error => {
        throw new Error(`Le rendu de ${node?.dataset.exportKey || elementId} a échoué : ${error.message}`);
      });
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function crc32(bytes) {
      let crc = 0xffffffff;
      for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      return (crc ^ 0xffffffff) >>> 0;
    }

    async function createZip(files) {
      const encoder = new TextEncoder();
      const localParts = [];
      const centralParts = [];
      let localOffset = 0;
      const now = new Date();
      const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
      const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

      for (const file of files) {
        const name = encoder.encode(file.name);
        const data = new Uint8Array(await file.blob.arrayBuffer());
        const crc = crc32(data);
        const local = new Uint8Array(30 + name.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true); lv.setUint16(10, dosTime, true); lv.setUint16(12, dosDate, true);
        lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
        lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true); local.set(name, 30);
        localParts.push(local, data);

        const central = new Uint8Array(46 + name.length);
        const cv = new DataView(central.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true); cv.setUint16(10, 0, true); cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
        cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, localOffset, true);
        central.set(name, 46);
        centralParts.push(central);
        localOffset += local.length + data.length;
      }

      const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
      const end = new Uint8Array(22);
      const ev = new DataView(end.buffer);
      ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
      ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
      ev.setUint32(12, centralSize, true); ev.setUint32(16, localOffset, true); ev.setUint16(20, 0, true);
      return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
    }

    async function exportAllCardsPNG() {
      const button = document.getElementById("btn-export-all");
      const status = document.getElementById("export-status");
      const cards = [...document.querySelectorAll(".card[data-export-key]")];
      if (button.disabled || cards.length !== 30) return;
      button.disabled = true;
      const files = [];
      try {
        for (let index = 0; index < cards.length; index++) {
          const card = cards[index];
          status.textContent = `Rendu des cartes… ${index + 1}/${cards.length}`;
          files.push({ name: `${card.dataset.exportKey}.png`, blob: await renderCardPNG(card.id) });
        }
        status.textContent = "Création de l’archive…";
        downloadBlob(await createZip(files), "ferrailleurs-cartes.zip");
        status.textContent = "ZIP téléchargé : extrais les 30 PNG dans assets/cards/.";
      } catch (error) {
        status.textContent = `Export interrompu : ${error.message}`;
      } finally {
        button.disabled = false;
      }
    }

    function exportCardPNG(elementId, filename) {
      renderCardPNG(elementId).then(blob => downloadBlob(blob, `${filename}.png`)).catch(error => {
        const status = document.getElementById("export-status");
        if (status) status.textContent = error.message;
      });
    }
