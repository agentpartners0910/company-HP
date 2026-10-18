/* ============================================================
   AGENT PARTNERS - interactions (vanilla JS / 依存なし)
   ============================================================ */
(function () {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header scrolled / floating CTA ---------- */
  const header = document.getElementById("header");
  const floatCta = document.getElementById("floatCta");
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 24);
    if (floatCta) floatCta.classList.toggle("show", y > 700);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("nav");
  if (toggle && nav) {
    const close = () => { nav.classList.remove("open"); toggle.classList.remove("open"); };
    toggle.addEventListener("click", () => { nav.classList.toggle("open"); toggle.classList.toggle("open"); });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add("in"), Math.min(i * 60, 240));
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Count-up ---------- */
  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && !reduced) {
    const cio = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target, target = parseInt(el.dataset.count, 10) || 0, dur = 1500, t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Hero motif: connected nodes ----------
     ロゴの「つながり」を象徴する上品なネットワーク。
     v2.0：ディープネイビー面に合わせ、密度を落として繊細に。
     白×抑制ゴールドの細い線で「先進性は動きの質で」表現する。 */
  const canvas = document.getElementById("network");
  if (canvas && canvas.getContext && !reduced) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, nodes, raf;
    const mouse = { x: -9999, y: -9999 };
    const GOLD = "rgba(201,174,110,";  // 抑制ゴールド（濃紺面で一点の光）
    const WHITE = "rgba(255,255,255,"; // 白（繊細な線）

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(Math.floor((w * h) / 26000), 56);
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.7,
        gold: Math.random() < 0.22,
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const LINK = 140;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 130) { n.x += (dx / d) * 0.7; n.y += (dy / d) * 0.7; }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = (n.gold ? GOLD : WHITE) + (n.gold ? "0.85)" : "0.55)");
        ctx.fill();
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j], ddx = n.x - m.x, ddy = n.y - m.y, dist = Math.hypot(ddx, ddy);
          if (dist < LINK) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
            const gold = n.gold || m.gold;
            ctx.strokeStyle = (gold ? GOLD : WHITE) + ((1 - dist / LINK) * (gold ? 0.30 : 0.18)) + ")";
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    const host = canvas.closest(".hero") || canvas.parentElement;
    host.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    host.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(size, 200); });
    size(); draw();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { if (!raf) draw(); } else { cancelAnimationFrame(raf); raf = null; }
      }), { threshold: 0 }).observe(host);
    }
  }

  /* ---------- Term tooltips ---------- */
  document.querySelectorAll(".note[data-tip]").forEach((el) => el.setAttribute("title", el.dataset.tip));

  /* ---------- Contact form (front-end demo) ---------- */
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = form.querySelector("#formMsg");
      if (ok) { ok.hidden = false; ok.scrollIntoView({ behavior: "smooth", block: "center" }); }
      form.reset();
    });
  }
})();
