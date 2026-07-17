// Google ドキュメント・スプレッドシート・スライドのトップフレームで動作するcontent script。
(function () {
  'use strict';

  // Markdownリンク貼り付けなどDocs固有の機能はドキュメントでのみ有効にする
  const IS_DOCS = location.pathname.startsWith('/document/');

  const {
    parseMarkdownLink,
    buildAnchorHtml,
    loadFeatureSettings,
    extractDocId,
    folderUrl,
    collapseBreadcrumb,
  } = globalThis.GWSTweaks;

  const enabled = {};

  loadFeatureSettings().then((settings) => {
    Object.assign(enabled, settings);
    syncBreadcrumb();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.features) {
      loadFeatureSettings().then((settings) => {
        Object.assign(enabled, settings);
        syncBreadcrumb();
      });
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
    // 同名のiframeはスライドにも存在するため、Docs以外では配線しない
    if (!IS_DOCS) {
      return true;
    }
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

  // --- ドライブのフォルダーパス（パンくず）表示 ---

  const BREADCRUMB_ID = 'gws-tweaks-breadcrumb';

  // ヘッダーの行構成を変えたときにDocsに本文領域の高さを再計算させる
  function relayoutDocs() {
    window.dispatchEvent(new Event('resize'));
  }

  function removeBreadcrumb() {
    closeBreadcrumbPopup();
    const el = document.getElementById(BREADCRUMB_ID);
    if (el) {
      el.remove();
      relayoutDocs();
    }
  }

  function syncBreadcrumb() {
    if (enabled.driveBreadcrumb) {
      mountBreadcrumb();
    } else {
      removeBreadcrumb();
    }
  }

  function mountBreadcrumb() {
    if (!enabled.driveBreadcrumb || document.getElementById(BREADCRUMB_ID)) {
      return;
    }
    const menubars = document.getElementById('docs-menubars');
    const menubar = document.getElementById('docs-menubar');
    const docId = extractDocId(location.href);
    if (!menubars || !menubar || !docId) {
      return;
    }

    // 先にコンテナを挿入しておき、observerの多重発火による二重リクエストを防ぐ。
    // メニューバー直下に全幅の行として挿入する（横に置くとウィンドウ幅に依存するため）
    const container = document.createElement('nav');
    container.id = BREADCRUMB_ID;
    const menubarLeft = Math.round(menubar.getBoundingClientRect().left);
    Object.assign(container.style, {
      display: 'flex',
      alignItems: 'center',
      height: '24px',
      gap: '4px',
      paddingLeft: menubarLeft + 'px',
      fontSize: '12px',
      color: '#5f6368',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    });
    menubars.insertAdjacentElement('afterend', container);
    relayoutDocs();

    requestAndRenderBreadcrumb(container, docId);
  }

  async function requestAndRenderBreadcrumb(container, docId) {
    const response = await chrome.runtime.sendMessage({
      type: 'gwsTweaks.getBreadcrumb',
      docId,
    });
    renderBreadcrumb(container, docId, response);
  }

  // 「…」クリックで開く、隠れた中間フォルダーの一覧ポップアップ
  let breadcrumbPopup = null;
  let breadcrumbPopupCleanup = null;

  function closeBreadcrumbPopup() {
    if (!breadcrumbPopup) {
      return;
    }
    breadcrumbPopup.remove();
    breadcrumbPopup = null;
    breadcrumbPopupCleanup();
    breadcrumbPopupCleanup = null;
  }

  function openBreadcrumbPopup(trigger, folders) {
    closeBreadcrumbPopup();
    const popup = document.createElement('div');
    Object.assign(popup.style, {
      position: 'fixed',
      zIndex: '10000',
      background: '#fff',
      border: '1px solid #dadce0',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '4px 0',
      fontSize: '12px',
      color: '#5f6368',
      maxWidth: '320px',
    });
    folders.forEach((folder) => {
      const item = document.createElement('a');
      item.href = folderUrl(folder.id);
      item.target = '_blank';
      item.rel = 'noopener';
      item.textContent = folder.name;
      item.title = folder.name;
      Object.assign(item.style, {
        display: 'block',
        padding: '6px 16px',
        color: 'inherit',
        textDecoration: 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      item.addEventListener('mouseenter', () => (item.style.background = '#f1f3f4'));
      item.addEventListener('mouseleave', () => (item.style.background = 'none'));
      popup.appendChild(item);
    });

    const rect = trigger.getBoundingClientRect();
    popup.style.left = Math.round(rect.left) + 'px';
    popup.style.top = Math.round(rect.bottom + 4) + 'px';
    document.body.appendChild(popup);
    breadcrumbPopup = popup;

    const onDocClick = (event) => {
      if (popup.contains(event.target) || trigger.contains(event.target)) {
        return;
      }
      closeBreadcrumbPopup();
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        closeBreadcrumbPopup();
      }
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKeydown, true);
    breadcrumbPopupCleanup = () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeydown, true);
    };
  }

  function renderBreadcrumb(container, docId, response) {
    closeBreadcrumbPopup();
    container.textContent = '';
    if (!response || (response.status === 'ok' && response.folders.length === 0)) {
      container.remove();
      relayoutDocs();
      return;
    }

    if (response.status === 'auth_required') {
      const button = document.createElement('button');
      button.textContent = 'フォルダーパスを表示';
      Object.assign(button.style, {
        border: 'none',
        background: 'none',
        padding: '0',
        font: 'inherit',
        color: '#1a73e8',
        cursor: 'pointer',
      });
      button.addEventListener('click', async () => {
        const result = await chrome.runtime.sendMessage({ type: 'gwsTweaks.authorize' });
        if (result && result.status === 'ok') {
          requestAndRenderBreadcrumb(container, docId);
        }
      });
      container.appendChild(button);
      return;
    }

    let first = true;
    function appendCrumb(node) {
      if (!first) {
        container.appendChild(document.createTextNode('›'));
      }
      first = false;
      container.appendChild(node);
    }

    function appendFolder(folder) {
      const anchor = document.createElement('a');
      anchor.href = folderUrl(folder.id);
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = folder.name;
      anchor.title = folder.name;
      Object.assign(anchor.style, {
        color: 'inherit',
        textDecoration: 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '160px',
      });
      anchor.addEventListener('mouseenter', () => (anchor.style.textDecoration = 'underline'));
      anchor.addEventListener('mouseleave', () => (anchor.style.textDecoration = 'none'));
      appendCrumb(anchor);
    }

    // 権限などで上位階層を辿れなかった場合の印
    if (response.truncated) {
      appendCrumb(document.createTextNode('…'));
    }

    const { head, hidden, tail } = collapseBreadcrumb(response.folders);

    head.forEach(appendFolder);
    if (hidden.length > 0) {
      const more = document.createElement('button');
      more.textContent = '…';
      more.title = '隠れているフォルダーを表示';
      Object.assign(more.style, {
        border: 'none',
        background: 'none',
        padding: '0 2px',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
      });
      more.addEventListener('click', () => {
        if (breadcrumbPopup) {
          closeBreadcrumbPopup();
        } else {
          openBreadcrumbPopup(more, hidden);
        }
      });
      appendCrumb(more);
    }
    tail.forEach(appendFolder);
  }

  // iframeは動的に生成されるため、現れる（または作り直される）たびに配線する
  bindEventTargetIframe();
  mountBreadcrumb();
  const observer = new MutationObserver(() => {
    bindEventTargetIframe();
    mountBreadcrumb();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
