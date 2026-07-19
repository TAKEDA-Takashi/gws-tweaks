import { beforeAll, describe, expect, it } from 'vitest';

let buildDocSetupRequests;
let bodyEndIndex;

beforeAll(async () => {
  await import('../src/lib/doc-setup.js');
  ({ buildDocSetupRequests, bodyEndIndex } = globalThis.GWSTweaks);
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
