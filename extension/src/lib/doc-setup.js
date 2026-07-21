// ドキュメント初期設定（フォント・行間・ページ分けなし）をDocs APIの
// batchUpdateリクエストに組み立てるユーティリティと、設定値の読み書き。
(function (root) {
  'use strict';

  // 空文字・nullは「変更しない」を意味する
  const DOC_SETUP_DEFAULTS = {
    fontFamily: '',
    fontSize: null,
    lineSpacing: null,
    indentUnit: null,
    pageless: true,
  };

  // Docsの既定は1レベルあたり36pt、箇条書き記号と本文の間隔は18pt
  const DEFAULT_INDENT_UNIT_PT = 36;
  const BULLET_TEXT_GAP_PT = 18;

  async function loadDocSetupSettings() {
    const stored = await chrome.storage.sync.get({ docSetup: {} });
    return Object.assign({}, DOC_SETUP_DEFAULTS, stored.docSetup);
  }

  async function saveDocSetupSettings(settings) {
    await chrome.storage.sync.set({ docSetup: settings });
  }

  // documents.get のレスポンスから本文終端のインデックスを取り出す
  function bodyEndIndex(doc) {
    const content = doc && doc.body && doc.body.content;
    if (!content || content.length === 0) {
      return null;
    }
    const endIndex = content[content.length - 1].endIndex;
    return typeof endIndex === 'number' ? endIndex : null;
  }

  function buildDocSetupRequests(settings, endIndex) {
    const requests = [];

    if (settings.pageless) {
      requests.push({
        updateDocumentStyle: {
          documentStyle: { documentFormat: { documentMode: 'PAGELESS' } },
          fields: 'documentFormat',
        },
      });
    }

    // 本文全体（空ドキュメントでは末尾の改行だけの段落）を対象にする
    const range = typeof endIndex === 'number' && endIndex > 1 ? { startIndex: 1, endIndex } : null;

    if (range && (settings.fontFamily || settings.fontSize)) {
      const textStyle = {};
      const fields = [];
      if (settings.fontFamily) {
        textStyle.weightedFontFamily = { fontFamily: settings.fontFamily };
        fields.push('weightedFontFamily');
      }
      if (settings.fontSize) {
        textStyle.fontSize = { magnitude: settings.fontSize, unit: 'PT' };
        fields.push('fontSize');
      }
      requests.push({ updateTextStyle: { range, textStyle, fields: fields.join(',') } });
    }

    if (range && settings.lineSpacing) {
      requests.push({
        updateParagraphStyle: {
          range,
          // APIは100 = 1行のパーセント指定。1.15 * 100の浮動小数点誤差を丸める
          paragraphStyle: { lineSpacing: Math.round(settings.lineSpacing * 100) },
          fields: 'lineSpacing',
        },
      });
    }

    return requests;
  }

  function roundPt(value) {
    return Math.round(value * 100) / 100;
  }

  // 本文の箇条書き・インデント済み段落を「1レベルあたりunitPt」のインデントに揃える
  // リクエストを組み立てる。リスト自体のインデント定義（lists.nestingLevels）はAPIで
  // 変更できないため、段落スタイルの上書きで実現する（既存の段落のみが対象）。
  function buildIndentRequests(content, unitPt) {
    if (!unitPt || !Array.isArray(content)) {
      return [];
    }
    const gap = Math.min(BULLET_TEXT_GAP_PT, unitPt);
    const requests = [];
    let last = null;

    for (const element of content) {
      const paragraph = element && element.paragraph;
      if (
        !paragraph ||
        typeof element.startIndex !== 'number' ||
        typeof element.endIndex !== 'number'
      ) {
        last = null;
        continue;
      }

      let paragraphStyle = null;
      let fields = '';
      if (paragraph.bullet) {
        const level = paragraph.bullet.nestingLevel || 0;
        const indentStart = roundPt(unitPt * (level + 1));
        paragraphStyle = {
          indentStart: { magnitude: indentStart, unit: 'PT' },
          indentFirstLine: { magnitude: roundPt(indentStart - gap), unit: 'PT' },
        };
        fields = 'indentStart,indentFirstLine';
      } else {
        const style = paragraph.paragraphStyle;
        const current = style && style.indentStart && style.indentStart.magnitude;
        if (current > 0) {
          paragraphStyle = {
            indentStart: {
              magnitude: roundPt((current * unitPt) / DEFAULT_INDENT_UNIT_PT),
              unit: 'PT',
            },
          };
          fields = 'indentStart';
        }
      }
      if (!paragraphStyle) {
        last = null;
        continue;
      }

      // 連続する同じインデントの段落は1つの範囲にまとめてリクエスト数を減らす
      const key = fields + JSON.stringify(paragraphStyle);
      if (last && last.key === key && last.range.endIndex === element.startIndex) {
        last.range.endIndex = element.endIndex;
        continue;
      }
      const range = { startIndex: element.startIndex, endIndex: element.endIndex };
      requests.push({ updateParagraphStyle: { range, paragraphStyle, fields } });
      last = { key, range };
    }

    return requests;
  }

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    DOC_SETUP_DEFAULTS,
    loadDocSetupSettings,
    saveDocSetupSettings,
    bodyEndIndex,
    buildDocSetupRequests,
    buildIndentRequests,
  });
})(globalThis);
