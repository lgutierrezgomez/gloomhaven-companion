// Core controller + storage. Loaded after knowledge.js, deductions.js and the
// view scripts. Owns the campaign state, persistence, and tab routing.
(function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const SAVES_DIR = "saves";

  // Seed used for a brand-new campaign and as the import-default. Mirrors the
  // project's existing core/state/campaign.json starting point.
  function seedState() {
    return {
      schema_version: SCHEMA_VERSION,
      party_name: "",
      reputation: 0,
      prosperity: 1,
      scenarios_unlocked: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 16, 18, 19, 20, 22, 23, 24, 25, 26,
        28, 30, 31, 34, 35, 36, 37, 38, 39, 42, 43, 44, 48, 51, 64, 65, 68, 72,
        76, 81, 82, 83, 84, 90, 93,
      ],
      scenarios_completed: [
        1, 2, 3, 4, 8, 13, 14, 16, 18, 20, 22, 24, 25, 26, 30, 31, 34, 38, 42,
        43, 48, 64, 68, 84, 93,
      ],
      characters: [],
      classes_unlocked: [],
      global_achievements: [],
      party_achievements: [],
      items_unlocked: [],
      notes: "",
    };
  }

  function emptyState() {
    const s = seedState();
    s.scenarios_unlocked = [1];
    s.scenarios_completed = [];
    return s;
  }

  // Normalize a loaded object so older/partial saves never crash the UI.
  function normalize(raw) {
    const base = emptyState();
    const s = Object.assign(base, raw || {});
    s.schema_version = SCHEMA_VERSION;
    for (const key of [
      "scenarios_unlocked",
      "scenarios_completed",
      "classes_unlocked",
      "global_achievements",
      "party_achievements",
      "items_unlocked",
    ]) {
      s[key] = Array.isArray(s[key]) ? s[key] : [];
    }
    s.characters = Array.isArray(s.characters) ? s.characters : [];
    s.prosperity = Number(s.prosperity) || 1;
    s.reputation = Number(s.reputation) || 0;
    s.party_name = typeof s.party_name === "string" ? s.party_name : "";
    s.notes = typeof s.notes === "string" ? s.notes : "";
    return s;
  }

  // ---- IndexedDB: persist the granted directory handle across sessions ------
  const idb = {
    open() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open("gh-companion", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("handles");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    async set(key, val) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readwrite");
        tx.objectStore("handles").put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async get(key) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readonly");
        const r = tx.objectStore("handles").get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    },
  };

  const hasFSA = typeof window.showDirectoryPicker === "function";

  const App = {
    GH: window.GH,
    D: window.Deductions,
    state: seedState(),
    dirHandle: null,
    saveName: null, // e.g. "my-party.json"
    activeTab: "tree",
    saveTimer: null,
    statusEl: null,

    async init() {
      this.statusEl = document.getElementById("status");
      this.bindTabs();
      // Try to silently restore a previously-granted folder.
      if (hasFSA) {
        try {
          const handle = await idb.get("dir");
          if (handle && (await this.verifyPermission(handle, false))) {
            this.dirHandle = handle;
            await this.refreshSavesAndLoad();
          }
        } catch (e) {
          /* ignore — user can re-pick */
        }
      } else {
        this.setStatus(
          "This browser has no File System Access API — auto-save is off. Use Load / Export instead. (Chrome or Edge recommended.)"
        );
      }
      this.render();
      this.updateFolderBar();
    },

    bindTabs() {
      document.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.activeTab = btn.dataset.tab;
          document
            .querySelectorAll("[data-tab]")
            .forEach((b) => b.classList.toggle("active", b === btn));
          this.render();
        });
      });
      document.getElementById("btn-open-folder").addEventListener("click", () => this.openFolder());
      document.getElementById("btn-new").addEventListener("click", () => this.newCampaign());
      document.getElementById("btn-load").addEventListener("click", () => this.importFile());
      document.getElementById("btn-export").addEventListener("click", () => this.exportFile());
    },

    setStatus(msg) {
      if (this.statusEl) this.statusEl.textContent = msg;
    },

    // ---- state mutation ----------------------------------------------------
    setState(patch) {
      Object.assign(this.state, patch);
      this.scheduleSave();
      this.render();
    },
    // For in-place edits (arrays/objects already mutated) that still need save+render.
    touch() {
      this.scheduleSave();
      this.render();
    },

    toggleInArray(key, value) {
      const arr = this.state[key];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(value);
      arr.sort((a, b) => (typeof a === "number" ? a - b : String(a).localeCompare(b)));
      this.touch();
    },

    // ---- persistence -------------------------------------------------------
    async verifyPermission(handle, requestIfNeeded) {
      const opts = { mode: "readwrite" };
      if ((await handle.queryPermission(opts)) === "granted") return true;
      if (requestIfNeeded && (await handle.requestPermission(opts)) === "granted") return true;
      return false;
    },

    async openFolder() {
      if (!hasFSA) {
        this.setStatus("File System Access API unavailable in this browser.");
        return;
      }
      try {
        const handle = await window.showDirectoryPicker({ id: "gh-saves", mode: "readwrite" });
        if (!(await this.verifyPermission(handle, true))) return;
        this.dirHandle = handle;
        await idb.set("dir", handle);
        await this.refreshSavesAndLoad();
        this.updateFolderBar();
        this.render();
      } catch (e) {
        if (e && e.name !== "AbortError") this.setStatus("Could not open folder: " + e.message);
      }
    },

    async getSavesDir(create) {
      return this.dirHandle.getDirectoryHandle(SAVES_DIR, { create: !!create });
    },

    async listSaves() {
      try {
        const dir = await this.getSavesDir(true);
        const names = [];
        for await (const [name, h] of dir.entries()) {
          if (h.kind === "file" && name.endsWith(".json")) names.push(name);
        }
        return names.sort();
      } catch {
        return [];
      }
    },

    async refreshSavesAndLoad() {
      const saves = await this.listSaves();
      if (saves.length) {
        await this.loadSave(this.saveName && saves.includes(this.saveName) ? this.saveName : saves[0]);
      } else {
        // No save yet — offer to seed the first campaign from the known state.
        this.saveName = "campaign.json";
        this.state = seedState();
        await this.writeActiveSave();
        this.setStatus("Created saves/campaign.json from the current campaign state.");
      }
    },

    async loadSave(name) {
      const dir = await this.getSavesDir(true);
      const fh = await dir.getFileHandle(name);
      const file = await fh.getFile();
      const text = await file.text();
      this.state = normalize(JSON.parse(text));
      this.saveName = name;
      this.setStatus(`Loaded ${name}.`);
    },

    scheduleSave() {
      if (!this.dirHandle || !this.saveName) return;
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.writeActiveSave(), 300);
    },

    async writeActiveSave() {
      if (!this.dirHandle || !this.saveName) return;
      try {
        const dir = await this.getSavesDir(true);
        const fh = await dir.getFileHandle(this.saveName, { create: true });
        const w = await fh.createWritable();
        await w.write(JSON.stringify(this.state, null, 2));
        await w.close();
        const t = new Date();
        this.setStatus(`Saved ${this.saveName} at ${t.toLocaleTimeString()}.`);
      } catch (e) {
        this.setStatus("Save failed (permission lost?). Click ‘Open campaign folder’ to re-grant. " + e.message);
      }
    },

    async newCampaign() {
      const name = (prompt("New campaign file name (without .json):", "new-party") || "").trim();
      if (!name) return;
      this.saveName = name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() + ".json";
      this.state = emptyState();
      if (this.dirHandle) await this.writeActiveSave();
      else this.setStatus("New campaign in memory — open a folder or Export to persist it.");
      this.render();
      this.updateFolderBar();
    },

    // ---- import / export fallback -----------------------------------------
    importFile() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            this.state = normalize(JSON.parse(reader.result));
            this.saveName = file.name;
            this.setStatus(`Imported ${file.name} (in memory). Export to write it back.`);
            this.render();
            this.updateFolderBar();
          } catch (e) {
            this.setStatus("Import failed: " + e.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    exportFile() {
      const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = this.saveName || "campaign.json";
      a.click();
      URL.revokeObjectURL(a.href);
    },

    updateFolderBar() {
      const el = document.getElementById("folder-info");
      if (!el) return;
      const where = this.dirHandle ? `${this.dirHandle.name}/${SAVES_DIR}/` : "(no folder)";
      el.textContent = `${where}${this.saveName || ""}`;
    },

    // ---- rendering ---------------------------------------------------------
    render() {
      const root = document.getElementById("view");
      root.innerHTML = "";
      const views = window.Views;
      const fn = {
        tree: views.tree,
        record: views.record,
        reference: views.reference,
        deductions: views.deductions,
      }[this.activeTab];
      if (fn) fn(root, this);
      this.updateFolderBar();
    },
  };

  window.App = App;
  document.addEventListener("DOMContentLoaded", () => App.init());
})();
