/* ============================================================
   開発事例レンダラー（cases.html）
   js/cases-data.js の CASES_DATA を #casesGrid に描画します。
   事例の追加・修正は cases-data.js 側だけで完結します。
   ============================================================ */
(function () {
  "use strict";

  const grid = document.getElementById("casesGrid");
  if (!grid || typeof CASES_DATA === "undefined") return;

  /** HTMLとして解釈されないよう特殊文字をエスケープする */
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** 1件の事例オブジェクトからカードのHTMLを生成する */
  function renderCase(c) {
    const rows = (c.rows || [])
      .map((row) => {
        const cls = row.effect ? "case-row case-row--effect" : "case-row";
        return '<div class="' + cls + '"><dt>' + esc(row.label) + "</dt><dd>" + esc(row.text) + "</dd></div>";
      })
      .join("");

    let foot = "";
    if (c.demo) {
      foot =
        '<div class="case-foot">' +
        '<p class="demo-tag">提案デモ画面</p><br />' +
        '<a href="' + esc(c.demo) + '" class="btn btn--outline">デモ画面を見る<span class="btn__arrow">→</span></a>' +
        "</div>";
    } else if (c.cta) {
      const btnClass = c.cta.primary ? "btn btn--primary" : "btn btn--outline";
      foot =
        '<div class="case-foot">' +
        '<a href="' + esc(c.cta.href) + '" class="' + btnClass + '">' + esc(c.cta.label) + '<span class="btn__arrow">→</span></a>' +
        "</div>";
    }

    return (
      '<article class="card case-card reveal">' +
      '<span class="case-tag">' + esc(c.tag) + "</span>" +
      '<h3 class="card__title">' + esc(c.title) + "</h3>" +
      '<p class="card__role">' + esc(c.role) + "</p>" +
      '<dl class="case-rows">' + rows + "</dl>" +
      foot +
      "</article>"
    );
  }

  grid.innerHTML = CASES_DATA.map(renderCase).join("");
})();
