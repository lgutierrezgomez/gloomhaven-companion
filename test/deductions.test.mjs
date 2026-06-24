import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Deductions from "../deductions.js";

const here = dirname(fileURLToPath(import.meta.url));
const data = (n) => JSON.parse(readFileSync(join(here, "..", "data", n), "utf8"));

const GH = {
  scenarios: data("scenarios.json").scenarios,
  classes: data("classes.json").classes,
  items: data("items.json").items,
  globalAchievements: data("achievements.json").global_achievements,
  partyAchievements: data("achievements.json").party_achievements,
  personalQuests: data("personal-quests.json").personal_quests,
};

// The known current campaign state (mirror of the app seed).
function state() {
  return {
    prosperity: 1,
    reputation: 0,
    scenarios_unlocked: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 16, 18, 19, 20, 22, 23, 24, 25, 26, 28,
      30, 31, 34, 35, 36, 37, 38, 39, 42, 43, 44, 48, 51, 64, 65, 68, 72, 76,
      81, 82, 83, 84, 90, 93,
    ],
    scenarios_completed: [
      1, 2, 3, 4, 8, 13, 14, 16, 18, 20, 22, 24, 25, 26, 30, 31, 34, 38, 42, 43,
      48, 64, 68, 84, 93,
    ],
    classes_unlocked: [],
    global_achievements: [],
    party_achievements: [],
    items_unlocked: [],
  };
}

test("knowledge base has the expected base-game sizes", () => {
  assert.equal(GH.scenarios.length, 95);
  assert.equal(GH.classes.length, 17);
  assert.equal(GH.items.length, 95);
});

test("counters reflect the known campaign", () => {
  const c = Deductions.counters(state(), GH);
  assert.equal(c.scenarios.done, 25);
  assert.equal(c.scenarios.total, 95);
  assert.equal(c.classes.total, 17);
  assert.equal(c.classes.unlocked, 6); // 6 starters, none extra unlocked
  assert.equal(c.achievements.earned, 0);
  assert.equal(
    c.achievements.total,
    GH.globalAchievements.length + GH.partyAchievements.length
  );
});

test("scenario 51 is unlocked but play-gated, so not in available plays", () => {
  const s = state();
  const avail = Deductions.availablePlays(s);
  assert.ok(!avail.includes(51), "51 must not be available");
  assert.ok(!avail.includes(1), "completed scenarios excluded");
  assert.ok(avail.includes(5), "5 should be available");
  assert.equal(avail.length, 19);

  const gated = Deductions.gatedScenarios(s);
  const g51 = gated.find((g) => g.number === 51);
  assert.ok(g51, "51 must be reported as gated");
  assert.match(g51.reason, /End of Corruption/);
});

test("completing 46,47,48 ungates scenario 51", () => {
  const s = state();
  s.scenarios_completed.push(46, 47); // 48 already complete
  assert.ok(Deductions.availablePlays(s).includes(51));
  assert.equal(Deductions.gatedScenarios(s).length, 0);
});

test("shop = 14 starting items at prosperity 1, +7 at prosperity 2", () => {
  const sh = Deductions.shop(state(), GH);
  assert.equal(sh.available.length, 14);
  assert.equal(sh.nextLevel, 2);
  assert.equal(sh.nextLevelCount, 7);
  assert.ok(sh.available.every((it) => it.number <= 14));
});

test("exclusivity + blocking warnings fire", () => {
  const w = Deductions.exclusivityWarnings(state());
  assert.ok(w.some((x) => /scenario 9 is now locked out/.test(x)), "8 vs 9");
  assert.ok(w.some((x) => /scenario 41 is now locked out/.test(x)), "41 vs 42");
  // the contradictory 3-vs-8 pair must NOT produce a warning
  assert.ok(!w.some((x) => /Both 3 and 8/.test(x)), "3 vs 8 is not treated as exclusive");
});

test("doors are locked targets reachable from the frontier (numbers only)", () => {
  const d = Deductions.doors(state(), GH);
  // scenario 5 (unlocked) unlocks 10/14/19; 10 is not unlocked -> a door.
  assert.ok(d.includes(10));
  // every door must be a real scenario number not already unlocked
  const unlocked = new Set(state().scenarios_unlocked);
  assert.ok(d.every((n) => !unlocked.has(n)));
});
