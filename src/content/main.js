// Google ドキュメント・スプレッドシート・スライドのトップフレームで動作するcontent script。
(function () {
  'use strict';

  // 貼り付けの入れ替えなどDocs固有の機能はドキュメントでのみ有効にする
  const IS_DOCS = location.pathname.startsWith('/document/');

  const {
    isMarkdownPasteLabel,
    loadFeatureSettings,
    extractDocId,
    folderUrl,
    collapseBreadcrumb,
  } = globalThis.GWSTweaks;

  const enabled = {};

  loadFeatureSettings().then((settings) => {
    Object.assign(enabled, settings);
    syncBar();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.features) {
      loadFeatureSettings().then((settings) => {
        Object.assign(enabled, settings);
        syncBar();
      });
    }
  });

  // --- Cmd+Vをマークダウンから貼り付けに変更 ---
  //
  // Docsの編集メニュー項目は、合成マウスイベントでも「信頼された
  // ユーザー操作（実際のキー入力・クリック）のハンドラ内」からであれば起動できる。
  // これを利用して、Cmd+Vのハンドラ内から「マークダウンから貼り付け」を起動する。
  // 編集メニュー・右クリックメニューからの貼り付けは変更しない。

  function fireMouse(el, type, x, y) {
    el.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        buttons: 1,
        clientX: x || 0,
        clientY: y || 0,
      })
    );
  }

  function findMenuItem(labelPred) {
    return (
      [...document.querySelectorAll('.goog-menuitem')].find((el) => labelPred(el.textContent)) ||
      null
    );
  }

  // 編集メニューを開いて項目を起動する。メニューが開いた状態でないと項目が
  // 反応しないため先に開くが、同一タスク内で完結するので描画されず
  // ちらつかない（実機確認済み）。
  function activateEditMenuItem(item) {
    const editButton = document.getElementById('docs-edit-menu');
    if (!editButton) {
      return;
    }
    fireMouse(editButton, 'mousedown');
    fireMouse(editButton, 'mouseup');
    if (item.getAttribute('aria-disabled') === 'true') {
      // 起動できないときは開いたメニューを閉じて元に戻す
      fireMouse(editButton, 'mousedown');
      fireMouse(editButton, 'mouseup');
      return;
    }
    const rect = item.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    fireMouse(item, 'mouseover', cx, cy);
    fireMouse(item, 'mousedown', cx, cy);
    fireMouse(item, 'mouseup', cx, cy);
    fireMouse(item, 'click', cx, cy);
  }

  // Cmd+V（Ctrl+V）を「マークダウンから貼り付け」に差し替える
  function handlePasteShortcut(event) {
    if (!enabled.markdownPasteShortcut) {
      return;
    }
    if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) {
      return;
    }
    if (event.key !== 'v' && event.key !== 'V') {
      return;
    }
    // 項目が見つからない場合（未対応のUI言語、Markdown設定が無効、未レンダリング）は
    // preventDefaultせず通常の貼り付けにフォールバックする
    const item = findMenuItem(isMarkdownPasteLabel);
    if (!item) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    activateEditMenuItem(item);
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
    doc.addEventListener('keydown', handlePasteShortcut, true);
    return true;
  }

  // --- メニューバー下のバー（パンくず表示） ---

  const BAR_ID = 'gws-tweaks-bar';
  const BREADCRUMB_ID = 'gws-tweaks-breadcrumb';
  const DOC_SETUP_BUTTON_ID = 'gws-tweaks-doc-setup';

  // ヘッダーの行構成を変えたときにDocsに本文領域の高さを再計算させる
  function relayoutDocs() {
    window.dispatchEvent(new Event('resize'));
  }

  // メニューバー直下に全幅の行として挿入する（横に置くとウィンドウ幅に依存するため）
  function ensureBar() {
    let bar = document.getElementById(BAR_ID);
    if (bar) {
      return bar;
    }
    const menubars = document.getElementById('docs-menubars');
    const menubar = document.getElementById('docs-menubar');
    if (!menubars || !menubar) {
      return null;
    }
    bar = document.createElement('div');
    bar.id = BAR_ID;
    const menubarLeft = Math.round(menubar.getBoundingClientRect().left);
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      height: '24px',
      gap: '16px',
      paddingLeft: menubarLeft + 'px',
      paddingRight: '16px',
      fontSize: '12px',
      color: '#5f6368',
      whiteSpace: 'nowrap',
    });
    menubars.insertAdjacentElement('afterend', bar);
    relayoutDocs();
    return bar;
  }

  function removeBar() {
    closeBreadcrumbPopup();
    const bar = document.getElementById(BAR_ID);
    if (bar) {
      bar.remove();
      relayoutDocs();
    }
  }

  // バーに表示するものがなくなったら行ごと畳んで本文領域を返す
  function pruneBar() {
    const bar = document.getElementById(BAR_ID);
    if (bar && !document.getElementById(BREADCRUMB_ID)) {
      removeBar();
    }
  }

  function syncBar() {
    const wantBreadcrumb = !!enabled.driveBreadcrumb;
    if (wantBreadcrumb) {
      syncBreadcrumbSection(true);
    } else {
      removeBar();
    }
    syncDocSetupButton(!!enabled.docSetup && IS_DOCS);
  }

  // 表示するフォルダーがなかったdocId。observerの再発火による再リクエストを防ぐ
  let breadcrumbEmptyFor = null;

  function syncBreadcrumbSection(want) {
    if (!want) {
      closeBreadcrumbPopup();
      const nav = document.getElementById(BREADCRUMB_ID);
      if (nav) {
        nav.remove();
      }
      return;
    }
    if (document.getElementById(BREADCRUMB_ID)) {
      return;
    }
    const docId = extractDocId(location.href);
    if (!docId || docId === breadcrumbEmptyFor) {
      return;
    }
    const bar = ensureBar();
    if (!bar) {
      return;
    }

    // 先にコンテナを挿入しておき、observerの多重発火による二重リクエストを防ぐ
    const nav = document.createElement('nav');
    nav.id = BREADCRUMB_ID;
    Object.assign(nav.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flex: '1',
      minWidth: '0',
      overflow: 'hidden',
    });
    bar.prepend(nav);

    requestAndRenderBreadcrumb(nav, docId);
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
      breadcrumbEmptyFor = docId;
      container.remove();
      pruneBar();
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

  // --- ドキュメント初期設定のワンクリック適用 ---

  // タイトル横のアイコン群（スター・移動などの .docs-titlebar-badges）に並べる。
  // DocsページはTrusted Types必須のためinnerHTMLは使えず、SVGはDOM APIで組み立てる
  const DOC_SETUP_ICONS = {
    // Material Symbols: auto_fix_high（魔法の杖）
    idle: {
      color: '#444746',
      d: 'M7.5 5.6 10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.9959.9959 0 0 0-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z',
    },
    // Material Symbols: check
    success: { color: '#188038', d: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
    // Material Symbols: error
    error: {
      color: '#d93025',
      d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    },
  };

  function setDocSetupIcon(button, state) {
    const icon = DOC_SETUP_ICONS[state];
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', icon.color);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', icon.d);
    svg.appendChild(path);
    button.textContent = '';
    button.appendChild(svg);
  }

  function syncDocSetupButton(want) {
    const existing = document.getElementById(DOC_SETUP_BUTTON_ID);
    if (!want) {
      if (existing) {
        existing.remove();
      }
      return;
    }
    if (existing) {
      return;
    }
    const docId = extractDocId(location.href);
    const badges = document.querySelector('.docs-titlebar-badges');
    if (!docId || !badges) {
      return;
    }

    const button = document.createElement('button');
    button.id = DOC_SETUP_BUTTON_ID;
    button.title = '初期設定を適用（GWS Tweaks）';
    Object.assign(button.style, {
      flex: 'none',
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      borderRadius: '9999px',
      background: 'none',
      padding: '0',
      cursor: 'pointer',
    });
    setDocSetupIcon(button, 'idle');
    button.addEventListener('mouseenter', () => (button.style.background = 'rgba(60,64,67,0.08)'));
    button.addEventListener('mouseleave', () => (button.style.background = 'none'));
    button.addEventListener('click', () => applyDocSetup(button, docId));
    badges.appendChild(button);
  }

  async function applyDocSetup(button, docId) {
    button.disabled = true;
    button.style.opacity = '0.38';
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'gwsTweaks.applyDocSetup', docId });
      // 未認証・スコープ不足の場合は認証してから1回だけやり直す
      if (response && response.status === 'auth_required') {
        const auth = await chrome.runtime.sendMessage({ type: 'gwsTweaks.authorize' });
        if (auth && auth.status === 'ok') {
          response = await chrome.runtime.sendMessage({ type: 'gwsTweaks.applyDocSetup', docId });
        }
      }
    } catch {
      response = null;
    }
    button.style.opacity = '';
    if (!response || response.status !== 'ok') {
      console.error('[GWS Tweaks] 初期設定の適用に失敗:', response);
    }
    setDocSetupIcon(button, response && response.status === 'ok' ? 'success' : 'error');
    setTimeout(() => {
      setDocSetupIcon(button, 'idle');
      button.disabled = false;
    }, 2000);
  }

  // iframeは動的に生成されるため、現れる（または作り直される）たびに配線する
  bindEventTargetIframe();
  syncBar();
  const observer = new MutationObserver(() => {
    bindEventTargetIframe();
    syncBar();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
