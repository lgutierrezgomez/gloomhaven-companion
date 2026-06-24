// Record (input) screen. Every change calls App.touch() -> auto-save + re-render.
(function () {
  "use strict";
  const { el, section, stepper } = window.UI;

  window.Views = window.Views || {};
  window.Views.record = function (root, App) {
    const GH = App.GH,
      state = App.state;
    const unlocked = new Set(state.scenarios_unlocked);
    const completed = new Set(state.scenarios_completed);

    // --- campaign meta -------------------------------------------------------
    const nameInput = el("input.text", {
      type: "text",
      value: state.party_name,
      placeholder: "Party name",
      oninput: (e) => {
        state.party_name = e.target.value;
        App.scheduleSave(); // no re-render: don't steal focus while typing
      },
    });
    const meta = section(
      "Campaign",
      el("div.row", null, el("label", { text: "Party" }), nameInput),
      stepper("Prosperity", state.prosperity, (v) => App.setState({ prosperity: v }), 1),
      stepper("Reputation", state.reputation, (v) => App.setState({ reputation: v }), -20)
    );

    // --- scenarios -----------------------------------------------------------
    const filter = el("input.text", { type: "text", placeholder: "Filter scenarios by number or name…" });
    const grid = el("div.scenario-grid");

    function setUnlocked(num, on) {
      if (on) unlocked.add(num);
      else {
        unlocked.delete(num);
        completed.delete(num); // can't be completed if not unlocked
      }
      sync();
    }
    function setCompleted(num, on) {
      if (on) {
        completed.add(num);
        unlocked.add(num); // completing implies unlocked
      } else completed.delete(num);
      sync();
    }
    function sync() {
      state.scenarios_unlocked = [...unlocked].sort((a, b) => a - b);
      state.scenarios_completed = [...completed].sort((a, b) => a - b);
      App.touch();
    }

    function drawGrid(q) {
      grid.innerHTML = "";
      const ql = q.trim().toLowerCase();
      for (const sc of GH.scenarios) {
        if (ql) {
          const hay = `${sc.number} ${sc.name_en}`.toLowerCase();
          if (!hay.includes(ql)) continue;
        }
        const u = unlocked.has(sc.number);
        const c = completed.has(sc.number);
        const uBox = el("input", { type: "checkbox", title: "unlocked", ...(u ? { checked: "" } : {}) });
        uBox.checked = u;
        uBox.addEventListener("change", () => setUnlocked(sc.number, uBox.checked));
        const cBox = el("input", { type: "checkbox", title: "completed" });
        cBox.checked = c;
        cBox.addEventListener("change", () => setCompleted(sc.number, cBox.checked));
        grid.append(
          el(
            "div.scenario-row" + (c ? ".is-done" : u ? ".is-open" : ""),
            null,
            el("span.sc-num", { text: String(sc.number) }),
            el("span.sc-name", { text: sc.name_en }),
            el("label.chk", null, uBox, " unlocked"),
            el("label.chk", null, cBox, " completed")
          )
        );
      }
    }
    filter.addEventListener("input", () => drawGrid(filter.value));
    drawGrid("");
    const scenarios = section("Scenarios", filter, grid);

    // --- characters ----------------------------------------------------------
    const charWrap = el("div");
    function drawChars() {
      charWrap.innerHTML = "";
      state.characters.forEach((ch, i) => {
        const mk = (key, placeholder, width) =>
          el("input.text", {
            type: "text",
            value: ch[key] ?? "",
            placeholder,
            style: width ? `width:${width}` : null,
            oninput: (e) => {
              ch[key] = e.target.value;
              App.scheduleSave();
            },
          });
        const lvl = el("input.text", {
          type: "number",
          value: ch.level ?? 1,
          style: "width:4rem",
          oninput: (e) => {
            ch.level = Number(e.target.value) || 1;
            App.scheduleSave();
          },
        });
        charWrap.append(
          el(
            "div.char-row",
            null,
            mk("name", "name", "9rem"),
            mk("class_box_symbol", "class / box symbol", "10rem"),
            el("label.inline", null, "lvl ", lvl),
            mk("personal_quest", "PQ#", "5rem"),
            el("button.btn.danger", {
              text: "✕",
              onclick: () => {
                state.characters.splice(i, 1);
                App.touch();
              },
            })
          )
        );
      });
    }
    drawChars();
    const characters = section(
      "Characters",
      charWrap,
      el("button.btn", {
        text: "+ add character",
        onclick: () => {
          state.characters.push({ name: "", class_box_symbol: "", level: 1, personal_quest: "" });
          App.touch();
        },
      })
    );

    // --- unlocks & achievements ---------------------------------------------
    function tagEditor(title, key, placeholder, numeric) {
      const input = el("input.text", { type: "text", placeholder });
      const add = () => {
        let v = input.value.trim();
        if (!v) return;
        if (numeric) v = Number(v);
        if (numeric && Number.isNaN(v)) return;
        if (!state[key].includes(v)) {
          state[key].push(v);
          if (numeric) state[key].sort((a, b) => a - b);
          App.touch();
        }
        input.value = "";
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") add();
      });
      const chips = el(
        "div.chips",
        null,
        state[key].map((v) =>
          el(
            "span.chip",
            null,
            String(v),
            el("button.chip-x", {
              text: "×",
              onclick: () => {
                state[key] = state[key].filter((x) => x !== v);
                App.touch();
              },
            })
          )
        )
      );
      return section(
        title,
        el("div.row", null, input, el("button.btn", { text: "add", onclick: add })),
        chips
      );
    }

    const unlocksAch = el(
      "div",
      null,
      tagEditor("Unlocked classes (box symbol)", "classes_unlocked", "e.g. Cthulhu, Three Spears", false),
      tagEditor("Global achievements earned", "global_achievements", "achievement name", false),
      tagEditor("Party achievements earned", "party_achievements", "achievement name", false),
      tagEditor("Unlocked items (number)", "items_unlocked", "item number", true)
    );

    // --- notes ---------------------------------------------------------------
    const notes = section(
      "Notes",
      el("textarea.notes", {
        rows: 6,
        placeholder: "Sealed envelopes opened, town records, stickers, anything…",
        oninput: (e) => {
          state.notes = e.target.value;
          App.scheduleSave();
        },
        text: state.notes,
      })
    );

    root.append(meta, scenarios, characters, unlocksAch, notes);
  };
})();
