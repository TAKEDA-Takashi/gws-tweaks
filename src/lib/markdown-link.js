// クリップボードのプレーンテキストがMarkdownリンク単体かどうかを判定するユーティリティ。
// content scriptとテストの両方から使うため、グローバル名前空間に公開する。
(function (root) {
  'use strict';

  // タイトルに [ ] は含められない（ネストしたブラケットは対象外）
  const MARKDOWN_LINK_RE = /^\[([^\[\]]+)\]\((https?:\/\/\S+)\)$/;

  function parseMarkdownLink(text) {
    const m = text.trim().match(MARKDOWN_LINK_RE);
    if (!m) {
      return null;
    }
    return { title: m[1], url: m[2] };
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildAnchorHtml(link) {
    return '<a href="' + escapeHtml(link.url) + '">' + escapeHtml(link.title) + '</a>';
  }

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    parseMarkdownLink,
    buildAnchorHtml,
  });
})(globalThis);
