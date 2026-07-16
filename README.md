# GDocs Tweaks

Google ドキュメントにちょっとした便利機能を追加するChrome拡張（Manifest V3）。

## 機能

各機能は拡張の設定画面から個別にON/OFFできます。

### Markdownリンクの貼り付け変換

`[タイトル](URL)` 形式のテキストを貼り付けたとき、リンクとして挿入します。

Google Docs標準のMarkdown自動検出はタイトルが98文字以上だと変換に失敗しますが、
この機能は貼り付けイベントを傍受してHTMLアンカーの貼り付けに差し替えることで、
タイトルの長さに関係なく変換します（Enterを押す必要もありません）。

- 対象はクリップボード全体が単一のMarkdownリンクの場合のみ
- URLは `http(s)://` のみ対応
- 機能がOFFのとき、またはMarkdownリンクでないときは通常の貼り付けのまま

## インストール（開発版）

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリのルートを選択

## 設定

`chrome://extensions` → GDocs Tweaks → 「拡張機能のオプション」から各機能をON/OFFできます。
設定は `chrome.storage.sync` に保存され、開いているドキュメントに即時反映されます。

## 開発

```bash
npm install
npm test -- --run
```

### 構成

```
manifest.json            # Manifest V3定義
src/lib/markdown-link.js # Markdownリンク解析（純粋ロジック、テスト対象）
src/lib/features.js      # 機能レジストリと設定の読み書き
src/content/main.js      # content script本体（iframe検出とイベント配線）
src/options/             # 設定画面
test/                    # vitestによるユニットテスト
```

### 機能の追加方法

1. `src/lib/features.js` の `FEATURES` に機能定義を追加（設定画面に自動で並ぶ）
2. `src/content/main.js` で `enabled.<機能ID>` を確認して動作を実装
3. 純粋ロジックは `src/lib/` に切り出して `test/` にテストを追加
