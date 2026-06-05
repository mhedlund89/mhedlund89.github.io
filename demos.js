/* ============================================================
   demos.js — Email modal (iframe preview + toggleable source).
   Vanilla JS, no deps. Loaded with `defer`.
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ============================================================
     EMAIL MODAL — iframe preview + source code, side by side
     ============================================================ */
  const em = $('[data-email-modal]');
  let emLastFocus = null;

  function closeEmailModal() {
    if (!em || em.hidden) return;
    em.hidden = true;
    document.body.style.overflow = '';
    const iframe = $('[data-email-modal-iframe]', em);
    if (iframe) iframe.src = 'about:blank';
    const code = $('[data-email-modal-code]', em);
    if (code) code.textContent = '';
    if (emLastFocus && typeof emLastFocus.focus === 'function') emLastFocus.focus();
  }

  function slugFromFile(file) {
    return (file || '').split('/').pop().replace(/\.html?$/i, '');
  }

  function emailSource(slug) {
    const map = window.EMAIL_SOURCES || {};
    return map[slug] || '';
  }

  function setSourceOpen(open) {
    if (!em) return;
    const body = $('[data-email-modal-body]', em);
    const pane = $('[data-email-modal-code-pane]', em);
    const toggle = $('[data-email-modal-toggle]', em);
    const label = $('[data-email-modal-toggle-label]', em);
    if (open) {
      pane.hidden = false;
      body.classList.add('is-source-open');
      toggle.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = 'Hide source';
      requestAnimationFrame(updatePreviewWidth);
    } else {
      pane.hidden = true;
      body.classList.remove('is-source-open');
      toggle.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = 'View source';
      requestAnimationFrame(updatePreviewWidth);
    }
  }

  // Reports the current iframe width and assigns a coarse "mode" (mobile/tablet/desktop).
  function updatePreviewWidth() {
    if (!em) return;
    const iframe = $('[data-email-modal-iframe]', em);
    const readout = $('[data-email-modal-width]', em);
    if (!iframe || !readout) return;
    const w = Math.round(iframe.getBoundingClientRect().width);
    if (!w) {
      readout.hidden = true;
      return;
    }
    readout.hidden = false;
    let mode = 'desktop';
    if (w < 480) mode = 'mobile';
    else if (w < 900) mode = 'tablet';
    readout.dataset.mode = mode;
    readout.textContent = `${w}px · ${mode}`;
  }

  function initEmailDivider() {
    if (!em) return;
    const body = $('[data-email-modal-body]', em);
    const divider = $('[data-email-modal-divider]', em);
    if (!body || !divider) return;

    let dragging = false;

    const setWidth = (px) => {
      const rect = body.getBoundingClientRect();
      const min = 220;            // matches minmax(220px, …) in CSS
      const gutter = 6;           // matches divider track width
      const max = Math.max(min, rect.width - min - gutter);
      const clamped = Math.max(min, Math.min(max, px));
      body.style.setProperty('--preview-w', `${clamped}px`);
      updatePreviewWidth();
    };

    const onMove = (clientX) => {
      const rect = body.getBoundingClientRect();
      setWidth(clientX - rect.left);
    };

    divider.addEventListener('mousedown', (e) => {
      if (!body.classList.contains('is-source-open')) return;
      dragging = true;
      divider.classList.add('is-dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      onMove(e.clientX);
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('is-dragging');
      document.body.style.cursor = '';
    });

    divider.addEventListener('touchstart', (e) => {
      if (!body.classList.contains('is-source-open')) return;
      dragging = true;
      divider.classList.add('is-dragging');
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!dragging || !e.touches[0]) return;
      onMove(e.touches[0].clientX);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('is-dragging');
    });

    divider.addEventListener('keydown', (e) => {
      if (!body.classList.contains('is-source-open')) return;
      const step = e.shiftKey ? 64 : 16;
      const cur = parseFloat(getComputedStyle($('.email-modal__preview', em)).width) || 0;
      if (e.key === 'ArrowLeft') { setWidth(cur - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setWidth(cur + step); e.preventDefault(); }
    });

    window.addEventListener('resize', () => {
      if (em && !em.hidden) updatePreviewWidth();
    });
  }

  function formatHtmlSource(text) {
    if (typeof window.html_beautify !== 'function') return text;
    try {
      return window.html_beautify(text, {
        indent_size: 2,
        indent_char: ' ',
        wrap_line_length: 0,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        end_with_newline: false,
        unformatted: ['code', 'pre'],
        content_unformatted: ['pre'],
        extra_liners: [],
      });
    } catch {
      return text;
    }
  }

  function highlightCode(codeEl) {
    if (!window.hljs || !codeEl) return;
    delete codeEl.dataset.highlighted;
    codeEl.removeAttribute('data-highlighted');
    codeEl.className = 'language-html hljs';
    try {
      window.hljs.highlightElement(codeEl);
    } catch {
      /* no-op */
    }
  }

  function openEmailModal(card) {
    if (!em) return;
    emLastFocus = card;
    const file = card.dataset.emailFile;
    const title = card.dataset.emailTitle || 'Email preview';
    const meta = card.dataset.emailMeta || '';
    if (!file) return;

    $('[data-email-modal-title]', em).textContent = title;
    $('[data-email-modal-meta]', em).innerHTML = meta;

    const iframe = $('[data-email-modal-iframe]', em);
    iframe.src = file;

    const slug = slugFromFile(file);
    const src = emailSource(slug);
    const codeEl = $('[data-email-modal-code]', em);
    if (src) {
      const formatted = formatHtmlSource(src);
      codeEl.textContent = formatted;
      highlightCode(codeEl);
    } else {
      codeEl.textContent = `Source not available for "${slug}". Regenerate email-sources.js to include this email.`;
      codeEl.className = '';
    }

    setSourceOpen(false);

    em.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-email-modal-close]', em).focus();
    requestAnimationFrame(updatePreviewWidth);
  }

  function initEmailModal() {
    if (!em) return;
    $$('[data-email-gallery] .email-card').forEach((c) =>
      c.addEventListener('click', () => openEmailModal(c))
    );

    $$('[data-email-modal-close]', em).forEach((b) =>
      b.addEventListener('click', closeEmailModal)
    );

    const toggle = $('[data-email-modal-toggle]', em);
    if (toggle) {
      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-pressed') === 'true';
        setSourceOpen(!isOpen);
      });
    }

    const copyBtn = $('[data-email-modal-copy]', em);
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const code = $('[data-email-modal-code]', em);
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.textContent || '');
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('is-copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('is-copied');
          }, 1400);
        } catch {
          copyBtn.textContent = 'Copy failed';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1400);
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !em.hidden) closeEmailModal();
    });

    initEmailDivider();
  }

  /* ============================================================
     Boot
     ============================================================ */
  function init() {
    initEmailModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
