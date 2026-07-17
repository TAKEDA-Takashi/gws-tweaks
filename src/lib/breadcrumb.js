// ドキュメントの親フォルダー階層（パンくず）を組み立てるユーティリティ。
// Drive APIへのアクセスは呼び出し側からgetFile関数として注入する。
(function (root) {
  'use strict';

  const DOC_URL_RE = /^https:\/\/docs\.google\.com\/document(?:\/u\/\d+)?\/d\/([\w-]+)/;

  function extractDocId(url) {
    const m = url.match(DOC_URL_RE);
    return m ? m[1] : null;
  }

  // 親参照が循環していた場合の安全弁
  const MAX_DEPTH = 20;

  // getFile: async (fileId) => { name, parents? }（取得失敗時はthrow）
  // 戻り値: { folders: [{id, name}, ...]（ルート側が先頭）, truncated: boolean }
  async function buildBreadcrumb(docId, getFile) {
    const folders = [];
    let parents;
    try {
      ({ parents } = await getFile(docId));
    } catch {
      return { folders, truncated: true };
    }
    let depth = 0;
    while (parents && parents.length > 0) {
      if (depth >= MAX_DEPTH) {
        return { folders, truncated: true };
      }
      depth += 1;
      const id = parents[0];
      let folder;
      try {
        folder = await getFile(id);
      } catch {
        return { folders, truncated: true };
      }
      folders.unshift({ id, name: folder.name });
      parents = folder.parents;
    }
    return { folders, truncated: false };
  }

  function folderUrl(folderId) {
    return 'https://drive.google.com/drive/folders/' + folderId;
  }

  // 表示幅節約のため、5階層以上は先頭（ドライブ名）と末尾2つを残して中間を隠す
  const MAX_VISIBLE = 4;

  function collapseBreadcrumb(folders) {
    if (folders.length <= MAX_VISIBLE) {
      return { head: folders, hidden: [], tail: [] };
    }
    return {
      head: folders.slice(0, 1),
      hidden: folders.slice(1, -2),
      tail: folders.slice(-2),
    };
  }

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    extractDocId,
    buildBreadcrumb,
    folderUrl,
    collapseBreadcrumb,
  });
})(globalThis);
