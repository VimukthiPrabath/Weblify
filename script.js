/**
 * Weblify — vanilla JavaScript
 * - Lucide icon hydration
 * - Intersection Observer scroll reveals
 * - Mobile navigation toggle
 * - Scroll progress + header state + section nav spy + back-to-top
 * - Full-page loader (load + fonts, min display time)
 * - Theme toggle (light / dark) + localStorage
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Lucide icons — replace [data-lucide] with SVG
  // ---------------------------------------------------------------------------

  function initLucide() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  }

  // ---------------------------------------------------------------------------
  // Scroll reveal via Intersection Observer
  // ---------------------------------------------------------------------------

  /**
   * Observes elements with reveal classes and toggles .is-visible when
   * they enter the viewport. Uses a modest rootMargin for earlier trigger.
   */
  function initScrollReveal() {
    /** @type {NodeListOf<HTMLElement>} */
    const nodes = document.querySelectorAll(".reveal, .reveal-delay");

    if (!nodes.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      nodes.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    const io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      }
    );

    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  // ---------------------------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------------------------

  function initMobileMenu() {
    const toggle = document.getElementById("menu-toggle");
    const panel = document.getElementById("mobile-menu");
    const openIcon = document.querySelector(".menu-icon-open");
    const closeIcon = document.querySelector(".menu-icon-close");

    if (!toggle || !panel) return;

    /**
     * @param {boolean} open
     */
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

      if (open) {
        panel.classList.remove("hidden");
        panel.removeAttribute("hidden");
        openIcon?.classList.add("hidden");
        closeIcon?.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
      } else {
        panel.classList.add("hidden");
        panel.setAttribute("hidden", "hidden");
        openIcon?.classList.remove("hidden");
        closeIcon?.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
      }

      initLucide();
    }

    toggle.addEventListener("click", function () {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    panel.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Scroll UX: progress bar, header shadow, nav spy, back-to-top
  // ---------------------------------------------------------------------------

  function initScrollUx() {
    const header = document.getElementById("site-header");
    const bar = document.getElementById("scroll-progress-bar");
    const backBtn = document.getElementById("back-to-top");
    const navLinks = document.querySelectorAll("a[data-nav-target]");
    const sectionIds = ["services", "work", "contact"];

    let ticking = false;

    function getScrollableHeight() {
      const el = document.documentElement;
      return Math.max(1, el.scrollHeight - el.clientHeight);
    }

    function updateProgress() {
      if (!bar) return;
      const max = getScrollableHeight();
      const p = Math.min(1, window.scrollY / max);
      bar.style.width = (p * 100).toFixed(2) + "%";
    }

    function updateHeader() {
      if (!header) return;
      if (window.scrollY > 12) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    }

    function updateBackToTop() {
      if (!backBtn) return;
      if (window.scrollY > 520) backBtn.classList.add("is-visible");
      else backBtn.classList.remove("is-visible");
    }

    function getActiveSectionId() {
      const threshold = window.innerHeight * 0.22;
      /** @type {string | null} */
      let active = null;
      sectionIds.forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top <= threshold) active = id;
      });
      return active;
    }

    function updateNavSpy() {
      const active = getActiveSectionId();
      navLinks.forEach(function (link) {
        const t = link.getAttribute("data-nav-target");
        if (t && t === active) link.classList.add("is-active");
        else link.classList.remove("is-active");
      });
    }

    function onScrollFrame() {
      updateProgress();
      updateHeader();
      updateBackToTop();
      updateNavSpy();
      ticking = false;
    }

    function requestTick() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(onScrollFrame);
    }

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick, { passive: true });

    if (backBtn) {
      backBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const main = document.getElementById("top");
        if (main) main.focus({ preventScroll: true });
      });
    }

    // Initial sync (e.g. mid-page refresh, hash navigation)
    onScrollFrame();
  }

  // ---------------------------------------------------------------------------
  // Full-page loader — waits for window load + fonts, with a minimum display time
  // ---------------------------------------------------------------------------

  function initPageLoader() {
    const root = document.documentElement;
    const loader = document.getElementById("page-loader");
    if (!loader) {
      root.classList.remove("is-booting");
      root.classList.add("is-app-ready");
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minMs = reduceMotion ? 0 : 820;
    const start = performance.now();
    let dismissed = false;

    function dismissLoader() {
      if (dismissed) return;
      dismissed = true;
      root.classList.remove("is-booting");
      root.classList.add("is-app-ready");
      loader.classList.add("page-loader--done");
      loader.setAttribute("aria-busy", "false");

      function onEnd(ev) {
        if (ev.propertyName !== "opacity") return;
        loader.removeEventListener("transitionend", onEnd);
        loader.setAttribute("aria-hidden", "true");
      }

      loader.addEventListener("transitionend", onEnd);
    }

    function scheduleDismiss() {
      const elapsed = performance.now() - start;
      const wait = Math.max(0, minMs - elapsed);
      window.setTimeout(dismissLoader, wait);
    }

    const skip = document.querySelector(".skip-link");
    if (skip) {
      skip.addEventListener(
        "click",
        function () {
          dismissLoader();
        },
        { once: true }
      );
    }

    const fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : Promise.resolve();

    Promise.all([
      new Promise(function (resolve) {
        if (document.readyState === "complete") resolve(null);
        else window.addEventListener("load", function () { resolve(null); }, { once: true });
      }),
      fontsReady,
    ]).then(scheduleDismiss);
  }

  // ---------------------------------------------------------------------------
  // Theme (light / dark) — Tailwind darkMode: class on <html>
  // ---------------------------------------------------------------------------

  var THEME_KEY = "weblify-theme";

  function syncThemeLabels() {
    var isDark = document.documentElement.classList.contains("dark");
    document.querySelectorAll(".theme-toggle-label").forEach(function (el) {
      el.textContent = isDark ? "Dark" : "Light";
    });
  }

  function initTheme() {
    var root = document.documentElement;

    function apply(mode) {
      if (mode === "light") root.classList.remove("dark");
      else root.classList.add("dark");
      try {
        localStorage.setItem(THEME_KEY, mode);
      } catch (e) {
        /* ignore */
      }
      syncThemeLabels();
      initLucide();
    }

    function toggle() {
      apply(root.classList.contains("dark") ? "light" : "dark");
    }

    var btn = document.getElementById("theme-toggle");
    var btnMobile = document.getElementById("theme-toggle-mobile");
    if (btn) btn.addEventListener("click", toggle);
    if (btnMobile) btnMobile.addEventListener("click", toggle);

    syncThemeLabels();
  }

  // ---------------------------------------------------------------------------
  // Footer dynamic year
  // ---------------------------------------------------------------------------

  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    initPageLoader();
    initYear();
    initLucide();
    initTheme();
    initScrollReveal();
    initMobileMenu();
    initScrollUx();
  });
})();
