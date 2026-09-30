/* NEXA promo site interactions */
(function () {
  'use strict';

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- nav shadow ---------- */
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    nav.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(17,24,39,0.08)' : 'none';
  }, { passive: true });

  /* ---------- interactive email demo ---------- */
  var demoBtn = document.getElementById('demoBtn');
  var demoReplay = document.getElementById('demoReplay');
  var demoScan = document.getElementById('demoScan');
  var demoSteps = document.querySelectorAll('.demo-step');
  var demoResult = document.getElementById('demoResult');
  var extracts = document.querySelectorAll('.extract');
  var demoRunning = false;

  function resetDemo() {
    extracts.forEach(function (el) { el.classList.remove('lit'); });
    demoSteps.forEach(function (el) { el.classList.remove('on'); });
    demoResult.classList.add('hidden');
    demoReplay.classList.add('hidden');
    demoBtn.classList.remove('hidden');
  }

  function runDemo() {
    if (demoRunning) return;
    demoRunning = true;
    resetDemo();
    demoBtn.classList.add('hidden');

    // 1. scanning sweep
    demoScan.classList.remove('scanning');
    void demoScan.offsetWidth; // restart animation
    demoScan.classList.add('scanning');

    // 2. light up extractions + steps one by one
    var stepDelay = 2100;
    extracts.forEach(function (el, i) {
      var stepNum = el.getAttribute('data-step');
      setTimeout(function () {
        el.classList.add('lit');
        var stepEl = document.querySelector('.demo-step[data-for="' + stepNum + '"]');
        if (stepEl) stepEl.classList.add('on');
      }, stepDelay + i * 900);
    });

    // 3. show result card
    setTimeout(function () {
      demoResult.classList.remove('hidden');
      demoReplay.classList.remove('hidden');
      demoRunning = false;
      demoResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, stepDelay + extracts.length * 900 + 500);
  }

  demoBtn.addEventListener('click', runDemo);
  demoReplay.addEventListener('click', runDemo);

  /* ---------- pricing toggle ---------- */
  var toggleBtns = document.querySelectorAll('.toggle-btn');
  var priceValue = document.getElementById('priceValue');
  var pricePer = document.getElementById('pricePer');
  var priceNote = document.getElementById('priceNote');
  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toggleBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (btn.getAttribute('data-plan') === 'yearly') {
        priceValue.textContent = '₹120';
        pricePer.textContent = '/year';
        priceNote.textContent = 'One UPI payment · no monthly auto-debit';
      } else {
        priceValue.textContent = '₹10';
        pricePer.textContent = '/month';
        priceNote.textContent = 'Billed monthly · cancel anytime';
      }
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq').forEach(function (faq) {
    var q = faq.querySelector('.faq-q');
    var a = faq.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var isOpen = faq.classList.contains('open');
      document.querySelectorAll('.faq.open').forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        faq.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- waitlist form ---------- */
  var form = document.getElementById('waitlistForm');
  var formError = document.getElementById('formError');
  var formBtn = document.getElementById('formBtn');
  var formSuccess = document.getElementById('formSuccess');
  var successTitle = document.getElementById('successTitle');
  var successMsg = document.getElementById('successMsg');

  // API base: override with window.NEXA_API_URL if embedded elsewhere.
  // NOTE: base already includes /api, so the endpoint path is just /waitlist.
  var API_BASE = (window.NEXA_API_URL || 'https://glitchers-backend.onrender.com/api').replace(/\/$/, '');

  function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
  }
  function clearError() {
    formError.textContent = '';
    formError.classList.add('hidden');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearError();

    var name = document.getElementById('fName').value.trim();
    var email = document.getElementById('fEmail').value.trim();
    var college = document.getElementById('fCollege').value.trim();

    var bad = null;
    if (!name) bad = 'Please tell us your name.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad = 'That email doesn\u2019t look right — mind checking it?';
    else if (!college) bad = 'Please tell us your college.';
    if (bad) {
      showError(bad);
      return;
    }

    formBtn.disabled = true;
    formBtn.textContent = 'Joining…';

    fetch(API_BASE + '/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, college: college })
    })
      .then(function (res) {
        // Never fake a success: only treat 2xx as success.
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            throw new Error(body.message || 'Something went wrong on our side. Please try again.');
          });
        }
        return res.json();
      })
      .then(function (data) {
        form.classList.add('hidden');
        if (data && data.already) {
          successTitle.textContent = "You're already on the list! 🎉";
          successMsg.textContent = 'We\u2019ve got your details — we\u2019ll ping you the moment your campus batch opens.';
        }
        formSuccess.classList.remove('hidden');
      })
      .catch(function (err) {
        // Network down / backend asleep (free tier cold start) / server error:
        // show a friendly error, NEVER a fake success.
        showError(err.message || 'Couldn\u2019t reach our servers. Check your connection and try again.');
        formBtn.disabled = false;
        formBtn.textContent = 'Count me in 🚀';
      });
  });
})();
