import { beforeAll, describe, expect, it } from 'vitest';

let parseMarkdownLink;
let buildAnchorHtml;

beforeAll(async () => {
  await import('../src/lib/markdown-link.js');
  ({ parseMarkdownLink, buildAnchorHtml } = globalThis.GDocsTweaks);
});

describe('parseMarkdownLink', () => {
  it('基本的なMarkdownリンクを解析する', () => {
    expect(parseMarkdownLink('[タイトル](https://example.com/page)')).toEqual({
      title: 'タイトル',
      url: 'https://example.com/page',
    });
  });

  it('98文字以上の長いタイトルも解析する', () => {
    const title = 'あ'.repeat(120);
    expect(parseMarkdownLink(`[${title}](https://example.com/long)`)).toEqual({
      title,
      url: 'https://example.com/long',
    });
  });

  it('前後の空白・改行をトリムして解析する', () => {
    expect(parseMarkdownLink('  [t](https://example.com)\n')).toEqual({
      title: 't',
      url: 'https://example.com',
    });
  });

  it('URLに丸括弧を含むリンクを解析する', () => {
    expect(
      parseMarkdownLink('[曖昧さ回避](https://en.wikipedia.org/wiki/A_(disambiguation))')
    ).toEqual({
      title: '曖昧さ回避',
      url: 'https://en.wikipedia.org/wiki/A_(disambiguation)',
    });
  });

  it('httpのURLも受け付ける', () => {
    expect(parseMarkdownLink('[t](http://example.com)')).toEqual({
      title: 't',
      url: 'http://example.com',
    });
  });

  it('Markdownリンクでないテキストはnullを返す', () => {
    expect(parseMarkdownLink('ただのテキスト')).toBeNull();
    expect(parseMarkdownLink('https://example.com')).toBeNull();
  });

  it('リンク以外のテキストを含む場合はnullを返す', () => {
    expect(parseMarkdownLink('前置き [t](https://example.com)')).toBeNull();
    expect(parseMarkdownLink('[t](https://example.com) 後書き')).toBeNull();
  });

  it('URLがhttp/httpsでない場合はnullを返す', () => {
    expect(parseMarkdownLink('[t](ftp://example.com)')).toBeNull();
    expect(parseMarkdownLink('[t](example.com)')).toBeNull();
  });

  it('タイトルが空の場合はnullを返す', () => {
    expect(parseMarkdownLink('[](https://example.com)')).toBeNull();
  });
});

describe('buildAnchorHtml', () => {
  it('アンカータグのHTMLを生成する', () => {
    expect(buildAnchorHtml({ title: 'タイトル', url: 'https://example.com' })).toBe(
      '<a href="https://example.com">タイトル</a>'
    );
  });

  it('HTML特殊文字をエスケープする', () => {
    expect(
      buildAnchorHtml({ title: '<b>a & b</b> "q"', url: 'https://example.com/?a=1&b=2' })
    ).toBe('<a href="https://example.com/?a=1&amp;b=2">&lt;b&gt;a &amp; b&lt;/b&gt; &quot;q&quot;</a>');
  });
});
