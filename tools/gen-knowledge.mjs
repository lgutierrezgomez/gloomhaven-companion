#!/usr/bin/env node
// Compiles the canonical data/*.json rule files into a single bundled
// knowledge.js that the page loads via a <script> tag (assigns window.GH).
// Run this whenever the data/*.json files change:  node tools/gen-knowledge.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "data");
const outFile = join(here, "..", "knowledge.js");

const read = (name) => JSON.parse(readFileSync(join(dataDir, name), "utf8"));

const scenarios = read("scenarios.json");
const classes = read("classes.json");
const items = read("items.json");
const achievements = read("achievements.json");
const personalQuests = read("personal-quests.json");

const GH = {
  generatedFrom: "data/*.json via tools/gen-knowledge.mjs",
  scenarios: scenarios.scenarios,
  scenariosMeta: scenarios._meta,
  classes: classes.classes,
  items: items.items,
  globalAchievements: achievements.global_achievements,
  partyAchievements: achievements.party_achievements,
  personalQuests: personalQuests.personal_quests,
};

const banner =
  "// GENERATED FILE — do not edit by hand.\n" +
  "// Source: data/*.json  |  Regenerate: node tools/gen-knowledge.mjs\n";
writeFileSync(outFile, banner + "window.GH = " + JSON.stringify(GH, null, 2) + ";\n");

console.log(
  `knowledge.js written: ${GH.scenarios.length} scenarios, ${GH.classes.length} classes, ` +
    `${GH.items.length} items, ${GH.globalAchievements.length}+${GH.partyAchievements.length} achievements, ` +
    `${GH.personalQuests.length} personal quests.`
);
