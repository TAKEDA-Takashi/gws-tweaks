// 機能の定義と設定の読み書き。content scriptと設定画面の両方から使う。
(function (root) {
  'use strict';

  const FEATURES = [
    {
      id: 'markdownLinkPaste',
      name: 'Markdownリンクの貼り付け変換',
      description:
        '[タイトル](URL) 形式のテキストを貼り付けたとき、タイトルの長さに関係なくリンクとして挿入します。',
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
