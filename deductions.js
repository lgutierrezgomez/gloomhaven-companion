// Pure deductions over a campaign-state object + the GH knowledge base.
// Loaded in the browser as a classic script (-> window.Deductions) and required
// by the Node test suite. No DOM, no I/O here — only logic.
(function (global) {
  "use strict";

  // --- static rule tables not (yet) encoded in the data files ---------------
  // Play-gates: a scenario can be UNLOCKED yet not legally playable until a
  // condition is met. Keyed by scenario number.
  const PLAY_GATES = {
    51: {
      label: "End of Corruption x3 (complete 46, 47 and 48)",
      ok: (state) =>
        [46, 47, 48].filter((n) => state.scenarios_completed.includes(n)).length >= 3,
    },
  };

  // Mutually-exclusive story choices and blocking relationships, from
  // scenarios.json _meta caveats.
  // NOTE: scenarios.json _meta lists "3 vs 8" as exclusive, but the unlock graph
  // has 3 -> 8 (scenario 3 unlocks 8), which contradicts exclusivity. Treated as
  // a data-caveat slip and omitted to avoid false warnings on valid campaigns.
  const EXCLUSIVE_PAIRS = [
    [8, 9],
    [11, 12],
    [41, 42],
  ];
  const BLOCKS = [{ ifCompleted: 27, blocks: [10, 21, 35, 36] }];

  const uniq = (arr) => [...new Set(arr)];

  function isPlayGated(num, state) {
    const gate = PLAY_GATES[num];
    return gate ? !gate.ok(state) : false;
  }

  // Scenarios unlocked, not yet completed, and not blocked by a play-gate.
  function availablePlays(state) {
    return uniq(state.scenarios_unlocked)
      .filter(
        (n) => !state.scenarios_completed.includes(n) && !isPlayGated(n, state)
      )
      .sort((a, b) => a - b);
  }

  // Unlocked but not playable yet — with the reason.
  function gatedScenarios(state) {
    return uniq(state.scenarios_unlocked)
      .filter(
        (n) => !state.scenarios_completed.includes(n) && isPlayGated(n, state)
      )
      .map((n) => ({ number: n, reason: PLAY_GATES[n].label }))
      .sort((a, b) => a.number - b.number);
  }

  // Progress counters. Starter classes count as always-unlocked.
  function counters(state, GH) {
    const classesUnlocked = GH.classes.filter(
      (c) => c.starter || state.classes_unlocked.includes(c.box_symbol)
    ).length;
    const achievementsTotal =
      GH.globalAchievements.length + GH.partyAchievements.length;
    const achievementsEarned =
      uniq(state.global_achievements).length + uniq(state.party_achievements).length;
    return {
      scenarios: { done: uniq(state.scenarios_completed).length, total: GH.scenarios.length },
      classes: { unlocked: classesUnlocked, total: GH.classes.length },
      achievements: { earned: achievementsEarned, total: achievementsTotal },
    };
  }

  // Item shop available at the current prosperity level (random-pool items excluded).
  function shop(state, GH) {
    const prosperity = state.prosperity || 1;
    const levelOf = (src) => {
      if (src === "Starting") return 1;
      const m = /^Prosperity (\d+)$/.exec(src || "");
      return m ? Number(m[1]) : Infinity; // Infinity = random pool / not shop
    };
    const available = GH.items
      .filter((it) => levelOf(it.source) <= prosperity)
      .sort((a, b) => a.number - b.number);
    const nextLevel = prosperity + 1;
    const nextLevelCount = GH.items.filter(
      (it) => levelOf(it.source) === nextLevel
    ).length;
    return { prosperity, available, nextLevel, nextLevelCount };
  }

  // Informational warnings about exclusive / blocking story choices.
  function exclusivityWarnings(state) {
    const done = (n) => state.scenarios_completed.includes(n);
    const warnings = [];
    for (const [a, b] of EXCLUSIVE_PAIRS) {
      if (done(a) && done(b))
        warnings.push(`Both ${a} and ${b} marked completed — these are mutually exclusive.`);
      else if (done(a)) warnings.push(`Completed ${a}: scenario ${b} is now locked out.`);
      else if (done(b)) warnings.push(`Completed ${b}: scenario ${a} is now locked out.`);
    }
    for (const rule of BLOCKS) {
      if (done(rule.ifCompleted)) {
        const stillOpen = rule.blocks.filter((n) => !done(n));
        if (stillOpen.length)
          warnings.push(
            `Completed ${rule.ifCompleted}: blocks ${rule.blocks.join("/")}` +
              ` (still uncompleted: ${stillOpen.join(", ")}).`
          );
      }
    }
    return warnings;
  }

  // Locked "doors": scenarios that an unlocked scenario points to via `unlocks`
  // but which are not themselves unlocked yet. Numbers only — never names.
  function doors(state, GH) {
    const unlockedSet = new Set(state.scenarios_unlocked);
    const byNumber = new Map(GH.scenarios.map((s) => [s.number, s]));
    const result = new Set();
    for (const n of state.scenarios_unlocked) {
      const sc = byNumber.get(n);
      if (!sc) continue;
      for (const target of sc.unlocks || []) {
        if (!unlockedSet.has(target)) result.add(target);
      }
    }
    return [...result].sort((a, b) => a - b);
  }

  const Deductions = {
    PLAY_GATES,
    EXCLUSIVE_PAIRS,
    BLOCKS,
    isPlayGated,
    availablePlays,
    gatedScenarios,
    counters,
    shop,
    exclusivityWarnings,
    doors,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Deductions;
  else global.Deductions = Deductions;
})(typeof window !== "undefined" ? window : globalThis);
