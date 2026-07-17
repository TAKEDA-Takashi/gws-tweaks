# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

Google Workspace（ドキュメント、Gmail、カレンダーなど）に便利機能を追加するChrome拡張（Manifest V3）。content scriptはドキュメント・スプレッドシート・スライドで共通に動作し（3アプリのヘッダーDOMは同一構造）、Docs固有機能は `IS_DOCS` でガードする。アプリ固有機能が増えて見通しが悪くなったら `src/content/` をアプリ別に再編する方針。ビルドステップはなく、リポジトリのルートをそのまま「パッケージ化されていない拡張機能」としてChromeに読み込む。lint・typecheckは未設定で、品質チェックはテストのみ。

## コマンド

```bash
npm install
npm test -- --run                      # 全テスト実行（--run必須、なしだとwatchモードで止まる）
npm test -- --run test/markdown-link.test.js  # 単一ファイルのテスト
```

## アーキテクチャ

モジュールバンドラを使わないため、`src/lib/` の各ファイルはIIFEで `globalThis.GWSTweaks` 名前空間にAPIを公開する（`Object.assign(root.GWSTweaks || {}, ...)` パターン）。content scriptは `manifest.json` の `js` 配列で lib → main の順にロードされ、設定画面（options.html）も `<script>` タグで同じlibを読み込む。テストは `import()` でファイルを実行してから `globalThis.GWSTweaks` を分割代入する。

役割分担:

- `src/lib/` — 純粋ロジックと共有コード。DOM・Docs固有のAPIに依存しない部分はここに置き、`test/` にvitestでテストを書く（テスト対象はこの層のみ）
- `src/content/main.js` — content script本体。Google Docsの入力イベントは `iframe.docs-texteventtarget-iframe` 内のdocumentに届くため、MutationObserverでこのiframeの出現・再生成を監視して各機能のイベントリスナーを配線する
- `src/background/service-worker.js` — Drive API呼び出しとOAuth認証（`chrome.identity.getAuthToken`）。content scriptとは `chrome.runtime.sendMessage` で連携し、`importScripts('/src/lib/...')` でlibを読み込む。取得データは端末外に送信しない方針（OAuthのセキュリティ評価免除の条件）
- `src/options/` — 設定画面。`FEATURES` レジストリから自動でUIを生成する

`manifest.json` の `key` は拡張IDを固定するための公開鍵（対の秘密鍵は `extension-key.pem`、git管理外）。OAuthクライアントIDはこの拡張IDに紐づくため変更しないこと。

### 機能レジストリ

機能のON/OFFは `src/lib/features.js` の `FEATURES` 配列が単一の情報源。設定は `chrome.storage.sync` の `features` キーに保存され、content scriptは `chrome.storage.onChanged` で即時反映する（未保存の機能は `defaultEnabled` で補完）。

新機能の追加手順:
1. `FEATURES` に機能定義を追加（設定画面には自動で並ぶ）
2. `src/content/main.js` で `enabled.<機能ID>` をチェックして動作を実装
3. 純粋ロジックは `src/lib/` に切り出して `test/` にテストを追加

### フォルダーパス（パンくず）表示の仕組み

content scriptがservice worker経由でDrive APIから親フォルダー階層を取得し、`#docs-menubars` の直後に全幅の行（高さ24px）として挿入する。ヘッダー・本文領域の高さは固定計算のため、**行の挿入・削除のたびに `window` へ `resize` イベントをdispatchして再レイアウトさせる必要がある**（これを怠るとツールバー以下に重なる）。タイトル横やメニューバー右側への配置は、右側アイコン群との重なりやウィンドウ幅依存の問題があり不採用になった経緯がある。`#docs-menubars` 等のヘッダーDOMはドキュメント・スプレッドシート・スライドで同一（実機確認済み）。

### Markdownリンク貼り付けの仕組み（既存機能の例）

Docs標準のMarkdown自動検出はタイトル98文字以上で失敗するため、pasteイベントをキャプチャ段階で傍受し、`preventDefault` + `stopImmediatePropagation` した上でHTMLアンカーを載せた合成pasteイベントに差し替える。合成イベントには `__gwsTweaksSynthetic` フラグを付けて再帰処理を防ぐ。
