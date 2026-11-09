/* =====================================================================
   guides.js - behaviors for the Guides pages (index.html).
   These exist to give you things to point Pendo guides at: modals,
   banners, badges, toasts. Each block says what it does.
   ===================================================================== */

(function () {

  // Small helpers so the code below stays short.
  function $(id) { return document.getElementById(id); }
  function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  function open(id)  { $(id).classList.add('open'); }
  function close(id) { $(id).classList.remove('open'); }


  // ---------- REGULAR MODALS #1 and #2 ----------
  // Ordinary div-based modals. Only one is ever open: Next closes #1 and
  // opens #2, Back does the reverse.
  on('open-modal-1',  function () { open('modal-1'); });
  on('modal-1-close', function () { close('modal-1'); });
  on('modal-1-x',     function () { close('modal-1'); });
  on('modal-1-next',  function () { close('modal-1'); open('modal-2'); });

  on('modal-2-back',   function () { close('modal-2'); open('modal-1'); });
  on('modal-2-cancel', function () { close('modal-2'); });
  on('modal-2-confirm', function () {
    close('modal-2');
    showToast('Confirmed!');
  });


  // ---------- TOP-LAYER MODAL ----------
  // A native <dialog>. showModal() moves it into the browser's top layer.
  on('open-top-layer',  function () { $('top-layer-modal').showModal(); });
  ['top-layer-close', 'top-layer-x', 'top-layer-ok'].forEach(function (id) {
    on(id, function () { $('top-layer-modal').close(); });
  });


  // ---------- BANNER ----------
  // Shows / hides a banner in the empty "banner slot".
  on('toggle-banner', function () {
    $('sample-banner').classList.toggle('hidden');
  });
  on('banner-dismiss', function () {
    $('sample-banner').classList.add('hidden');
  });


  // ---------- NOTIFICATION BELL ----------
  // Clicking the bell clears the red-ish badge number.
  on('bell-btn', function () {
    $('bell-count').classList.add('hidden');
  });
  on('bell-reset', function () {
    $('bell-count').classList.remove('hidden');
  });


  // ---------- FLOATING HELP LAUNCHER ----------
  // The round "?" button opens / closes a small panel above it.
  on('launcher-btn', function () {
    $('launcher-panel').classList.toggle('hidden');
  });


  // ---------- CONSENT BAR ----------
  // Either button hides the bar. (It comes back when you reload the page.)
  on('consent-accept',  function () { $('consent-bar').classList.add('hidden'); });
  on('consent-decline', function () { $('consent-bar').classList.add('hidden'); });


  // ---------- STAR RATING + FEEDBACK ----------
  // Clicking star N lights up stars 1..N and remembers N.
  var rating = 0;
  document.querySelectorAll('.star').forEach(function (star) {
    star.addEventListener('click', function () {
      rating = Number(star.getAttribute('data-value'));
      document.querySelectorAll('.star').forEach(function (s) {
        s.classList.toggle('on', Number(s.getAttribute('data-value')) <= rating);
      });
    });
  });

  // Send: log a Pendo track event, then swap the form for a thank-you.
  on('feedback-submit', function () {
    if (window.pendo && pendo.track) {
      pendo.track('Feedback Sent', { rating: rating, comment: $('feedback-text').value });
    }
    console.log('[track] Feedback Sent', rating);
    $('feedback-thanks').classList.remove('hidden');
    $('feedback-submit').classList.add('hidden');
  });


  // ---------- DUPLICATE DOM (Duplicate DOM page) ----------
  // Each .dup-block holds two .dup-copy elements; the one with the "active"
  // class is visible (the CSS hides the other using the block's data-hide
  // method). "Switch copies" moves "active" to the other one. Clicking a
  // copy's button writes which copy it was into the block's log line.
  document.querySelectorAll('.dup-block').forEach(function (block) {
    var copies = block.querySelectorAll('.dup-copy');
    var status = block.querySelector('.dup-status');

    function showStatus() {
      var active = block.querySelector('.dup-copy.active').getAttribute('data-copy');
      status.textContent = 'Visible copy: #' + active;
    }

    block.querySelector('.dup-toggle').addEventListener('click', function () {
      copies.forEach(function (copy) { copy.classList.toggle('active'); });
      block.querySelector('.dup-log').textContent = '';
      showStatus();
    });

    copies.forEach(function (copy) {
      copy.querySelector('.dup-save').addEventListener('click', function () {
        block.querySelector('.dup-log').textContent =
          '· Clicked copy #' + copy.getAttribute('data-copy');
      });
    });

    showStatus();
  });


  // ---------- SCROLL FILLER (Scroll Targets page) ----------
  // Every <div class="scroll-filler" data-filler="N"> gets N dummy paragraphs.
  // This pushes the real target buttons far out of view.
  document.querySelectorAll('.scroll-filler').forEach(function (holder) {
    var count = Number(holder.getAttribute('data-filler'));
    var html = '';
    for (var i = 1; i <= count; i++) {
      html += '<p class="muted">Dummy paragraph ' + i + '. Nothing to see here, just taking up space so the ' +
              'target is a long way off screen.</p>';
    }
    holder.innerHTML = html;
  });

  // ---------- SCROLL TO REVEAL (Scroll to Reveal page) ----------
  // Each .reveal-target starts hidden (the CSS rule depends on its data-hide
  // value). An IntersectionObserver watches its .reveal-holder and, once the
  // holder is fully on screen, adds the "revealed" class which makes the
  // target visible. IntersectionObserver also respects scrolling boxes: the
  // holder only counts as "on screen" if it's visible INSIDE its box.
  function updateRevealStatus(target) {
    var status = document.querySelector('.reveal-status[data-for="' + target.id + '"]');
    if (status) {
      status.textContent = target.classList.contains('revealed')
        ? 'State: visible (revealed)'
        : 'State: hidden with ' + target.getAttribute('data-hide') + ' (scroll to reveal)';
    }
  }

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var target = entry.target.querySelector('.reveal-target');
        target.classList.add('revealed');
        updateRevealStatus(target);
      }
    });
  }, { threshold: 1 });   // 1 = the whole holder must be on screen

  document.querySelectorAll('.reveal-holder').forEach(function (holder) {
    revealObserver.observe(holder);
    updateRevealStatus(holder.querySelector('.reveal-target'));
  });

  // "Reset all": hide every target again. (The observer only fires when a
  // holder ENTERS the screen, so scroll away and back to reveal them again.)
  on('reveal-reset', function () {
    document.querySelectorAll('.reveal-target').forEach(function (target) {
      target.classList.remove('revealed');
      updateRevealStatus(target);
    });
    document.querySelectorAll('.reveal-holder').forEach(function (holder) {
      revealObserver.unobserve(holder);   // re-observe so it can fire again
      revealObserver.observe(holder);
    });
  });


  // Buttons that move the page. (scrollIntoView is what many guides do too.)
  on('scroll-jump-bottom', function () {
    $('scroll-bottom-target').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  on('scroll-jump-top', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });


  // ---------- TOAST ----------
  // A little message that pops up for 2.5 seconds, then disappears.
  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 2500);
  }
  on('show-toast', function () { showToast('Hello from a toast!'); });
  window.showToast = showToast;   // other scripts (checkout, table...) reuse this

})();
