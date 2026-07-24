// 機能の定義と設定の読み書き。content scriptと設定画面の両方から使う。
(function (root) {
  'use strict';

  const FEATURES = [
    {
      id: 'markdownPasteShortcut',
      name: 'Cmd+Vでマークダウンから貼り付け',
      description:
        'Cmd+V（Ctrl+V）の貼り付けを「マークダウンから貼り付け」に変更します。「自動判定」では貼り付ける内容がマークダウンらしいときだけ切り替え、普通のテキストは通常どおり貼り付けます。編集メニューや右クリックからの貼り付けは常に通常のままです（ドキュメントのみ）。Docsの「ツール」→「設定」で「Markdownを有効にする」がONになっている必要があります（OFFの場合は通常の貼り付けのまま）。',
      options: [
        { value: 'auto', label: '自動判定' },
        { value: 'always', label: '常にマークダウンから貼り付け' },
        { value: 'off', label: 'オフ' },
      ],
      defaultValue: 'auto',
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
        'タイトル横の魔法の杖アイコンから、設定画面で指定したフォント・行間・インデント幅・ページ分けなしをまとめて適用します（ドキュメントのみ、Googleアカウントでの認証が必要です）。',
      defaultEnabled: true,
    },
  ];

  // 保存済み設定にない機能はデフォルト値で補完して返す。
  // 選択式（options持ち）の機能は不正値をデフォルトに戻す。旧バージョンの
  // boolean保存値はfalse→'off'、それ以外（true含む）→デフォルトに引き継ぐ
  async function loadFeatureSettings() {
    const stored = await chrome.storage.sync.get({ features: {} });
    const settings = {};
    for (const feature of FEATURES) {
      const raw = feature.id in stored.features ? stored.features[feature.id] : undefined;
      if (feature.options) {
        settings[feature.id] = feature.options.some((o) => o.value === raw)
          ? raw
          : raw === false
            ? 'off'
            : feature.defaultValue;
      } else {
        settings[feature.id] = raw === undefined ? feature.defaultEnabled : raw;
      }
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
