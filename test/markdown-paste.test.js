import { beforeAll, describe, expect, it } from 'vitest';

let isMarkdownPasteLabel;
let isLikelyMarkdown;

beforeAll(async () => {
  await import('../extension/src/lib/markdown-paste.js');
  ({ isMarkdownPasteLabel, isLikelyMarkdown } = globalThis.GWSTweaks);
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

describe('isLikelyMarkdown', () => {
  describe('マークダウンと判定するもの', () => {
    it('見出し', () => {
      expect(isLikelyMarkdown('# 見出し')).toBe(true);
      expect(isLikelyMarkdown('## セクション\n本文です。')).toBe(true);
    });

    it('コードフェンス', () => {
      expect(isLikelyMarkdown('```js\nconsole.log(1);\n```')).toBe(true);
    });

    it('リンク記法', () => {
      expect(isLikelyMarkdown('詳細は[こちら](https://example.com)を参照。')).toBe(true);
    });

    it('太字', () => {
      expect(isLikelyMarkdown('これは**重要**です。')).toBe(true);
    });

    it('テーブル', () => {
      expect(isLikelyMarkdown('| 名前 | 値 |\n|------|----|\n| a | 1 |')).toBe(true);
    });

    it('複数行の箇条書き', () => {
      expect(isLikelyMarkdown('- 項目1\n- 項目2')).toBe(true);
      expect(isLikelyMarkdown('* 項目1\n* 項目2\n* 項目3')).toBe(true);
    });

    it('複数行の番号付きリスト', () => {
      expect(isLikelyMarkdown('1. 手順その1\n2. 手順その2')).toBe(true);
    });

    it('弱いシグナルの組み合わせ（引用+インラインコード）', () => {
      expect(isLikelyMarkdown('> 引用です\n`code`を実行します。')).toBe(true);
    });

    it('CRLF改行でも判定できる', () => {
      expect(isLikelyMarkdown('# 見出し\r\n\r\n- 項目1\r\n- 項目2')).toBe(true);
      expect(isLikelyMarkdown('- 項目1\r\n- 項目2')).toBe(true);
    });

    it('典型的なマークダウン文書', () => {
      expect(
        isLikelyMarkdown('# タイトル\n\n- リスト項目1\n- **太字**の項目2\n\n[リンク](https://example.com)')
      ).toBe(true);
    });
  });

  describe('プレーンテキストと判定するもの', () => {
    it('普通の文章', () => {
      expect(isLikelyMarkdown('これは普通の文章です。\nマークダウンではありません。')).toBe(false);
    });

    it('空・null・undefined', () => {
      expect(isLikelyMarkdown('')).toBe(false);
      expect(isLikelyMarkdown('   \n  ')).toBe(false);
      expect(isLikelyMarkdown(null)).toBe(false);
      expect(isLikelyMarkdown(undefined)).toBe(false);
    });

    it('番号始まりの1行だけでは判定しない', () => {
      expect(isLikelyMarkdown('1. 会議室の予約')).toBe(false);
    });

    it('ダッシュ始まりの1行だけでは判定しない', () => {
      expect(isLikelyMarkdown('- 牛乳を買う')).toBe(false);
    });

    it('引用符付きメール返信だけでは判定しない', () => {
      expect(isLikelyMarkdown('> お世話になっております。')).toBe(false);
    });

    it('スペースなしの#はハッシュタグとして扱う', () => {
      expect(isLikelyMarkdown('#告知 イベントを開催します')).toBe(false);
    });

    it('インラインコード1つだけの文', () => {
      expect(isLikelyMarkdown('`npm run check` を実行してください。')).toBe(false);
    });

    it('裸のURL', () => {
      expect(isLikelyMarkdown('https://example.com を参照してください。')).toBe(false);
    });
  });
});
