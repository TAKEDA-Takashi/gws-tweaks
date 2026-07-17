// Drive APIでドキュメントの親フォルダー階層を取得し、content scriptに返すservice worker。
// 取得したメタデータは端末外に送信しない（chrome.storage.sessionに短時間キャッシュするのみ）。
importScripts('/src/lib/breadcrumb.js');

(function () {
  'use strict';

  const { buildBreadcrumb } = globalThis.GWSTweaks;

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

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'gwsTweaks.getBreadcrumb') {
      handleGetBreadcrumb(message.docId).then(sendResponse);
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
