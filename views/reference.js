// Reference (view) screen. Shows ONLY unlocked content; locked content is
// summarized as counts, never named. Honors the "hide with counts" rule.
(function () {
  "use strict";
  const { el, section } = window.UI;

  window.Views = window.Views || {};
  window.Views.reference = function (root, App) {
    const GH = App.GH,
      D = App.D,
      state = App.state;
    const c = D.counters(state, GH);

    // --- classes -------------------------------------------------------------
    const unlockedClasses = GH.classes.filter(
      (cl) => cl.starter || state.classes_unlocked.includes(cl.box_symbol)
    );
    const lockedCount = GH.classes.length - unlockedClasses.length;
    const classCards = unlockedClasses.map((cl) =>
      el(
        "div.entry",
        null,
        el("strong", { text: cl.name }),
        el("span.muted", { text: `  ${cl.race || ""} · ${cl.starter ? "starter" : "unlocked"}` }),
        cl.playstyle ? el("div.muted", { text: cl.playstyle }) : null
      )
    );
    const classes = section(
      `Classes — ${c.classes.unlocked}/${c.classes.total} unlocked`,
      el("div.entries", null, classCards),
      lockedCount ? el("p.locked-note", { text: `🔒 ${lockedCount} more class${lockedCount === 1 ? "" : "es"} still locked.` }) : null
    );

    // --- items (shop at current prosperity + explicitly-unlocked) ------------
    const sh = D.shop(state, GH);
    const shopRows = sh.available.map((it) =>
      el(
        "div.entry.item",
        null,
        el("span.it-num", { text: `#${it.number}` }),
        el("strong", { text: it.name_en }),
        el("span.muted", { text: `  ${it.slot} · ${it.cost != null ? it.cost + "g" : "reward"} · ${it.use}` }),
        el("div.muted", { text: it.effect })
      )
    );
    const extraUnlocked = state.items_unlocked
      .filter((n) => !sh.available.some((it) => it.number === n))
      .map((n) => GH.items.find((it) => it.number === n))
      .filter(Boolean)
      .map((it) =>
        el("div.entry.item", null, el("span.it-num", { text: `#${it.number}` }), el("strong", { text: it.name_en }), el("span.muted", { text: `  (unlocked) ${it.slot} · ${it.cost != null ? it.cost + "g" : "reward"}` }), el("div.muted", { text: it.effect }))
      );
    const hiddenItems = GH.items.length - sh.available.length - extraUnlocked.length;
    const items = section(
      `Items — ${sh.available.length} in shop at prosperity ${sh.prosperity}`,
      el("div.entries", null, shopRows),
      extraUnlocked.length ? el("h3", { text: "Other unlocked items" }) : null,
      extraUnlocked.length ? el("div.entries", null, extraUnlocked) : null,
      el("p.locked-note", {
        text:
          `🔒 ${hiddenItems} item${hiddenItems === 1 ? "" : "s"} not yet available` +
          (sh.nextLevelCount ? ` (+${sh.nextLevelCount} unlock at prosperity ${sh.nextLevel}).` : "."),
      })
    );

    // --- achievements (earned only) -----------------------------------------
    const byName = new Map(
      [...GH.globalAchievements, ...GH.partyAchievements].map((a) => [a.name, a])
    );
    const earned = [...state.global_achievements, ...state.party_achievements];
    const achRows = earned.map((name) => {
      const a = byName.get(name);
      return el(
        "div.entry",
        null,
        el("strong", { text: name }),
        a ? el("span.muted", { text: `  ${a.type}` }) : el("span.muted", { text: "  (not in knowledge base)" }),
        a && a.effect ? el("div.muted", { text: a.effect }) : null
      );
    });
    const hiddenAch = c.achievements.total - c.achievements.earned;
    const achievements = section(
      `Achievements — ${c.achievements.earned}/${c.achievements.total} earned`,
      earned.length ? el("div.entries", null, achRows) : el("p.muted", { text: "None recorded yet." }),
      el("p.locked-note", { text: `🔒 ${hiddenAch} achievement${hiddenAch === 1 ? "" : "s"} unearned (hidden).` })
    );

    root.append(classes, items, achievements);
  };
})();
