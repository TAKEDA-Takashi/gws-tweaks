import { beforeAll, describe, expect, it } from 'vitest';

let isMarkdownPasteLabel;

beforeAll(async () => {
  await import('../extension/src/lib/markdown-paste.js');
  ({ isMarkdownPasteLabel } = globalThis.GWSTweaks);
});

describe('isMarkdownPasteLabel', () => {
  it('日本語ラベル（ニーモニック付き）を判定する', () => {
    expect(isMarkdownPasteLabel('マークダウンから貼り付け(Q)')).toBe(true);
    expect(isMarkdownPasteLabel('  マークダウンから貼り付け  ')).toBe(true);
  });

  it('英語ラベルを判定する', () => {
    expect(isMarkdownPasteLabel('Paste from Markdown(Q)')).toBe(true);
    expect(isMarkdownPasteLabel('Paste from markdown')).toBe(true);
  });

  it('他のメニュー項目には一致しない', () => {
    expect(isMarkdownPasteLabel('貼り付け(P)⌘V')).toBe(false);
    expect(isMarkdownPasteLabel('書式なしで貼り付け(M)⌘+Shift+V')).toBe(false);
    expect(isMarkdownPasteLabel('Paste(P)⌘V')).toBe(false);
    expect(isMarkdownPasteLabel('マークダウンとしてコピー(V)')).toBe(false);
    expect(isMarkdownPasteLabel('')).toBe(false);
    expect(isMarkdownPasteLabel(null)).toBe(false);
  });
});
