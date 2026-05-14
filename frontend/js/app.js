// frontend/js/app.js — 向后兼容 shim
// 加载 engine/runtime/engine.js 并保持 window.OpenSee / window.ZenTap 可用
// 页面引用此文件等同于直接引用 engine/runtime/engine.js

const script = document.createElement('script');
script.src = '/engine/runtime/engine.js';
document.head.appendChild(script);
