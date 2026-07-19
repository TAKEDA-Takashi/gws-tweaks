// ドキュメント初期設定（フォント・行間・ページ分けなし）をDocs APIの
// batchUpdateリクエストに組み立てるユーティリティと、設定値の読み書き。
(function (root) {
  'use strict';

  // 空文字・nullは「変更しない」を意味する
  const DOC_SETUP_DEFAULTS = {
    fontFamily: '',
    fontSize: null,
    lineSpacing: null,
    pageless: true,
  };

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

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    DOC_SETUP_DEFAULTS,
    loadDocSetupSettings,
    saveDocSetupSettings,
    bodyEndIndex,
    buildDocSetupRequests,
  });
})(globalThis);
