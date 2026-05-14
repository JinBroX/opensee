// ====================== OpenSee Decision Engine ======================
// 断卦决策层 —— 将 hexagram-decision-table.json 暴露为查询接口
// 对外: window.OpenSee.DecisionEngine (浏览器) 或 ESM export (Node)

(function () {
  'use strict';

  let TABLE = null;

  async function init() {
    const resp = await fetch('/engine/decision/hexagram-decision-table.json');
    TABLE = await resp.json();
    return TABLE;
  }

  function getDecision(hexId) {
    if (!TABLE) return null;
    return TABLE[hexId] || null;
  }

  function getState(hexId) { return getDecision(hexId)?.state || null; }
  function getDirection(hexId) { return getDecision(hexId)?.direction || null; }
  function getTiming(hexId) { return getDecision(hexId)?.timing || null; }
  function getRisk(hexId) { return getDecision(hexId)?.risk || null; }

  function getAll() { return TABLE; }

  function query(predicate) {
    if (!TABLE) return [];
    const results = [];
    for (const [hexId, dec] of Object.entries(TABLE)) {
      if (predicate(dec)) results.push({ hexId, ...dec });
    }
    return results;
  }

  const API = { init, getDecision, getState, getDirection, getTiming, getRisk, getAll, query };

  if (typeof window !== 'undefined') {
    window.OpenSee = window.OpenSee || {};
    window.OpenSee.DecisionEngine = API;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.OpenSeeDecisionEngine = API;
  }
})();
