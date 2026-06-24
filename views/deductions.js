// Deductions screen — everything computed from the current state.
(function () {
  "use strict";
  const { el, section } = window.UI;

  window.Views = window.Views || {};
  window.Views.deductions = function (root, App) {
    const GH = App.GH,
      D = App.D,
      state = App.state;
    const byNum = new Map(GH.scenarios.map((s) => [s.number, s]));
    const name = (n) => (byNum.get(n) ? byNum.get(n).name_en : "?");

    const c = D.counters(state, GH);
    const available = D.availablePlays(state);
    const gated = D.gatedScenarios(state);
    const warnings = D.exclusivityWarnings(state);
    const sh = D.shop(state, GH);
    const openDoors = D.doors(state, GH);

    const counters = section(
      "Progress",
      el(
        "div.counter-row",
        null,
        el("div.counter", null, el("span.big", { text: `${c.scenarios.done}/${c.scenarios.total}` }), el("span.muted", { text: "scenarios completed" })),
        el("div.counter", null, el("span.big", { text: `${c.classes.unlocked}/${c.classes.total}` }), el("span.muted", { text: "classes unlocked" })),
        el("div.counter", null, el("span.big", { text: `${c.achievements.earned}/${c.achievements.total}` }), el("span.muted", { text: "achievements earned" })),
        el("div.counter", null, el("span.big", { text: String(sh.available.length) }), el("span.muted", { text: `items in shop (prosperity ${sh.prosperity})` }))
      )
    );

    const avail = section(
      `Available to play now (${available.length})`,
      available.length
        ? el("ul.flat", null, available.map((n) => el("li", null, `🔓 ${n}. ${name(n)}`)))
        : el("p.muted", { text: "Nothing available — unlock or complete scenarios to open paths." })
    );

    const gatedEl = section(
      `Unlocked but not yet playable (${gated.length})`,
      gated.length
        ? el("ul.flat", null, gated.map((g) => el("li", null, `⏳ ${g.number}. ${name(g.number)} — needs ${g.reason}`)))
        : el("p.muted", { text: "None — every unlocked scenario is currently playable." })
    );

    const doorsEl = section(
      `Doors ahead (${openDoors.length})`,
      el("p.muted", { text: "Scenarios your completed/unlocked paths point to that aren't open yet — numbers only, no spoilers." }),
      openDoors.length
        ? el("div.chips", null, openDoors.map((n) => el("span.chip", { text: `🔒 #${n}` })))
        : el("p.muted", { text: "No locked doors from your current frontier." })
    );

    const warnEl = section(
      "Branch warnings",
      warnings.length
        ? el("ul.flat", null, warnings.map((w) => el("li.warn", null, "⚠ " + w)))
        : el("p.muted", { text: "No mutual-exclusivity or blocking conflicts detected." })
    );

    const shopEl = section(
      "Shop outlook",
      el("p", null, `${sh.available.length} items available at prosperity ${sh.prosperity}.`),
      sh.nextLevelCount
        ? el("p.muted", { text: `Reaching prosperity ${sh.nextLevel} adds ${sh.nextLevelCount} new item${sh.nextLevelCount === 1 ? "" : "s"}.` })
        : el("p.muted", { text: "No further prosperity-gated items beyond the current level." })
    );

    root.append(counters, avail, gatedEl, doorsEl, warnEl, shopEl);
  };
})();
