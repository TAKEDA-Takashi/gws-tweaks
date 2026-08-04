# OAuth検証デモ動画 撮影台本

`docs/oauth-verification.md` の指摘2への対応。前回の64秒版は「機能の実演が不十分」と判定されたため、**同意画面のスコープ表示**と**各スコープに対応する機能の実演**を軸に3〜4分で撮り直す。

## 事前準備チェックリスト

### アカウント・言語

- [ ] **GoogleアカウントのUI言語を英語にする**（[myaccount.google.com/language](https://myaccount.google.com/language)）。同意画面・Docsのメニューが英語になり、レビュアーが読める。拡張は英語ラベル「Paste from Markdown」に対応済みなので動作に影響なし
- [ ] メールアドレスの映り込み方針を決める。推奨は**前回同様、編集でマスク**（同意画面・Docs右上に出る）。マスク箇所: 同意画面のアカウント表示、Docs/Drive右上のアバターメニューを開かない運用でも可
- [ ] **既存のアクセス権を取り消す**（[myaccount.google.com/permissions](https://myaccount.google.com/permissions) → GWS Tweaks → Remove access）。同意画面を最初から見せるため。より確実にするなら拡張を一度削除し、シーン1でStoreから再インストールする（フレッシュな状態が保証され、インストール手順の実演にもなる）

### 素材

- [ ] Google Driveに**英語名のフォルダー階層**を用意（例: `My Drive > Projects > GWS Tweaks Demo`）し、その中にデモ用ドキュメント `Demo Document` を作成
- [ ] デモ用ドキュメントに数段落のテキストと箇条書き（ネスト2段）を入れておく（魔法の杖の適用前後が分かるように）
- [ ] Docsの **Tools → Preferences → 「Enable Markdown」をON**（マークダウン貼り付けに必要）
- [ ] コピー用のマークダウンテキストをメモアプリ等に用意。例:

  ```markdown
  # Meeting Notes

  ## Agenda

  - Review **Q3 results**
  - Discuss [roadmap](https://example.com)
    - Mobile app
    - API v2

  1. Opening
  2. Main discussion
  3. Wrap-up
  ```

- [ ] 拡張の設定画面で書式のデフォルト値を**Docsの標準と明確に違う値**にしておく（例: フォント Comic Sans MS や Courier New、サイズ 14pt、行間 1.5、インデント幅 24pt、ページ分けなしON）。適用の変化が一目で分かる

### 録画環境

- [ ] ブックマークバー・通知・無関係なタブ/拡張アイコンを隠す（新規Chromeプロファイルか、シークレット許可済みプロファイルが楽）
- [ ] ウィンドウサイズは1280x800以上、録画はmacOSの `Cmd+Shift+5`（画面全体でなくウィンドウ指定推奨）
- [ ] 各シーンの操作前後に1〜2秒の静止を入れる（キャプションを読む時間）

## シーン構成（合計 約3分30秒）

キャプションは動画編集時に焼き込むか、YouTubeの字幕で付ける。**タイムスタンプは編集後に確定し、`docs/oauth-verification.md` の返信ドラフトの `00:xx` に転記する。**

### シーン1: Store掲載ページ（0:00–0:20）

- Chrome ウェブストアの掲載ページを開く。**URLバーに拡張ID `clfdceeaohplokfalnmcdjibngfnijok` が見える状態**で2秒静止
- （拡張を削除してある場合）「Add to Chrome」→ 確認ダイアログ → インストール

> Caption: `GWS Tweaks — published on the Chrome Web Store. Extension ID: clfdceeaohplokfalnmcdjibngfnijok`

### シーン2: インストール確認（0:20–0:35）

- `chrome://extensions` を開き、GWS TweaksのカードでIDがStore版と一致していることを見せる（「Details」を開くとIDが表示される）

> Caption: `The same extension ID as the Web Store listing`

### シーン3: 設定画面（0:35–1:00)

- 拡張の設定画面を開く（`chrome://extensions` → Details → Extension options）
- 3機能のON/OFFトグルをゆっくりスクロールで見せる
- ドキュメント初期設定の書式値（フォント・サイズ・行間・インデント・ページ分けなし）を見せる

> Caption: `Options page — three features, each can be toggled individually. These formatting defaults are applied by the one-click feature.`

### シーン4: OAuth同意画面（1:00–1:50）★最重要

- Google Docsで `Demo Document` を開く
- メニューバー下の認証を促すバーをクリック → 同意画面が開く
- **同意画面を全画面で映し、アプリ名と2つの権限テキストが両方読めるようゆっくりスクロール。3秒以上静止**
  - `See information about your Google Drive files`（drive.metadata.readonly）
  - `See, edit, create, and delete all your Google Docs documents`（documents）
- 未検証警告（`Google hasn't verified this app`）が出た場合はそのまま映し、`Advanced` → `Go to ...` で進む（検証中なので出て当然。隠さない）
- `Continue` / `Allow` をクリック

> Caption: `OAuth consent screen — the app requests exactly two scopes: drive.metadata.readonly and documents. (The unverified-app warning appears because this verification is still in progress.)`

### シーン5: フォルダーパス表示 = drive.metadata.readonly の実演（1:50–2:20）

- 認証直後、メニューバー下にパンくず `My Drive > Projects > GWS Tweaks Demo` が表示される
- パンくずの `GWS Tweaks Demo` をクリック → Google Driveの当該フォルダーが新しいタブで開き、`Demo Document` がその中にあることが見える

> Caption: `Scope: drive.metadata.readonly — the extension reads only the name and parent folders of the open file to render this breadcrumb. Clicking opens the folder in Drive.`

### シーン6: ワンクリック書式適用 = documents の実演（2:20–3:00）

- ドキュメントに戻り、適用前の状態（標準フォント・ページ分けあり）を2秒見せる
- タイトル横の**魔法の杖アイコン**をクリック
- フォント・サイズ・行間・インデント・ページ分けなしが一括で変わる様子を見せ、アイコンが**緑のチェック**になるところまで映す
- 数段落を選択してフォント名・サイズがツールバーに反映されていることを見せると変化が明確

> Caption: `Scope: documents — one click applies the user's preferred font, size, line spacing, list indent width and pageless mode via the Docs API. No document text is read or stored.`

### シーン7: マークダウン貼り付け（3:00–3:20）

- 用意したマークダウンをコピーし、ドキュメント上で `Cmd+V`
- 見出し・箇条書き・リンクに変換されて貼り付くところを見せる

> Caption: `Bonus feature: Cmd+V pastes Markdown as formatted text. This feature uses no Google API scopes.`

### シーン8: アクセス権の取り消し（3:20–3:35）

- [myaccount.google.com/permissions](https://myaccount.google.com/permissions) を開き、GWS Tweaksの項目と `Remove access` ボタンを見せる（クリックはしない）

> Caption: `Users can revoke the extension's access at any time from their Google Account settings.`

## 撮影後

1. 編集（メールアドレスのマスク、キャプション焼き込み、静止区間の調整）
2. YouTubeに**限定公開**でアップロード
3. 確定したタイムスタンプと動画URLを `docs/oauth-verification.md` の返信ドラフト（`00:xx` / `https://youtu.be/xxxx`）に転記
4. 返信メールを送信
