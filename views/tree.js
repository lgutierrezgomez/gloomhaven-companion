// Campaign tree. Walks `unlocks` edges from the start, showing only unlocked
// scenarios by name; not-yet-unlocked targets appear as numbered locked doors.
(function () {
  "use strict";
  const { el, section } = window.UI;

  window.Views = window.Views || {};
  window.Views.tree = function (root, App) {
    const GH = App.GH,
      D = App.D,
      state = App.state;
    const byNum = new Map(GH.scenarios.map((s) => [s.number, s]));
    const unlocked = new Set(state.scenarios_unlocked);
    const completed = new Set(state.scenarios_completed);

    function status(num) {
      if (completed.has(num)) return { mark: "✅", cls: "done" };
      if (D.isPlayGated(num, state)) return { mark: "⏳", cls: "gated" };
      if (unlocked.has(num)) return { mark: "🔓", cls: "open" };
      return { mark: "🔒", cls: "locked" };
    }

    const shown = new Set();

    function nodeLabel(num) {
      const sc = byNum.get(num);
      const st = status(num);
      if (st.cls === "locked") {
        // Door: number only, never the name.
        return el("span.node.locked", null, `🔒 #${num} — locked`);
      }
      const gate = st.cls === "gated" ? `  ·  ⏳ ${D.PLAY_GATES[num].label}` : "";
      return el(
        "span.node." + st.cls,
        null,
        `${st.mark} ${num}. ${sc ? sc.name_en : "?"}${gate}`
      );
    }

    function buildList(num) {
      const li = el("li", null, nodeLabel(num));
      const sc = byNum.get(num);
      const st = status(num);
      if (st.cls === "locked") return li; // doors have no children
      if (shown.has(num)) {
        li.append(el("span.ref", null, " ↑ (shown above)"));
        return li;
      }
      shown.add(num);
      const kids = (sc && sc.unlocks) || [];
      if (kids.length) {
        const ul = el("ul");
        for (const k of kids) ul.append(buildList(k));
        li.append(ul);
      }
      return li;
    }

    // Roots = scenarios unlocked by "start".
    const roots = GH.scenarios
      .filter((s) => (s.unlocked_by || []).includes("start"))
      .map((s) => s.number);

    const treeUl = el("ul.tree");
    for (const r of roots) treeUl.append(buildList(r));

    // Side / event-triggered scenarios that are unlocked but never reached by
    // the main walk (PQ/event rewards). Show them as a flat unlocked list.
    const side = [...unlocked].filter((n) => !shown.has(n)).sort((a, b) => a - b);
    const sideEl = side.length
      ? section(
          "Side & event-unlocked scenarios",
          el(
            "ul.flat",
            null,
            side.map((n) => el("li", null, nodeLabel(n)))
          )
        )
      : null;

    const legend = el(
      "p.legend",
      null,
      "✅ completed   🔓 available   ⏳ unlocked, criteria not met   🔒 locked (door — number only)"
    );

    root.append(
      section("Campaign tree", legend, treeUl),
      sideEl
    );
  };
})();
