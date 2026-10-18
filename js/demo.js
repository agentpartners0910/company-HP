/* ============================================================
   AGENT PARTNERS - 提案デモ画面 共通スクリプト
   左サイドメニューのボタン押下で、画面（スクリーン）を切り替える。
   依存なし（vanilla JS）。
   ============================================================ */
(function () {
  "use strict";

  var links = Array.prototype.slice.call(document.querySelectorAll(".side-link[data-screen]"));
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  if (!links.length || !screens.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(id) {
    var found = false;
    screens.forEach(function (s) {
      var match = s.id === id;
      s.hidden = !match;
      if (match) found = true;
    });
    if (!found) return;
    links.forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("data-screen") === id);
      if (l.getAttribute("data-screen") === id) {
        l.setAttribute("aria-current", "page");
      } else {
        l.removeAttribute("aria-current");
      }
    });
    // 画面遷移後は先頭へ
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  links.forEach(function (l) {
    l.addEventListener("click", function () {
      show(l.getAttribute("data-screen"));
    });
  });
})();
