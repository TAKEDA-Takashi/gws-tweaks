# OAuth検証（Google Third-Party Data Safety Team）対応

2026-08-03に受領した審査結果への対応をまとめる。Cloud Consoleに貼り付ける英文と、返信メールのドラフトを含む。

## 指摘事項と対応状況

| # | 指摘 | 対応 | 状態 |
|---|---|---|---|
| 1 | ホームページ・プライバシーポリシーが第三者ホスティング（github.io）にある | `gws-tweaks.matsutake.dev` へ移行。Search Consoleのドメインプロパティ確認・GCPのURL差し替え・承認済みドメイン追加・StoreのURL差し替えまで完了 | **完了**（2026-08-04） |
| 2 | デモ動画が機能を十分に示していない | 同意画面のスコープ表示＋全機能の実演を撮り直し | 要作業（撮影台本: `docs/demo-video-script.md`） |
| 3 | プライバシーポリシーに機微データの保護策の記載がない | `PRIVACY.md` に「データの保護」を追加 | 完了 |
| 4 | プライバシーポリシーに保持・削除の記載がない | `PRIVACY.md` に「データの保持と削除」を追加 | 完了 |
| 5 | スコープの正当化が不十分 | 下記の英文をCloud Consoleに貼り付け | **完了**（2026-08-04） |
| 6 | スコープ不一致（Console と実際のリクエストが一致しているか） | Console の Data Access 画面を `manifest.json` の2スコープと突き合わせ | **完了**（2026-08-04） |
| 7 | テスト用認証情報・操作手順の提供 | ログイン不要のためストアからのインストール手順を返信に記載 | 文面作成済み |

残タスク: デモ動画の撮影・アップロード → 返信メールの `xx`（動画URL・タイムスタンプ・プロジェクトID・署名）を埋めて送信。

## ドメイン移行手順（指摘1）

github.io は Public Suffix List に載っているため、Search Consoleで「ドメインプロパティ」として所有権を確認できない（URLプレフィックスのみ）。前回の再審査請求でこの事情を説明したが認められず、今回の返答で明示的にドメイン移行を指示された。**`matsutake.dev` を取得済み（2026-08-04）。サイトは `gws-tweaks.matsutake.dev` に置く**（apexは将来の別用途のために空けておく）。

- 新ホームページ: `https://gws-tweaks.matsutake.dev/`
- 新プライバシーポリシー: `https://gws-tweaks.matsutake.dev/privacy/`
- `.dev` TLDはHSTSプリロード済みのため全ページ強制HTTPS（GitHub Pagesの「Enforce HTTPS」と整合）

手順（リポジトリ側の 1・4・8 は対応済み）:

1. ~~`CNAME` ファイルをリポジトリルートに作成~~（済: 内容 `gws-tweaks.matsutake.dev`）
2. **DNSレコードを設定** — `gws-tweaks.matsutake.dev` の CNAMEレコード → `takeda-takashi.github.io`。Cloudflare DNSを使う場合はプロキシ（オレンジ雲）をOFFにする（GitHub Pagesの証明書発行が失敗するため）
3. **GitHub Pagesの設定確認** — リポジトリの Settings → Pages → Custom domain に `gws-tweaks.matsutake.dev` が表示されていることを確認（`CNAME` ファイルのpushで自動反映される。されない場合は手で入力）。DNS反映後に「Enforce HTTPS」をON（証明書発行に数分〜1時間程度かかる）
4. ~~`index.md` のプライバシーポリシーへのリンクを `/privacy/` に修正~~（済。カスタムドメインではサイトのルートが `/` になるため）
5. **Search Consoleでドメインプロパティを追加** — プロパティ名 `matsutake.dev`（サブドメインを含む全体をカバー）。DNSのTXTレコードで所有権を確認する
6. **Cloud Consoleを更新** — OAuth同意画面（ブランディング）の「アプリケーションのホームページ」「プライバシーポリシー」URLを上記の新URLに差し替え、「承認済みドメイン」に `matsutake.dev` を追加する
7. **Chrome ウェブストアの掲載情報**のプライバシーポリシーURLも差し替える
8. ~~`docs/store-publishing.md` のURLを更新~~（済。`README.md` にはURL記載なし）

> - 旧URL `https://takeda-takashi.github.io/gws-tweaks/` はGitHub Pagesが新ドメインへ自動リダイレクトするため、Store掲載中の旧URLも移行中に壊れない
> - 既存の `takeda-takashi.github.io`（ユーザーサイト）と `googlee3740b880df84495.html` は、新ドメインでの検証が完了するまで削除しないこと
> - 承認済みドメインの自動チェックは、Search Consoleのドメインプロパティ確認が済んでいれば通る見込み。通れば再審査請求（手動確認）は不要

## スコープ不一致の確認（指摘6）

Cloud Console → Data Access（データアクセス）画面に登録されているスコープが、`extension/manifest.json` の `oauth2.scopes` と**文字列レベルで完全一致**しているか確認する。現在リクエストしているのは次の2つのみ。

```
https://www.googleapis.com/auth/drive.metadata.readonly
https://www.googleapis.com/auth/documents
```

Console側に `userinfo.email` / `openid` などが残っている場合は削除する（同意画面に表示されるがコードが要求していないスコープは「不一致」と判定される）。逆にConsoleに登録されていないスコープをコードが要求している場合も不一致になる。

## スコープの正当化（指摘5・Cloud Consoleに貼り付ける英文）

Googleの求めているのは「バックエンドの処理」ではなく「そのスコープを使うユーザー向け機能の最大範囲」の説明。以下をそのまま各スコープの justification 欄に入力する。

### `https://www.googleapis.com/auth/drive.metadata.readonly`

```
FEATURE: "Folder path breadcrumb"

GWS Tweaks displays the Google Drive folder path of the file the user
currently has open, as a clickable breadcrumb inside the Google Docs /
Sheets / Slides editor. The native editor UI does not show where the open
file is stored, so users have to leave the document and search Drive to
find out.

USER-FACING FLOW (shown in the demo video at 00:xx):
1. The user opens a file on docs.google.com.
2. The extension's content script inserts a 24px bar directly under the
   menu bar.
3. The service worker calls
   GET drive/v3/files/{fileId}?fields=name,parents for the open file, then
   repeats that call for each returned parent ID until it reaches My Drive
   or a shared drive root.
4. The folder names are rendered as a breadcrumb, e.g.
   "My Drive > Projects > 2026". Clicking a crumb opens that folder in
   Google Drive in a new tab.

MAXIMUM EXTENT OF ACCESS: the extension reads only the "name" and
"parents" fields, only for the single file the user has open and for that
file's ancestor folders. It never lists, searches or enumerates the user's
Drive, never reads file content, and never writes anything.

WHY A NARROWER SCOPE IS NOT SUFFICIENT:
- drive.file grants access only to files created by the app or explicitly
  chosen by the user through the Google Picker. The breadcrumb must appear
  automatically for whichever file the user already opened in the Docs UI,
  and it must resolve that file's ancestor folders, which the user never
  selects. A Picker step for every document and every folder in the chain
  would remove the entire benefit of the feature.
- drive.metadata.readonly is the narrowest read-only scope that returns the
  "parents" field. drive.appdata does not expose it. drive.readonly and
  drive are strictly broader because they also grant access to file
  content.

DATA HANDLING: folder names are rendered in the page and cached in
chrome.storage.session (in-memory, 5 minutes, cleared when the browser
closes). Nothing is sent to any server other than Google's own APIs; the
developer operates no server at all.
```

### `https://www.googleapis.com/auth/documents`

```
FEATURE: "One-click document defaults"

GWS Tweaks adds a magic-wand button next to the document title in Google
Docs that applies the user's preferred document defaults (font family,
font size, line spacing, list indent width, and pageless mode) in a single
click. Users who create many documents otherwise repeat the same five
manual formatting steps every time.

USER-FACING FLOW (shown in the demo video at 00:xx):
1. The user sets their preferred defaults on the extension's options page.
2. The user opens a Google Doc and clicks the magic-wand icon in the title
   bar.
3. The extension calls documents.get to read structural information: the
   end index of the body, and for each paragraph its bullet nesting level
   and current indent values.
4. It then calls documents.batchUpdate with updateDocumentStyle
   (documentFormat.documentMode = PAGELESS), updateTextStyle (font family
   and size) and updateParagraphStyle (line spacing, indentStart,
   indentFirstLine).
5. The icon turns into a green check mark to confirm the result.

MAXIMUM EXTENT OF ACCESS: only the document the user is currently viewing,
and only in response to an explicit click on the button. The extension
reads structural metadata (indices, nesting levels, indent values); it does
not read, transmit or store the text of the document. It writes only
formatting properties, and never creates, deletes, shares or lists
documents.

WHY A NARROWER SCOPE IS NOT SUFFICIENT: the Google Docs API provides no
formatting-only scope. documents.readonly cannot call batchUpdate, which is
required to apply the formatting. drive.file would limit access to files
created by the app or chosen through the Google Picker, which cannot serve
a button that acts on the document the user already has open in the Docs
UI.

DATA HANDLING: documents.get responses are processed in memory in the
extension's service worker and discarded once the batchUpdate request has
been built. Nothing is persisted and nothing is sent to any server other
than Google's own APIs; the developer operates no server at all.
```

## デモ動画の台本（指摘2）

前回の動画（64秒）は短く、同意画面のスコープ表示と各機能の対応が不十分と判断された。目安3〜4分、画面録画＋英語字幕、YouTubeの限定公開でアップロードする。**録画前にGoogleアカウント設定から既存のアクセス権を取り消しておく**（同意画面を最初から見せるため）。

| 場面 | 見せるもの | 目的 |
|---|---|---|
| 1 | Chrome ウェブストアの掲載ページ（URLバーに拡張ID `clfdceeaohplokfalnmcdjibngfnijok` が見える状態） | アプリの同一性 |
| 2 | `chrome://extensions` でGWS Tweaksがインストール済み・IDが一致していること | 同上 |
| 3 | 拡張機能の設定画面（3機能のON/OFF、書式のデフォルト設定） | 機能の全体像 |
| 4 | Googleドキュメントを開く → 認証を促すUI → **OAuth同意画面を全画面で表示し、2つの権限テキストが両方読めるようスクロール**。アプリ名も映す。「許可」を押す | **最重要**。要求スコープとConsole設定の一致を示す |
| 5 | パンくずが表示される → フォルダー名をクリック → Google Driveの当該フォルダーが開く | `drive.metadata.readonly` の実演 |
| 6 | 魔法の杖アイコンをクリック → フォント・サイズ・行間・インデント・ページ分けなしが一括適用される様子（適用前後が分かるように） | `documents` の実演 |
| 7 | Cmd+Vでマークダウン貼り付け（スコープ不要の機能） | 機能の網羅 |
| 8 | `myaccount.google.com/permissions` でアクセス権を取り消せることを表示 | 削除・取り消し手段の提示 |

各場面の冒頭に英語のキャプション（例: `Scope demonstrated: drive.metadata.readonly`）を入れると、レビュアーがスコープと機能の対応を追いやすい。

## 返信メールのドラフト（英文）

**2026-08-06追記**: T&Sから2通目の指摘（デモ動画がスコープの必要性を十分に示していない）を受け、シーン4（同意フロー・両スコープの詳細展開）・5（パンくず網羅・約60秒）・6（杖のbefore/after・リロードで保存確認・約60秒）を撮り直した新動画（5:00）を作成済み。**YouTubeに限定公開で再アップロードし、下記4項のURLを差し替えてから、2通目のメールに返信する**。下記の文面は2通目への返信としてもそのまま使える（全項目の最新状態を報告する形）。

**送信タイミング**: 待たずに送ってよい。Cloud Consoleのブランドチェック非準拠バッジ（「OAuth同意画面のアプリ名とホームページのアプリ名が一致していません」）は、[Googleのヘルプ](https://support.google.com/cloud/answer/13804963)によれば**修正後に検証リクエストを再提出（またはメール返信）したときに審査側で再評価される**ものであり、ページ修正を放置クロールで検知して自動的に消える仕組みではない（バッジ解消を待ってから返信すると、返信しないと再評価されないためデッドロックになる）。原因だったページタイトルのタグライン混入は2026-08-04に修正済み（`_config.yml` の `description: ""`）で、ホームページ側は `<title>`・`og:title`・`<h1>` すべて「GWS Tweaks」に一致済みを確認済み。下記の8項に再評価依頼を含めた完成版をそのまま送信する。

```
Subject: Re: OAuth verification – GWS Tweaks (Project: chrome-extensions-502707)

Hello,

Thank you for the detailed review. I have addressed every item below.

1. HOMEPAGE AND PRIVACY POLICY ON AN OWNED DOMAIN
   Both pages have been moved to matsutake.dev, a domain I own and have
   verified in Google Search Console (domain property, DNS TXT record):
   - Homepage:       https://gws-tweaks.matsutake.dev/
   - Privacy policy: https://gws-tweaks.matsutake.dev/privacy/
   The Cloud Console OAuth consent screen has been updated with these URLs
   and matsutake.dev has been added to the authorized domains list.

2. PRIVACY POLICY – DATA PROTECTION MECHANISMS
   The privacy policy now contains a "Data protection" section describing:
   TLS for all API traffic; OAuth access tokens handled by Chrome's
   chrome.identity API and never written to disk by the extension;
   least-privilege scopes; all processing performed on the user's device
   with no developer-operated server; no remote code execution; Chrome
   extension sandbox isolation; and publicly auditable source code.

3. PRIVACY POLICY – RETENTION AND DELETION
   The privacy policy now contains a "Data retention and deletion" section
   with a per-data-type table (storage location, retention period, deletion
   method): Drive folder names are cached in chrome.storage.session
   (in-memory, 5 minutes, cleared when the browser closes); Docs structural
   data is processed in memory and never stored; access tokens are managed
   by Chrome and revocable at myaccount.google.com/permissions; user
   settings live in chrome.storage.sync and are removed when the extension
   is uninstalled. No Google user data is retained by the developer, as the
   application has no server component.

4. DEMONSTRATION VIDEO
   A new, more comprehensive video (unlisted, 5 min 00 s): [新URLに差し替え]
   It demonstrates the full operational functionality of both requested
   scopes, shows the consent screen with each scope's access details
   fully expanded and readable, and shows that the changes made by the
   app are persisted to the document in the user's Google account.
   - 0:00  Chrome Web Store listing (extension ID visible in the URL)
   - 0:20  chrome://extensions – installed extension ID matches the listing
   - 0:34  Options page (feature toggles and formatting defaults)
   - 0:54  OAuth consent flow, shown unedited including the
           unverified-app warning. "See access details" is clicked for
           both scopes so the full access details are displayed on
           screen (drive.metadata.readonly at 1:21, documents at 1:31);
           both scopes are then selected and granted, and the folder
           breadcrumb renders immediately after consent
   - 2:12  drive.metadata.readonly – full feature demo: the folder
           breadcrumb on two documents in different folders (4-level and
           3-level paths); clicking a crumb opens that folder in Google
           Drive
   - 3:16  documents – full feature demo: the document is shown before
           (Google Docs default formatting), one click applies font,
           size, line spacing, indent width and pageless mode, and the
           document is then reloaded to show the changes were saved to
           the user's account (Source Account Impact)
   - 4:20  Bonus feature that uses no Google API scopes (Markdown paste)
   - 4:45  Where users can revoke access (Google Account linked apps)

5. SCOPE JUSTIFICATION
   Updated in Cloud Console for both scopes. In short:
   - drive.metadata.readonly is used to read only the "name" and "parents"
     fields of the file the user currently has open and of its ancestor
     folders, in order to render a clickable folder breadcrumb inside the
     Docs/Sheets/Slides editor. drive.file cannot be used because the
     feature must work on whatever file the user already opened, and must
     resolve ancestor folders the user never selects through the Picker.
   - documents is used to read structural metadata (body end index, bullet
     nesting levels, indent values) and to call batchUpdate to apply the
     user's preferred font, size, line spacing, indent width and pageless
     mode with one click. documents.readonly cannot call batchUpdate, and
     the Docs API offers no formatting-only scope.
   Neither feature reads document text, and no data is transmitted anywhere
   other than Google's own APIs.

6. SCOPE DISCREPANCY
   The application requests exactly these two scopes and no others, as
   declared in the extension manifest:
     https://www.googleapis.com/auth/drive.metadata.readonly
     https://www.googleapis.com/auth/documents
   The Data Access configuration in Cloud Console now matches these strings
   exactly, and both are shown on the consent screen in the video.

7. TEST CREDENTIALS AND NAVIGATION INSTRUCTIONS
   The application requires no account of its own and has no login, paywall
   or pre-configured environment. It is published on the Chrome Web Store
   and can be tested with any Google account:

   1. Install "GWS Tweaks" from
      https://chrome.google.com/webstore/detail/clfdceeaohplokfalnmcdjibngfnijok
   2. Open any Google Doc at https://docs.google.com/document/
   3. A folder-path bar appears under the menu bar. The first time, click
      it to sign in; the OAuth consent screen appears. Click "Allow".
      -> The breadcrumb now shows the file's Drive folder path. Clicking a
         folder name opens that folder in Google Drive.
         (demonstrates drive.metadata.readonly)
   4. Click the magic-wand icon next to the document title.
      -> The font, font size, line spacing, list indent width and pageless
         mode configured in the extension options are applied to the
         document, and the icon turns into a green check mark.
         (demonstrates documents)
   5. Optional: open the extension's options page from chrome://extensions
      to change the defaults applied in step 4.

   The source code is public at
   https://github.com/TAKEDA-Takashi/gws-tweaks if you would like to
   confirm the API calls made.

8. BRANDING CHECK SHOWN IN CLOUD CONSOLE
   The Cloud Console currently flags "the app name on the homepage does
   not match the OAuth consent screen". This referred to an auto-generated
   tagline in the homepage's HTML title, which was removed on Aug 4. The
   homepage now displays the exact app name "GWS Tweaks" in its title,
   heading and metadata, matching the consent screen. Since this flag
   appears to be re-evaluated as part of the review, I would appreciate it
   if you could re-run the branding check against the current homepage.

Please let me know if anything further is needed.

Best regards,
Takashi Takeda
```
