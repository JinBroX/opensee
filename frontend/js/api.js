/**
 * Zen-Tap AI 问卦 API 客户端
 * 自动管理用户身份（localStorage uid）和使用量
 */

(function () {
  'use strict';

  const API_BASE = '';  // 后端API地址

  // ---------------------- 身份管理 ----------------------
  function getUid() {
    let uid = localStorage.getItem('opensee_uid');
    if (!uid) {
      uid = 'opensee_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('opensee_uid', uid);
    }
    return uid;
  }

  // ---------------------- API 封装 ----------------------

  /**
   * 获取公共配置（PayPal ID 等）
   */
  async function getConfig() {
    const resp = await fetch(`${API_BASE}/api/config`);
    return resp.json();
  }

  /**
   * 查询订阅状态
   * @returns {Promise<{tier, questionsUsed, remaining, monthlyLimit}>}
   */
  async function getSubscription() {
    const uid = getUid();
    const resp = await fetch(`${API_BASE}/api/subscription?uid=${encodeURIComponent(uid)}`);
    const data = await resp.json();
    return data;
  }

  /**
   * 确认订阅（PayPal 付款成功回调）
   */
  async function confirmSubscription() {
    const uid = getUid();
    const resp = await fetch(`${API_BASE}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });
    return resp.json();
  }

  /**
   * 发起 AI 问卦
   * @param {Object} opts
   * @param {string} opts.hexagramId - 当前卦象，如 'Q1'
   * @param {string} opts.question - 用户的问题
   * @param {number[]} [opts.yaos] - 爻数组 [7,9,8,6,7,8] 等
   * @param {string} [opts.mode] - 'iching'（易经，默认）或 'daliuren'（大六壬）
   * @returns {Promise<{answer, remaining, used, tier, mode, chart?}>}
   */
  async function askAi(opts = {}) {
    const uid = getUid();
    const { hexagramId, question, yaos, mode = 'iching' } = opts;

    const resp = await fetch(`${API_BASE}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, hexagramId, question, yaos, mode })
    });

    const data = await resp.json();

    if (!resp.ok) {
      const err = new Error(data.error || '请求失败');
      err.code = data.code;
      err.tier = data.tier;
      throw err;
    }

    return data;
  }





  // ---------------------- 全局暴露 ----------------------
  window.ZenTapAI = {
    getConfig,
    getSubscription,
    confirmSubscription,
    askAi,
    getUid
  };

  window.OpenSeeAI = window.ZenTapAI;

})();

