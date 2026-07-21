import { beforeAll, describe, expect, it } from 'vitest';

let buildDocSetupRequests;
let buildIndentRequests;
let bodyEndIndex;

beforeAll(async () => {
  await import('../src/lib/doc-setup.js');
  ({ buildDocSetupRequests, buildIndentRequests, bodyEndIndex } = globalThis.GWSTweaks);
});

describe('bodyEndIndex', () => {
  it('body.contentの最後の要素のendIndexを返す', () => {
    const doc = {
      body: {
        content: [{ endIndex: 1 }, { endIndex: 25 }, { endIndex: 100 }],
      },
    };
    expect(bodyEndIndex(doc)).toBe(100);
  });

  it('空ドキュメント（改行1つ）ではその段落のendIndexを返す', () => {
    const doc = { body: { content: [{ endIndex: 1 }, { endIndex: 2 }] } };
    expect(bodyEndIndex(doc)).toBe(2);
  });

  it('bodyやcontentがない場合はnullを返す', () => {
    expect(bodyEndIndex({})).toBeNull();
    expect(bodyEndIndex({ body: {} })).toBeNull();
    expect(bodyEndIndex({ body: { content: [] } })).toBeNull();
  });
});

describe('buildDocSetupRequests', () => {
  const allSettings = {
    fontFamily: 'BIZ UDPGothic',
    fontSize: 11,
    lineSpacing: 1.15,
    pageless: true,
  };

  it('すべての設定からページ分けなし・テキスト・段落の3リクエストを作る', () => {
    const requests = buildDocSetupRequests(allSettings, 100);
    expect(requests).toEqual([
      {
        updateDocumentStyle: {
          documentStyle: { documentFormat: { documentMode: 'PAGELESS' } },
          fields: 'documentFormat',
        },
      },
      {
        updateTextStyle: {
          range: { startIndex: 1, endIndex: 100 },
          textStyle: {
            weightedFontFamily: { fontFamily: 'BIZ UDPGothic' },
            fontSize: { magnitude: 11, unit: 'PT' },
          },
          fields: 'weightedFontFamily,fontSize',
        },
      },
      {
        updateParagraphStyle: {
          range: { startIndex: 1, endIndex: 100 },
          paragraphStyle: { lineSpacing: 115 },
          fields: 'lineSpacing',
        },
      },
    ]);
  });

  it('行間は浮動小数点誤差なく100倍に丸める', () => {
    const requests = buildDocSetupRequests({ ...allSettings, lineSpacing: 1.15 }, 10);
    const paragraph = requests.find((r) => r.updateParagraphStyle);
    // 1.15 * 100 === 114.99999999999999 になるため丸めが必要
    expect(paragraph.updateParagraphStyle.paragraphStyle.lineSpacing).toBe(115);
  });

  it('未設定（空文字・null）の項目はリクエストに含めない', () => {
    expect(
      buildDocSetupRequests({ fontFamily: '', fontSize: null, lineSpacing: null, pageless: false }, 100)
    ).toEqual([]);
  });

  it('フォント名だけ設定した場合はweightedFontFamilyのみ更新する', () => {
    const requests = buildDocSetupRequests(
      { fontFamily: 'Arial', fontSize: null, lineSpacing: null, pageless: false },
      100
    );
    expect(requests).toEqual([
      {
        updateTextStyle: {
          range: { startIndex: 1, endIndex: 100 },
          textStyle: { weightedFontFamily: { fontFamily: 'Arial' } },
          fields: 'weightedFontFamily',
        },
      },
    ]);
  });

  it('フォントサイズだけ設定した場合はfontSizeのみ更新する', () => {
    const requests = buildDocSetupRequests(
      { fontFamily: '', fontSize: 12, lineSpacing: null, pageless: false },
      100
    );
    expect(requests).toEqual([
      {
        updateTextStyle: {
          range: { startIndex: 1, endIndex: 100 },
          textStyle: { fontSize: { magnitude: 12, unit: 'PT' } },
          fields: 'fontSize',
        },
      },
    ]);
  });

  it('endIndexが取れない場合は範囲指定のリクエストを作らない（ページ分けなしのみ）', () => {
    expect(buildDocSetupRequests(allSettings, null)).toEqual([
      {
        updateDocumentStyle: {
          documentStyle: { documentFormat: { documentMode: 'PAGELESS' } },
          fields: 'documentFormat',
        },
      },
    ]);
  });

  it('endIndexが1以下の場合も範囲指定のリクエストを作らない', () => {
    const requests = buildDocSetupRequests(allSettings, 1);
    expect(requests).toHaveLength(1);
    expect(requests[0].updateDocumentStyle).toBeDefined();
  });
});

describe('buildIndentRequests', () => {
  it('箇条書き段落をネストレベルに応じたインデントにする', () => {
    const content = [
      { startIndex: 1, endIndex: 10, paragraph: { bullet: { listId: 'kix.a' } } },
      { startIndex: 10, endIndex: 20, paragraph: { bullet: { listId: 'kix.a', nestingLevel: 1 } } },
    ];
    expect(buildIndentRequests(content, 18)).toEqual([
      {
        updateParagraphStyle: {
          range: { startIndex: 1, endIndex: 10 },
          paragraphStyle: {
            indentStart: { magnitude: 18, unit: 'PT' },
            indentFirstLine: { magnitude: 0, unit: 'PT' },
          },
          fields: 'indentStart,indentFirstLine',
        },
      },
      {
        updateParagraphStyle: {
          range: { startIndex: 10, endIndex: 20 },
          paragraphStyle: {
            indentStart: { magnitude: 36, unit: 'PT' },
            indentFirstLine: { magnitude: 18, unit: 'PT' },
          },
          fields: 'indentStart,indentFirstLine',
        },
      },
    ]);
  });

  it('36ptを指定するとDocsの既定と同じ配置になる（記号と本文の間隔は18pt）', () => {
    const content = [{ startIndex: 1, endIndex: 10, paragraph: { bullet: { listId: 'kix.a' } } }];
    const [request] = buildIndentRequests(content, 36);
    expect(request.updateParagraphStyle.paragraphStyle).toEqual({
      indentStart: { magnitude: 36, unit: 'PT' },
      indentFirstLine: { magnitude: 18, unit: 'PT' },
    });
  });

  it('インデント済みの通常段落は36pt基準の比例配分で変更する', () => {
    const content = [
      {
        startIndex: 1,
        endIndex: 10,
        paragraph: { paragraphStyle: { indentStart: { magnitude: 72, unit: 'PT' } } },
      },
    ];
    expect(buildIndentRequests(content, 18)).toEqual([
      {
        updateParagraphStyle: {
          range: { startIndex: 1, endIndex: 10 },
          paragraphStyle: { indentStart: { magnitude: 36, unit: 'PT' } },
          fields: 'indentStart',
        },
      },
    ]);
  });

  it('インデントのない通常段落・段落以外の要素は対象外', () => {
    const content = [
      { startIndex: 1, endIndex: 10, paragraph: {} },
      { startIndex: 10, endIndex: 20, paragraph: { paragraphStyle: {} } },
      { startIndex: 20, endIndex: 21, sectionBreak: {} },
    ];
    expect(buildIndentRequests(content, 18)).toEqual([]);
  });

  it('連続する同じインデントの段落は1つのリクエストにまとめる', () => {
    const content = [
      { startIndex: 1, endIndex: 10, paragraph: { bullet: { listId: 'kix.a' } } },
      { startIndex: 10, endIndex: 20, paragraph: { bullet: { listId: 'kix.a' } } },
      { startIndex: 20, endIndex: 30, paragraph: { bullet: { listId: 'kix.a', nestingLevel: 1 } } },
    ];
    const requests = buildIndentRequests(content, 18);
    expect(requests).toHaveLength(2);
    expect(requests[0].updateParagraphStyle.range).toEqual({ startIndex: 1, endIndex: 20 });
    expect(requests[1].updateParagraphStyle.range).toEqual({ startIndex: 20, endIndex: 30 });
  });

  it('幅の指定を18pt未満にした場合は記号と本文の間隔も幅に合わせる', () => {
    const content = [
      { startIndex: 1, endIndex: 10, paragraph: { bullet: { listId: 'kix.a', nestingLevel: 1 } } },
    ];
    const [request] = buildIndentRequests(content, 10);
    expect(request.updateParagraphStyle.paragraphStyle).toEqual({
      indentStart: { magnitude: 20, unit: 'PT' },
      indentFirstLine: { magnitude: 10, unit: 'PT' },
    });
  });

  it('幅が未設定・contentがない場合は空配列を返す', () => {
    const content = [{ startIndex: 1, endIndex: 10, paragraph: { bullet: { listId: 'kix.a' } } }];
    expect(buildIndentRequests(content, null)).toEqual([]);
    expect(buildIndentRequests(null, 18)).toEqual([]);
  });
});
