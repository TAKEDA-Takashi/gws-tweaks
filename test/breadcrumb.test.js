import { beforeAll, describe, expect, it } from 'vitest';

let extractDocId;
let buildBreadcrumb;
let folderUrl;
let collapseBreadcrumb;

beforeAll(async () => {
  await import('../src/lib/breadcrumb.js');
  ({ extractDocId, buildBreadcrumb, folderUrl, collapseBreadcrumb } = globalThis.GWSTweaks);
});

// ファイルIDから {name, parents} を返すDrive API風のスタブを作る
function makeGetFile(files) {
  return async (id) => {
    if (!(id in files)) {
      throw new Error('not found: ' + id);
    }
    return files[id];
  };
}

describe('extractDocId', () => {
  it('ドキュメントURLからIDを抽出する', () => {
    expect(
      extractDocId('https://docs.google.com/document/d/1AbC_dEf-123/edit?tab=t.0')
    ).toBe('1AbC_dEf-123');
  });

  it('マルチアカウントの /u/N/ 付きURLからIDを抽出する', () => {
    expect(extractDocId('https://docs.google.com/document/u/1/d/1AbC/edit')).toBe('1AbC');
  });

  it('ドキュメント以外のURLはnullを返す', () => {
    expect(extractDocId('https://docs.google.com/spreadsheets/d/1AbC/edit')).toBeNull();
    expect(extractDocId('https://docs.google.com/document/')).toBeNull();
    expect(extractDocId('https://example.com/document/d/1AbC/edit')).toBeNull();
  });
});

describe('buildBreadcrumb', () => {
  it('親フォルダーをルートまで辿り、ルート側から並べて返す', async () => {
    const getFile = makeGetFile({
      doc1: { name: 'ドキュメント', parents: ['folderA'] },
      folderA: { name: '議事録', parents: ['root1'] },
      root1: { name: 'マイドライブ' },
    });
    expect(await buildBreadcrumb('doc1', getFile)).toEqual({
      folders: [
        { id: 'root1', name: 'マイドライブ' },
        { id: 'folderA', name: '議事録' },
      ],
      truncated: false,
    });
  });

  it('どのフォルダーにも属さないドキュメントは空配列を返す', async () => {
    const getFile = makeGetFile({
      doc1: { name: 'ドキュメント' },
    });
    expect(await buildBreadcrumb('doc1', getFile)).toEqual({
      folders: [],
      truncated: false,
    });
  });

  it('途中の親フォルダーが取得できない場合は辿れた分だけ返しtruncatedにする', async () => {
    const getFile = makeGetFile({
      doc1: { name: 'ドキュメント', parents: ['folderA'] },
      folderA: { name: '議事録', parents: ['secretFolder'] },
    });
    expect(await buildBreadcrumb('doc1', getFile)).toEqual({
      folders: [{ id: 'folderA', name: '議事録' }],
      truncated: true,
    });
  });

  it('ドキュメント自体が取得できない場合は空でtruncatedにする', async () => {
    const getFile = makeGetFile({});
    expect(await buildBreadcrumb('doc1', getFile)).toEqual({
      folders: [],
      truncated: true,
    });
  });

  it('親の参照が循環していても停止する', async () => {
    const getFile = makeGetFile({
      doc1: { name: 'ドキュメント', parents: ['folderA'] },
      folderA: { name: 'A', parents: ['folderB'] },
      folderB: { name: 'B', parents: ['folderA'] },
    });
    const result = await buildBreadcrumb('doc1', getFile);
    expect(result.truncated).toBe(true);
    expect(result.folders.length).toBeLessThanOrEqual(20);
  });
});

describe('collapseBreadcrumb', () => {
  const f = (id) => ({ id, name: 'name-' + id });

  it('4階層以下はそのまま返す', () => {
    const folders = [f('a'), f('b'), f('c'), f('d')];
    expect(collapseBreadcrumb(folders)).toEqual({
      head: folders,
      hidden: [],
      tail: [],
    });
  });

  it('5階層以上は先頭1つと末尾2つを残して中間を隠す', () => {
    const folders = [f('a'), f('b'), f('c'), f('d'), f('e'), f('f')];
    expect(collapseBreadcrumb(folders)).toEqual({
      head: [f('a')],
      hidden: [f('b'), f('c'), f('d')],
      tail: [f('e'), f('f')],
    });
  });

  it('空配列はそのまま返す', () => {
    expect(collapseBreadcrumb([])).toEqual({ head: [], hidden: [], tail: [] });
  });
});

describe('folderUrl', () => {
  it('DriveのフォルダーURLを生成する', () => {
    expect(folderUrl('folder123')).toBe('https://drive.google.com/drive/folders/folder123');
  });
});
