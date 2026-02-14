/* ========================================
   3D PARALLAX EFFECTS — JavaScript Engine
   ======================================== */

(function () {
  'use strict';

  // ---- Utility: lerp for smooth interpolation ----
  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // ---- Utility: clamp ----
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // ---- Utility: check if element is in viewport ----
  function isInViewport(el, offset) {
    var rect = el.getBoundingClientRect();
    return (
      rect.bottom >= -offset &&
      rect.top <= window.innerHeight + offset
    );
  }

  /* ========================================
     1. HERO — Mouse-tracking 3D Parallax
     ======================================== */
  var heroContainer = document.querySelector('.hero__parallax-container');
  var heroLayers = document.querySelectorAll('.hero__layer');

  // Smoothed mouse position
  var mouse = { x: 0, y: 0 };
  var smoothMouse = { x: 0, y: 0 };

  document.addEventListener('mousemove', function (e) {
    // Normalize to -1..1 from center
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function updateHeroParallax() {
    smoothMouse.x = lerp(smoothMouse.x, mouse.x, 0.08);
    smoothMouse.y = lerp(smoothMouse.y, mouse.y, 0.08);

    heroLayers.forEach(function (layer) {
      var depth = parseFloat(layer.dataset.depth) || 0;
      var moveX = smoothMouse.x * depth * 60;
      var moveY = smoothMouse.y * depth * 40;
      var rotateX = smoothMouse.y * depth * -5;
      var rotateY = smoothMouse.x * depth * 5;

      layer.style.transform =
        'translate3d(' + moveX + 'px, ' + moveY + 'px, 0) ' +
        'rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
    });
  }

  /* ========================================
     2. FLOATING PARTICLES
     ======================================== */
  var particlesContainer = document.getElementById('particles');

  function createParticles(count) {
    for (var i = 0; i < count; i++) {
      var particle = document.createElement('div');
      particle.className = 'particle';

      var size = Math.random() * 4 + 2;
      var hue = Math.random() * 60 + 200; // blue-purple range
      var left = Math.random() * 100;
      var duration = Math.random() * 8 + 6;
      var delay = Math.random() * -duration;

      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = left + '%';
      particle.style.bottom = '-10px';
      particle.style.background = 'hsl(' + hue + ', 80%, 70%)';
      particle.style.boxShadow = '0 0 ' + (size * 2) + 'px hsl(' + hue + ', 80%, 50%)';
      particle.style.animationDuration = duration + 's';
      particle.style.animationDelay = delay + 's';

      particlesContainer.appendChild(particle);
    }
  }

  createParticles(30);

  /* ========================================
     3. 3D TILT CARDS
     ======================================== */
  var tiltCards = document.querySelectorAll('.tilt-card');

  tiltCards.forEach(function (card) {
    var inner = card.querySelector('.tilt-card__inner');
    var shine = card.querySelector('.tilt-card__shine');

    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;

      var rotateX = ((y - centerY) / centerY) * -12;
      var rotateY = ((x - centerX) / centerX) * 12;

      inner.style.transform =
        'rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.03, 1.03, 1.03)';

      // Update shine position
      var shineX = (x / rect.width) * 100;
      var shineY = (y / rect.height) * 100;
      shine.style.setProperty('--shine-x', shineX + '%');
      shine.style.setProperty('--shine-y', shineY + '%');
    });

    card.addEventListener('mouseleave', function () {
      inner.style.transform = 'rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
  });

  /* ========================================
     4. SCROLL-BASED PARALLAX
     ======================================== */
  var scrollElements = document.querySelectorAll('[data-scroll-speed]');

  function updateScrollParallax() {
    var scrollY = window.pageYOffset;

    scrollElements.forEach(function (el) {
      if (!isInViewport(el.parentElement || el, 200)) return;

      var speed = parseFloat(el.dataset.scrollSpeed) || 0;
      var rect = (el.parentElement || el).getBoundingClientRect();
      var centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;

      var translateY = centerOffset * speed;
      el.style.transform = 'translate3d(0, ' + translateY + 'px, 0)';
    });
  }

  /* ========================================
     5. 3D SCENE — Mouse-driven rotation
     ======================================== */
  var scene3d = document.getElementById('scene3d');
  var sceneContainer = document.querySelector('.scene-container');

  function updateScene3d() {
    if (!sceneContainer || !scene3d) return;
    if (!isInViewport(sceneContainer, 0)) return;

    var rect = sceneContainer.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;

    // Use smooth mouse position relative to scene center
    var relX = (mouse.x) * 25;
    var relY = (mouse.y) * -25;

    scene3d.style.transform =
      'rotateX(' + relY + 'deg) rotateY(' + relX + 'deg)';
  }

  /* ========================================
     6. SCROLL REVEAL ANIMATIONS
     ======================================== */
  var revealElements = document.querySelectorAll('[data-scroll-reveal]');

  function updateScrollReveal() {
    revealElements.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var triggerPoint = window.innerHeight * 0.85;
      var delay = parseInt(el.dataset.scrollDelay, 10) || 0;

      if (rect.top < triggerPoint) {
        setTimeout(function () {
          el.classList.add('revealed');
        }, delay);
      }
    });
  }

  /* ========================================
     7. ANIMATION LOOP
     ======================================== */
  function animate() {
    updateHeroParallax();
    updateScene3d();
    requestAnimationFrame(animate);
  }

  animate();

  // Scroll-driven updates (throttled via rAF)
  var scrollTicking = false;

  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        updateScrollParallax();
        updateScrollReveal();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // Initial calls
  updateScrollParallax();
  updateScrollReveal();

  // Handle resize
  window.addEventListener('resize', function () {
    updateScrollParallax();
    updateScrollReveal();
  }, { passive: true });

  /* ========================================
     8. TOUCH SUPPORT (mobile parallax)
     ======================================== */
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    // Use device orientation for mobile parallax
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma === null || e.beta === null) return;
      mouse.x = clamp(e.gamma / 30, -1, 1);
      mouse.y = clamp((e.beta - 45) / 30, -1, 1);
    }, { passive: true });
  }

})();
