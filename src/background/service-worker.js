// Drive API・Docs APIを呼び出してcontent scriptに結果を返すservice worker。
// 取得したデータは端末外に送信しない（chrome.storage.sessionに短時間キャッシュするのみ）。
importScripts('/src/lib/breadcrumb.js', '/src/lib/doc-setup.js');

(function () {
  'use strict';

  const {
    buildBreadcrumb,
    loadDocSetupSettings,
    bodyEndIndex,
    buildDocSetupRequests,
    buildIndentRequests,
  } = globalThis.GWSTweaks;

  const CACHE_TTL_MS = 5 * 60 * 1000;

  async function getAuthToken(interactive) {
    const result = await chrome.identity.getAuthToken({ interactive });
    // Chromeのバージョンにより文字列とGetAuthTokenResultの両方がありうる
    const token = typeof result === 'string' ? result : result && result.token;
    if (!token) {
      throw new Error('no auth token');
    }
    return token;
  }

  function driveGetFileRequest(fileId, token) {
    const url =
      'https://www.googleapis.com/drive/v3/files/' +
      encodeURIComponent(fileId) +
      '?fields=name,parents&supportsAllDrives=true';
    return fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  }

  // トークン失効（401）時はキャッシュを破棄して1回だけ再取得・再試行する
  async function makeGetFile() {
    let token = await getAuthToken(false);
    return async function getFile(fileId) {
      let res = await driveGetFileRequest(fileId, token);
      if (res.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        token = await getAuthToken(false);
        res = await driveGetFileRequest(fileId, token);
      }
      if (!res.ok) {
        throw new Error('Drive API error: ' + res.status);
      }
      return res.json();
    };
  }

  async function handleGetBreadcrumb(docId) {
    const cacheKey = 'breadcrumb:' + docId;
    const cached = (await chrome.storage.session.get(cacheKey))[cacheKey];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { status: 'ok', folders: cached.folders, truncated: cached.truncated };
    }

    let getFile;
    try {
      getFile = await makeGetFile();
    } catch {
      return { status: 'auth_required' };
    }

    const { folders, truncated } = await buildBreadcrumb(docId, getFile);
    await chrome.storage.session.set({
      [cacheKey]: { folders, truncated, fetchedAt: Date.now() },
    });
    return { status: 'ok', folders, truncated };
  }

  // --- ドキュメント初期設定のワンクリック適用 ---

  // 401（トークン失効）は1回だけ再取得して再試行、403はスコープ不足として再認証を促す
  async function handleApplyDocSetup(docId) {
    const settings = await loadDocSetupSettings();

    let token;
    try {
      token = await getAuthToken(false);
    } catch {
      return { status: 'auth_required' };
    }

    async function docsFetch(url, init) {
      const request = () =>
        fetch(url, {
          ...init,
          headers: { ...(init && init.headers), Authorization: 'Bearer ' + token },
        });
      let res = await request();
      if (res.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        token = await getAuthToken(false);
        res = await request();
      }
      return res;
    }

    // APIエラーの詳細メッセージを取り出す（レスポンスボディはJSONのerror.message）
    async function docsErrorMessage(res) {
      const body = await res.json().catch(() => null);
      const detail = body && body.error && body.error.message;
      return 'Docs API error: ' + res.status + (detail ? ' - ' + detail : '');
    }

    const baseUrl = 'https://docs.googleapis.com/v1/documents/' + encodeURIComponent(docId);
    // bulletはネストレベル0でnestingLevelが省略されるためオブジェクト全体を要求する
    const getRes = await docsFetch(
      baseUrl + '?fields=body.content(startIndex,endIndex,paragraph(bullet,paragraphStyle(indentStart)))'
    );
    if (getRes.status === 403) {
      await chrome.identity.removeCachedAuthToken({ token });
      return { status: 'auth_required' };
    }
    if (!getRes.ok) {
      return { status: 'error', message: await docsErrorMessage(getRes) };
    }
    const doc = await getRes.json();

    const requests = [
      ...buildDocSetupRequests(settings, bodyEndIndex(doc)),
      ...buildIndentRequests(doc.body && doc.body.content, settings.indentUnit),
    ];
    if (requests.length === 0) {
      return { status: 'ok', applied: 0 };
    }

    const updateRes = await docsFetch(baseUrl + ':batchUpdate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!updateRes.ok) {
      return { status: 'error', message: await docsErrorMessage(updateRes) };
    }
    return { status: 'ok', applied: requests.length };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'gwsTweaks.getBreadcrumb') {
      handleGetBreadcrumb(message.docId).then(sendResponse);
      return true;
    }
    if (message && message.type === 'gwsTweaks.applyDocSetup') {
      handleApplyDocSetup(message.docId)
        .then(sendResponse)
        .catch((e) => sendResponse({ status: 'error', message: String(e) }));
      return true;
    }
    if (message && message.type === 'gwsTweaks.authorize') {
      getAuthToken(true)
        .then(() => sendResponse({ status: 'ok' }))
        .catch(() => sendResponse({ status: 'error' }));
      return true;
    }
  });
})();
