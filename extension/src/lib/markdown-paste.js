// Cmd+Vを「マークダウンから貼り付け」に差し替える機能で使う純粋ロジック。
(function (root) {
  'use strict';

  // 編集メニュー項目ラベルの判定。項目テキストには
  // ニーモニック「(Q)」やショートカット表記が含まれることがある。
  function isMarkdownPasteLabel(text) {
    const t = (text || '').trim();
    return t.includes('マークダウンから貼り付け') || /paste from markdown/i.test(t);
  }

  // 貼り付けテキストがマークダウンらしいかのヒューリスティック判定。
  // シグナルの種類ごとにスコアを加算し、合計2以上でマークダウンとみなす。
  // 強いシグナル（それ単独で確定）は2、プレーンテキストにも現れがちな
  // 弱いシグナル（箇条書き1行・引用・インラインコードなど）は1として、
  // 誤爆しやすいものは単独では発動しないようにしている。
  function isLikelyMarkdown(text) {
    if (!text) {
      return false;
    }
    const t = String(text).replace(/\r\n?/g, '\n');
    const lines = t.split('\n');
    const countLines = (re) => lines.filter((line) => re.test(line)).length;

    let score = 0;

    // 見出し（#の後にスペース必須。ハッシュタグは除外される）
    if (countLines(/^\s{0,3}#{1,6}\s+\S/) > 0) {
      score += 2;
    }
    // コードフェンス
    if (countLines(/^\s*```/) > 0) {
      score += 2;
    }
    // テーブルの区切り行（| と - だけで構成される行）
    if (
      lines.some(
        (line) => /^\s*[|:\s-]+\s*$/.test(line) && line.includes('|') && /-{3,}/.test(line)
      )
    ) {
      score += 2;
    }
    // リンク・画像記法
    if (/\[[^\]\n]+\]\([^)\s]+\)/.test(t)) {
      score += 2;
    }
    // 太字（**の内側は空白で始まらない・終わらない）
    if (/\*\*\S(?:[^*\n]*\S)?\*\*/.test(t)) {
      score += 2;
    }
    // 箇条書き。1行だけならプレーンテキストの可能性が高いので弱いシグナル扱い
    const bulletLines = countLines(/^\s*[-*+]\s+\S/);
    if (bulletLines >= 2) {
      score += 2;
    } else if (bulletLines === 1) {
      score += 1;
    }
    // 番号付きリスト。「1. 会議室の予約」のような1行は対象にしない
    if (countLines(/^\s*\d{1,3}\.\s+\S/) >= 2) {
      score += 2;
    }
    // 引用。プレーンテキストのメール返信でも使われるため弱いシグナル
    if (countLines(/^>\s*\S/) > 0) {
      score += 1;
    }
    // インラインコード
    if (/`[^`\n]+`/.test(t)) {
      score += 1;
    }
    // 打ち消し線
    if (/~~\S(?:[^~\n]*\S)?~~/.test(t)) {
      score += 1;
    }

    return score >= 2;
  }

  root.GWSTweaks = Object.assign(root.GWSTweaks || {}, {
    isMarkdownPasteLabel,
    isLikelyMarkdown,
  });
})(globalThis);
