// 機能の定義と設定の読み書き。content scriptと設定画面の両方から使う。
(function (root) {
  'use strict';

  const FEATURES = [
    {
      id: 'markdownLinkPaste',
      name: 'Markdownリンクの貼り付け変換',
      description:
        '[タイトル](URL) 形式のテキストを貼り付けたとき、タイトルの長さに関係なくリンクとして挿入します（ドキュメントのみ）。',
      defaultEnabled: true,
    },
    {
      id: 'driveBreadcrumb',
      name: 'フォルダーパスの表示',
      description:
        'メニューバーの下に、ファイルが置かれているドライブのフォルダー階層をパンくずリストとして表示します。クリックでフォルダーを開けます（ドキュメント・スプレッドシート・スライド対応、Googleアカウントでの認証が必要です）。',
      defaultEnabled: true,
    },
    {
      id: 'docSetup',
      name: 'ドキュメント初期設定のワンクリック適用',
      description:
        'タイトル横の魔法の杖アイコンから、設定画面で指定したフォント・行間・ページ分けなしをまとめて適用します（ドキュメントのみ、Googleアカウントでの認証が必要です）。',
      defaultEnabled: true,
    },
  ];

  // 保存済み設定にない機能はdefaultEnabledで補完して返す
  async function loadFeatureSettings() {
    const stored = await chrome.storage.sync.get({ features: {} });
    const settings = {};
    for (const feature of FEATURES) {
      settings[feature.id] =
        feature.id in stored.features ? stored.features[feature.id] : feature.defaultEnabled;
    }
    return settings;
  }

  async function saveFeatureSettings(settings) {
    await chrome.storage.sync.set({ features: settings });
  }

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    FEATURES,
    loadFeatureSettings,
    saveFeatureSettings,
  });
})(globalThis);
