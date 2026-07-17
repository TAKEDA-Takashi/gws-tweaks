// Google ドキュメントのトップフレームで動作するcontent script。
// 入力イベントを受け取る docs-texteventtarget-iframe を見つけて各機能を配線する。
(function () {
  'use strict';

  const { parseMarkdownLink, buildAnchorHtml, loadFeatureSettings } = globalThis.GWSTweaks;

  const enabled = {};

  loadFeatureSettings().then((settings) => Object.assign(enabled, settings));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.features) {
      loadFeatureSettings().then((settings) => Object.assign(enabled, settings));
    }
  });

  // Docsが処理する前に貼り付けを傍受し、Markdownリンク単体ならHTMLアンカーの
  // 合成pasteイベントに差し替える。HTML貼り付け経路はタイトル長制限を受けない。
  function handlePaste(event) {
    if (!enabled.markdownLinkPaste) {
      return;
    }
    if (event.__gwsTweaksSynthetic) {
      return;
    }
    const link = parseMarkdownLink(event.clipboardData.getData('text/plain'));
    if (!link) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const win = event.target.ownerDocument.defaultView;
    const dt = new win.DataTransfer();
    dt.setData('text/html', buildAnchorHtml(link));
    dt.setData('text/plain', link.title);
    const synthetic = new win.ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    synthetic.__gwsTweaksSynthetic = true;
    event.target.dispatchEvent(synthetic);
  }

  const boundDocs = new WeakSet();

  function bindEventTargetIframe() {
    const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
    if (!iframe || !iframe.contentDocument) {
      return false;
    }
    const doc = iframe.contentDocument;
    if (boundDocs.has(doc)) {
      return true;
    }
    boundDocs.add(doc);
    doc.addEventListener('paste', handlePaste, true);
    return true;
  }

  // iframeは動的に生成されるため、現れる（または作り直される）たびに配線する
  bindEventTargetIframe();
  const observer = new MutationObserver(() => {
    bindEventTargetIframe();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
