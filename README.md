# GWS Tweaks

Google Workspace（ドキュメント、Gmail、カレンダーなど）にちょっとした便利機能を追加するChrome拡張（Manifest V3）。現在はドキュメント・スプレッドシート・スライド向けの機能があります。

## 機能

各機能は拡張の設定画面から個別にON/OFFできます。

### Markdownリンクの貼り付け変換（Google ドキュメント）

`[タイトル](URL)` 形式のテキストを貼り付けたとき、リンクとして挿入します。

Google Docs標準のMarkdown自動検出はタイトルが98文字以上だと変換に失敗しますが、
この機能は貼り付けイベントを傍受してHTMLアンカーの貼り付けに差し替えることで、
タイトルの長さに関係なく変換します（Enterを押す必要もありません）。

- 対象はクリップボード全体が単一のMarkdownリンクの場合のみ
- URLは `http(s)://` のみ対応
- 機能がOFFのとき、またはMarkdownリンクでないときは通常の貼り付けのまま

### フォルダーパスの表示（ドキュメント・スプレッドシート・スライド）

メニューバーの下に、開いているファイルが置かれているドライブのフォルダー階層を
パンくずリストとして表示します。各フォルダーはクリックでGoogle Driveの新しいタブで開けます。

- 初回はパンくず位置の「フォルダーパスを表示」からGoogleアカウントの認証（Driveメタデータの読み取り権限）が必要
- 5階層以上は中間を「…」に折りたたみ、クリックで隠れたフォルダーの一覧をポップアップ表示
- 共有ドライブにも対応。閲覧権限のない上位フォルダーは「…」表示で省略
- フォルダー階層の取得にはDrive APIを利用し、取得したデータは端末外に送信しません
- ChromeにログインしているGoogleアカウントとドキュメントを開いているアカウントが異なる場合は表示されません

## インストール（開発版）

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリのルートを選択

フォルダーパス表示機能はGoogle CloudのOAuthクライアントを利用します。`manifest.json` の
`oauth2.client_id` は `key` フィールドで固定された拡張ID（開発版）に紐づいています。
自分のGoogle Cloudプロジェクトで使う場合は、OAuth同意画面（スコープ:
`drive.metadata.readonly`）と「Chrome拡張機能」タイプのOAuthクライアントを作成し、
`client_id` を差し替えてください。

## 設定

`chrome://extensions` → GWS Tweaks → 「拡張機能のオプション」から各機能をON/OFFできます。
設定は `chrome.storage.sync` に保存され、開いているページに即時反映されます。

## 開発

```bash
npm install
npm test -- --run
```

### 構成

```
manifest.json                    # Manifest V3定義
src/lib/markdown-link.js         # Markdownリンク解析（純粋ロジック、テスト対象）
src/lib/breadcrumb.js            # フォルダー階層の組み立て（純粋ロジック、テスト対象）
src/lib/features.js              # 機能レジストリと設定の読み書き
src/content/main.js              # content script本体（UI注入とイベント配線）
src/background/service-worker.js # Drive API呼び出しとOAuth認証
src/options/                     # 設定画面
test/                            # vitestによるユニットテスト
```

### 機能の追加方法

1. `src/lib/features.js` の `FEATURES` に機能定義を追加（設定画面に自動で並ぶ）
2. `src/content/main.js` で `enabled.<機能ID>` を確認して動作を実装
3. 純粋ロジックは `src/lib/` に切り出して `test/` にテストを追加
