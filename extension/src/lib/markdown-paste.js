// Cmd+Vを「マークダウンから貼り付け」に差し替える機能で使う、
// 編集メニュー項目ラベルの判定ロジック。項目テキストには
// ニーモニック「(Q)」やショートカット表記が含まれることがある。
(function (root) {
  'use strict';

  function isMarkdownPasteLabel(text) {
    const t = (text || '').trim();
    return t.includes('マークダウンから貼り付け') || /paste from markdown/i.test(t);
  }

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    isMarkdownPasteLabel,
  });
})(globalThis);
