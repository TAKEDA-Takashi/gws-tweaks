# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

Google Workspace（ドキュメント、Gmail、カレンダーなど）に便利機能を追加するChrome拡張（Manifest V3）。content scriptはドキュメント・スプレッドシート・スライドで共通に動作し（3アプリのヘッダーDOMは同一構造）、Docs固有機能は `IS_DOCS` でガードする。アプリ固有機能が増えて見通しが悪くなったら `extension/src/content/` をアプリ別に再編する方針。ビルドステップはなく、`extension/` ディレクトリをそのまま「パッケージ化されていない拡張機能」としてChromeに読み込む（リポジトリのルートは不可。`_config.yml` など `_` 始まりのファイルがあるとChromeが拒否するため、拡張本体はルートから分離している）。lint・typecheckは未設定で、品質チェックはテストのみ。

## コマンド

```bash
npm install
npm test -- --run                      # 全テスト実行（--run必須、なしだとwatchモードで止まる）
npm test -- --run test/markdown-paste.test.js  # 単一ファイルのテスト
```

## アーキテクチャ

拡張本体は `extension/` 配下（`manifest.json`・`src/`・`icons/`）。モジュールバンドラを使わないため、`extension/src/lib/` の各ファイルはIIFEで `globalThis.GWSTweaks` 名前空間にAPIを公開する（`Object.assign(root.GWSTweaks || {}, ...)` パターン）。content scriptは `manifest.json` の `js` 配列で lib → main の順にロードされ、設定画面（options.html）も `<script>` タグで同じlibを読み込む。テストは `import()` でファイルを実行してから `globalThis.GWSTweaks` を分割代入する。

役割分担（パスは `extension/` からの相対）:

- `src/lib/` — 純粋ロジックと共有コード。DOM・Docs固有のAPIに依存しない部分はここに置き、リポジトリルートの `test/` にvitestでテストを書く（テスト対象はこの層のみ）
- `src/content/main.js` — content script本体。Google Docsの入力イベントは `iframe.docs-texteventtarget-iframe` 内のdocumentに届くため、MutationObserverでこのiframeの出現・再生成を監視して各機能のイベントリスナーを配線する
- `src/background/service-worker.js` — Drive API呼び出しとOAuth認証（`chrome.identity.getAuthToken`）。content scriptとは `chrome.runtime.sendMessage` で連携し、`importScripts('/src/lib/...')` でlibを読み込む。取得データは端末外に送信しない方針（OAuthのセキュリティ評価免除の条件）
- `src/options/` — 設定画面。`FEATURES` レジストリから自動でUIを生成する

`manifest.json` の `key` はChrome Web Storeが発行した公開鍵で、ローカル開発版の拡張IDをStore版（`clfdceeaohplokfalnmcdjibngfnijok`）に揃えるためのもの。OAuthクライアントIDはこの拡張IDに紐づくため変更しないこと。Chrome Web Storeへの提出は `npm run package -- --keep-key`。手順と掲載情報ドラフトは `docs/store-publishing.md` を参照。

### 機能レジストリ

機能のON/OFFは `src/lib/features.js` の `FEATURES` 配列が単一の情報源。設定は `chrome.storage.sync` の `features` キーに保存され、content scriptは `chrome.storage.onChanged` で即時反映する（未保存の機能は `defaultEnabled` で補完）。

新機能の追加手順:
1. `FEATURES` に機能定義を追加（設定画面には自動で並ぶ）
2. `src/content/main.js` で `enabled.<機能ID>` をチェックして動作を実装
3. 純粋ロジックは `src/lib/` に切り出して `test/` にテストを追加

### フォルダーパス（パンくず）表示の仕組み

`#docs-menubars` の直後に全幅の行（高さ24px、`#gws-tweaks-bar`）を挿入し、パンくずを載せる。ヘッダー・本文領域の高さは固定計算のため、**行の挿入・削除のたびに `window` へ `resize` イベントをdispatchして再レイアウトさせる必要がある**（これを怠るとツールバー以下に重なる）。タイトル横やメニューバー右側への配置は、右側アイコン群との重なりやウィンドウ幅依存の問題があり不採用になった経緯がある。`#docs-menubars` 等のヘッダーDOMはドキュメント・スプレッドシート・スライドで同一（実機確認済み）。

パンくずはcontent scriptがservice worker経由でDrive APIから親フォルダー階層を取得して表示する。表示するフォルダーがなかったdocIdは `breadcrumbEmptyFor` に記録し、MutationObserverの再発火による「挿入→空→削除」の無限ループを防ぐ。

### ドキュメント初期設定のワンクリック適用の仕組み

タイトル横のアイコン群（`.docs-titlebar-badges`、スター・移動アイコンなどの28x28ボタンの並び）に追加した魔法の杖ボタン（ドキュメントのみ）から、`chrome.storage.sync` の `docSetup` キーに保存した設定（フォント・サイズ・行間・インデント幅・ページ分けなし）をDocs APIの `batchUpdate` で適用する。結果はアイコンをチェック（緑）／エラー（赤）に2秒間差し替えて通知する。リクエストの組み立ては `src/lib/doc-setup.js`（純粋ロジック、テスト対象）。要点:

- ページ分けなしは `updateDocumentStyle` の `documentStyle.documentFormat.documentMode = 'PAGELESS'`（比較的新しいAPIフィールド）
- フォント・行間は `documents.get` で本文終端の `endIndex` を取り、`{startIndex: 1, endIndex}` の範囲に `updateTextStyle` / `updateParagraphStyle` を適用する。行間は100倍のパーセント指定（1.15 → 115、浮動小数点誤差の丸めが必要）
- 箇条書き・インデント幅は、リスト自体のインデント定義（`lists.nestingLevels`）をAPIで変更できないため、段落単位の `updateParagraphStyle`（`indentStart` / `indentFirstLine`、リスト定義より優先される）で上書きする。箇条書きは `paragraph.bullet.nestingLevel` から `indentStart = 幅×(レベル+1)`、記号位置は本文−18pt（幅が18pt未満なら幅と同じ間隔）。インデント済みの通常段落は `indentStart` を36pt基準で比例配分。既存段落への上書きのみで、適用後に新しく作ったリストは標準幅に戻る（再適用でカバーする運用）
- OAuthスコープに `https://www.googleapis.com/auth/documents`、host_permissionsに `docs.googleapis.com` が必要。スコープ不足（403）時はトークンを破棄して再認証を促す
- DocsページはTrusted Types必須（`require-trusted-types-for 'script'`）のため、content scriptでも `innerHTML` への代入は例外になる。SVGアイコン等は `createElementNS` などのDOM APIで組み立てること

### Cmd+Vでマークダウンから貼り付けの仕組み

Docsの編集メニュー項目（`.goog-menuitem`）は、**信頼されたユーザー操作（実キー入力・実クリック）のハンドラ内からであれば**合成マウスイベントで起動できる（信頼されたイベントの外から合成イベントだけで起動しようとしても無視される）。また、項目の起動にはメニューが開いた状態である必要があるため、メニューボタンへ合成mousedown/mouseupを送って開いてから項目を起動する。同一タスク内で完結させれば描画が発生せず、メニューは画面にちらつかない（実機確認済み）。

- 設定は3モード: `auto`（デフォルト。貼り付け内容がマークダウンらしいときだけ差し替え）・`always`（常に差し替え）・`off`。旧バージョンのboolean保存値は `false`→`off`、それ以外→デフォルト（`auto`）に読み替える（`src/lib/features.js`）
- 傍受は `docs-texteventtarget-iframe` 内の**pasteイベント**（キャプチャ段階）で行う。pasteイベントは実キー入力由来ならtrustedで、`event.clipboardData` から text/plain を**同期的に**読める（権限不要）。内容を判定してから `preventDefault` + `stopImmediatePropagation` して「マークダウンから貼り付け」項目を起動する。pasteハンドラ内も信頼されたコンテキストとして扱われ、メニュー起動できる（実機確認済み）
- keydownでは `preventDefault` せず、Cmd+Vの時刻を記録するだけ。pasteハンドラ側で「直近300ms以内にCmd+Vがあったpaste」だけを対象にすることで、編集メニュー・右クリックメニューからの貼り付けを変更しない
- **メニュー起動による内部貼り付け自体も同じiframeにtrustedなpasteイベントとして届く**（`activateEditMenuItem` 中に同期で発火する。実機確認済み）。再傍受による無限ループを防ぐため、起動前にガード時刻（1.5秒）を立てて内部pasteを素通しする。時刻で失効させるので、起動が失敗してpasteが届かなくても以後のCmd+Vは壊れない
- マークダウン判定は `src/lib/markdown-paste.js` の `isLikelyMarkdown`。シグナル種別ごとの加算スコア（強2・弱1）で合計2以上ならマークダウン。「1. 会議室の予約」「- 牛乳を買う」のような1行だけの弱いシグナルでは発動しない
- テキストのないクリップボード（画像など）は通常の貼り付けに任せる
- 項目はテキストラベルで特定する（IDは `:7f` のような動的生成のため不可）。ラベル判定は `src/lib/markdown-paste.js` の `isMarkdownPasteLabel`。対応ラベルは日本語「マークダウンから貼り付け」と英語「Paste from Markdown」
- **項目が見つからない・無効（`aria-disabled="true"`）のときはpreventDefaultせず通常の貼り付けにフォールバック**する（未対応のUI言語、メニュー未レンダリングの場合にCmd+Vを壊さないため）。特にツール→設定で「Markdownを有効にする」がOFFの場合、**項目は存在するが常に無効**という状態になる（Windowsユーザーの実報告で確認）。無効チェックをpreventDefaultより先に行わないと、この状態でCtrl+Vが完全に無反応になる
- Docsのメニュー経由の貼り付けはページのclipboard API（`navigator.clipboard`）を使わない（permissionが `prompt` のままでも動作する。上記の内部pasteイベントを含め、Docsオフライン拡張連携の内部経路とみられる）
