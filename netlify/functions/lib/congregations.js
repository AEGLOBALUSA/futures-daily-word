/**
 * The three congregations that each get their own Sermon Notes (Ashley,
 * 2 Sep 2026): Futures USA, Futures Australia, Futuros USA. One published
 * "current" message per congregation; the staff form and the pastor Preach
 * card pick which one a message is for, the Home banner picks which one a
 * person reads. Mirrored on the client in src/data/congregations.ts — keep
 * both lists identical.
 */
const CONGREGATIONS = [
  { id: "futures-us", name: "Futures USA", suffix: "" },
  { id: "futures-au", name: "Futures Australia", suffix: "au" },
  { id: "futuros-us", name: "Futuros USA", suffix: "futuros" }
];
const DEFAULT_CONGREGATION = "futures-us";
const IDS = new Set(CONGREGATIONS.map((c) => c.id));

function isCongregationId(v) {
  return typeof v === "string" && IDS.has(v);
}

/** A valid id, or the default (Futures USA) for anything else. */
function normalizeCongregation(v) {
  return isCongregationId(v) ? v : DEFAULT_CONGREGATION;
}

function congregationName(id) {
  const c = CONGREGATIONS.find((x) => x.id === id);
  return c ? c.name : "";
}

/**
 * Sermon ids are slug-date. The same message can go to two congregations, and
 * published_sermons.id is the primary key, so every congregation but the
 * default carries a suffix ("...-au", "...-futuros"). Idempotent.
 */
function congregationSermonId(id, congregation) {
  const c = CONGREGATIONS.find((x) => x.id === normalizeCongregation(congregation));
  const base = String(id || "");
  if (!c || !c.suffix || !base) return base;
  return base.endsWith("-" + c.suffix) ? base : base + "-" + c.suffix;
}

module.exports = { CONGREGATIONS, DEFAULT_CONGREGATION, isCongregationId, normalizeCongregation, congregationName, congregationSermonId };
