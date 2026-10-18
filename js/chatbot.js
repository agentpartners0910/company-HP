/* ============================================================
   AGENT PARTNERS - FAQ Chatbot（自己完結ウィジェット / 依存なし）
   - DOMはこのスクリプトが生成（既存ページのHTMLは編集不要）
   - window.AP_FAQ（faq-data.js）を知識ベースとして照合
   - バックエンド不要のキーワード・スコアリング方式
   ============================================================ */
(function (w, d) {
  "use strict";
  if (!w.AP_FAQ) { return; } // データ未読み込みなら何もしない
  if (w.matchMedia && false) {} // placeholder

  /* ---------- テキスト正規化（日本語のゆれ吸収） ---------- */
  function normalize(s) {
    if (!s) return "";
    return s
      .toLowerCase()
      // 全角英数 → 半角
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      // カタカナ → ひらがな（簡易）
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      // 記号・空白除去
      .replace(/[\s　、。，．!！?？・…「」『』（）()【】\-_/.]/g, "");
  }

  /* ---------- 照合：質問文に最も合うQ&Aを採点 ---------- */
  function search(query) {
    const nq = normalize(query);
    if (!nq) return [];
    const results = w.AP_FAQ.map((item) => {
      let score = 0;
      // キーワード一致
      (item.keywords || []).forEach((k) => {
        const nk = normalize(k);
        if (nk && nq.indexOf(nk) !== -1) score += Math.min(nk.length, 4) + 2;
      });
      // 質問文との部分一致（短い語が質問に含まれる度合い）
      const nQ = normalize(item.q);
      for (let i = 0; i < nq.length - 1; i++) {
        const bi = nq.substr(i, 2);
        if (nQ.indexOf(bi) !== -1) score += 0.4;
      }
      return { item, score };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    return results;
  }

  /* ---------- 入力ログ（管理画面 admin.html 用） ----------
     保存先は2系統に同時書き込み:
       1) サーバーの簡易ファイルDB（NDJSON） … LOG_ENDPOINT へPOST。全訪問者分を集約。
       2) ブラウザ localStorage           … サーバー未起動/オフライン時のフォールバック。
     server/server.js が同一オリジンで配信している前提のため、相対パスで指定。
     静的(file://)で開いた場合は 1) は失敗し 2) のみ記録される（デグレなし）。 */
  const LOG_KEY = "ap_chat_logs";
  const LOG_MAX = 1000;                   // localStorage 保持上限（古いものから破棄）
  const LOG_ENDPOINT = "/api/chat-log";   // サーバーDBのPOST受け口（null で無効化可）

  function logQuery(text, source, matched, matchedId, score) {
    const entry = {
      t: new Date().toISOString(),
      page: location.pathname.split("/").pop() || "index.html",
      q: String(text || ""),
      source: source || "input",
      matched: !!matched,
      id: matchedId || null,
      score: typeof score === "number" ? score : null,
    };
    try {
      const arr = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      arr.push(entry);
      const trimmed = arr.length > LOG_MAX ? arr.slice(arr.length - LOG_MAX) : arr;
      localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
    } catch (_) { /* プライベートモード等で不可なら握りつぶす */ }
    if (LOG_ENDPOINT) {
      try {
        const body = JSON.stringify(entry);
        if (navigator.sendBeacon) { navigator.sendBeacon(LOG_ENDPOINT, body); }
        else { fetch(LOG_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }); }
      } catch (_) {}
    }
  }

  /* ---------- DOM 構築 ---------- */
  const root = d.createElement("div");
  root.className = "apbot";
  root.innerHTML = `
    <button class="apbot__launcher" id="apbotLauncher" aria-label="チャットで質問する" aria-expanded="false">
      <span class="apbot__launcher-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.9-5.2A8.5 8.5 0 1 1 21 11.5z"/>
        </svg>
      </span>
      <span class="apbot__launcher-label">質問する</span>
    </button>

    <section class="apbot__panel" id="apbotPanel" role="dialog" aria-label="FAQチャット" aria-hidden="true">
      <header class="apbot__head">
        <div class="apbot__head-info">
          <span class="apbot__avatar" aria-hidden="true"></span>
          <div>
            <p class="apbot__title">AIサポート（FAQ）</p>
            <p class="apbot__status">よくあるご質問にお答えします</p>
          </div>
        </div>
        <button class="apbot__close" id="apbotClose" aria-label="閉じる">×</button>
      </header>
      <div class="apbot__log" id="apbotLog" aria-live="polite"></div>
      <form class="apbot__inputbar" id="apbotForm" autocomplete="off">
        <input class="apbot__input" id="apbotInput" type="text" placeholder="質問を入力してください…" aria-label="質問を入力" />
        <button class="apbot__send" type="submit" aria-label="送信">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
      <p class="apbot__disclaimer">※ 自動応答です。詳しくは<a href="contact.html">お問い合わせ</a>ください。</p>
    </section>
  `;
  d.body.appendChild(root);

  const launcher = d.getElementById("apbotLauncher");
  const panel = d.getElementById("apbotPanel");
  const closeBtn = d.getElementById("apbotClose");
  const log = d.getElementById("apbotLog");
  const form = d.getElementById("apbotForm");
  const input = d.getElementById("apbotInput");

  /* ---------- メッセージ描画 ---------- */
  function scrollLog() { log.scrollTop = log.scrollHeight; }

  function addUser(text) {
    const el = d.createElement("div");
    el.className = "apbot__msg apbot__msg--user";
    el.textContent = text;
    log.appendChild(el);
    scrollLog();
  }

  function addBot(html, opts) {
    opts = opts || {};
    const wrap = d.createElement("div");
    wrap.className = "apbot__msg apbot__msg--bot";
    const bubble = d.createElement("div");
    bubble.className = "apbot__bubble";
    bubble.innerHTML = html;
    wrap.appendChild(bubble);

    if (opts.links && opts.links.length) {
      const lk = d.createElement("div");
      lk.className = "apbot__links";
      opts.links.forEach((l) => {
        const a = d.createElement("a");
        a.href = l.href; a.className = "apbot__link"; a.textContent = l.label + " →";
        lk.appendChild(a);
      });
      wrap.appendChild(lk);
    }
    if (opts.chips && opts.chips.length) {
      const cw = d.createElement("div");
      cw.className = "apbot__chips";
      opts.chips.forEach((c) => {
        const b = d.createElement("button");
        b.type = "button"; b.className = "apbot__chip"; b.textContent = c.label;
        b.addEventListener("click", () => { c.onClick(); });
        cw.appendChild(b);
      });
      wrap.appendChild(cw);
    }
    log.appendChild(wrap);
    scrollLog();
  }

  function typingThen(cb) {
    const t = d.createElement("div");
    t.className = "apbot__msg apbot__msg--bot apbot__typing";
    t.innerHTML = '<div class="apbot__bubble"><span></span><span></span><span></span></div>';
    log.appendChild(t); scrollLog();
    setTimeout(() => { t.remove(); cb(); }, 450);
  }

  /* ---------- 回答ロジック ---------- */
  function answerFor(item) {
    addBot(item.a, { links: item.links });
  }

  // 定型質問（チップ/FAQページ）からの選択。入力としてログ記録する。
  function askItem(item, source) {
    addUser(item.q);
    logQuery(item.q, source || "suggest", true, item.id, null);
    typingThen(() => answerFor(item));
  }

  function suggestPopular() {
    const picks = ["q-where-start", "q-price", "q-free", "q-flow", "q-recruit"]
      .map((id) => w.AP_FAQ.find((x) => x.id === id)).filter(Boolean);
    addBot("こんにちは。エージェントパートナーズのAIサポートです。<br>ご質問を入力いただくか、下のボタンからお選びください。", {
      chips: picks.map((p) => ({ label: p.q, onClick: () => askItem(p, "suggest") })),
    });
  }

  function handle(query) {
    addUser(query);
    const results = search(query);
    const top = results[0];
    const matched = !!(top && top.score >= 2.2);
    logQuery(query, "input", matched, top ? top.item.id : null, top ? Math.round(top.score * 10) / 10 : 0);
    typingThen(() => {
      if (results.length && results[0].score >= 2.2) {
        answerFor(results[0].item);
        const related = results.slice(1, 3).filter((r) => r.score >= 1.5);
        if (related.length) {
          addBot("こちらも参考になりますか？", {
            chips: related.map((r) => ({ label: r.item.q, onClick: () => askItem(r.item, "related") })),
          });
        }
      } else if (results.length) {
        addBot("もしかして、こちらのご質問でしょうか？", {
          chips: results.slice(0, 3).map((r) => ({ label: r.item.q, onClick: () => askItem(r.item, "suggest") })),
        });
      } else {
        addBot(
          "申し訳ありません、うまくお答えを見つけられませんでした。<br>お手数ですが、担当者が直接ご回答します。お気軽にお問い合わせください。",
          {
            links: [{ label: "お問い合わせフォーム", href: "contact.html" }, { label: "FAQ一覧を見る", href: "faq.html" }],
            chips: w.AP_FAQ_CATEGORIES.slice(0, 4).map((c) => ({
              label: c.label,
              onClick: () => {
                addUser(c.label);
                typingThen(() => {
                  const items = w.AP_FAQ.filter((x) => x.cat === c.id);
                  addBot("「" + c.label + "」のよくある質問です。", {
                    chips: items.map((it) => ({ label: it.q, onClick: () => askItem(it, "category") })),
                  });
                });
              },
            })),
          }
        );
      }
    });
  }

  /* ---------- 開閉 ---------- */
  let opened = false;
  function open() {
    panel.classList.add("is-open");
    launcher.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    if (!opened) { opened = true; setTimeout(() => suggestPopular(), 250); }
    setTimeout(() => input.focus(), 300);
  }
  function close() {
    panel.classList.remove("is-open");
    launcher.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
  }
  launcher.addEventListener("click", () => (panel.classList.contains("is-open") ? close() : open()));
  closeBtn.addEventListener("click", close);
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) close(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = "";
    handle(v);
  });

  /* ---------- 外部API: FAQページから特定の質問を開く ---------- */
  w.APBot = {
    open: open,
    ask: function (id) {
      const item = w.AP_FAQ.find((x) => x.id === id);
      if (!item) return;
      open();
      setTimeout(() => askItem(item, "faq-page"), 400);
    },
  };
})(window, document);
