/* ========================================
   3D PARALLAX EFFECTS — JavaScript Engine
   iOS / iPhone compatible
   ======================================== */

(function () {
  'use strict';

  // ---- Device detection ----
  var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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
     1. HERO — Mouse/Touch/Gyro 3D Parallax
     ======================================== */
  var heroLayers = document.querySelectorAll('.hero__layer');

  // Smoothed input position (normalized -1..1)
  var mouse = { x: 0, y: 0 };
  var smoothMouse = { x: 0, y: 0 };

  // Mouse tracking (desktop)
  document.addEventListener('mousemove', function (e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Touch tracking (mobile fallback if no gyro)
  if (isTouchDevice) {
    document.addEventListener('touchmove', function (e) {
      var touch = e.touches[0];
      if (!touch) return;
      mouse.x = (touch.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (touch.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

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
     2. FLOATING PARTICLES (reduced on mobile)
     ======================================== */
  var particlesContainer = document.getElementById('particles');

  function createParticles(count) {
    for (var i = 0; i < count; i++) {
      var particle = document.createElement('div');
      particle.className = 'particle';

      var size = Math.random() * 4 + 2;
      var hue = Math.random() * 60 + 200;
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

  // Fewer particles on mobile for performance
  createParticles(isTouchDevice ? 15 : 30);

  /* ========================================
     3. 3D TILT CARDS (mouse + touch)
     ======================================== */
  var tiltCards = document.querySelectorAll('.tilt-card');

  tiltCards.forEach(function (card) {
    var inner = card.querySelector('.tilt-card__inner');
    var shine = card.querySelector('.tilt-card__shine');

    function handleTilt(clientX, clientY) {
      var rect = card.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;

      var rotateX = ((y - centerY) / centerY) * -12;
      var rotateY = ((x - centerX) / centerX) * 12;

      inner.style.transform =
        'rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.03, 1.03, 1.03)';

      var shineX = (x / rect.width) * 100;
      var shineY = (y / rect.height) * 100;
      shine.style.setProperty('--shine-x', shineX + '%');
      shine.style.setProperty('--shine-y', shineY + '%');
      shine.style.opacity = '1';
    }

    function resetTilt() {
      inner.style.transform = 'rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      shine.style.opacity = '0';
    }

    // Desktop: mouse events
    card.addEventListener('mousemove', function (e) {
      handleTilt(e.clientX, e.clientY);
    });
    card.addEventListener('mouseleave', resetTilt);

    // Mobile: touch events
    card.addEventListener('touchmove', function (e) {
      var touch = e.touches[0];
      if (!touch) return;
      handleTilt(touch.clientX, touch.clientY);
    }, { passive: true });
    card.addEventListener('touchend', resetTilt);
  });

  /* ========================================
     4. SCROLL-BASED PARALLAX
     ======================================== */
  var scrollElements = document.querySelectorAll('[data-scroll-speed]');

  function updateScrollParallax() {
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
     5. 3D SCENE — Mouse/Touch rotation
     ======================================== */
  var scene3d = document.getElementById('scene3d');
  var sceneContainer = document.querySelector('.scene-container');

  function updateScene3d() {
    if (!sceneContainer || !scene3d) return;
    if (!isInViewport(sceneContainer, 0)) return;

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

  // Handle resize (and iOS orientation change)
  window.addEventListener('resize', function () {
    updateScrollParallax();
    updateScrollReveal();
  }, { passive: true });

  /* ========================================
     8. iOS DEVICE ORIENTATION (with permission)
     ======================================== */
  var motionPermissionBtn = document.getElementById('motionPermissionBtn');
  var gyroActive = false;

  function enableGyro() {
    gyroActive = true;
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma === null || e.beta === null) return;
      mouse.x = clamp(e.gamma / 30, -1, 1);
      mouse.y = clamp((e.beta - 45) / 30, -1, 1);
    }, { passive: true });

    // Hide the button once gyro is active
    if (motionPermissionBtn) {
      motionPermissionBtn.classList.remove('visible');
      motionPermissionBtn.classList.add('hidden');
    }
  }

  function initMotion() {
    // iOS 13+ requires permission request via user gesture
    if (isIOS && typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // Show permission button for iOS
      if (motionPermissionBtn) {
        motionPermissionBtn.classList.add('visible');
        motionPermissionBtn.addEventListener('click', function () {
          DeviceOrientationEvent.requestPermission()
            .then(function (state) {
              if (state === 'granted') {
                enableGyro();
              }
            })
            .catch(function (err) {
              console.warn('Motion permission denied:', err);
              if (motionPermissionBtn) {
                motionPermissionBtn.classList.remove('visible');
                motionPermissionBtn.classList.add('hidden');
              }
            });
        });
      }
    } else if (isTouchDevice) {
      // Android or older iOS — just enable directly
      enableGyro();
    }
  }

  initMotion();

  /* ========================================
     9. ADAPTIVE UI TEXT
     ======================================== */
  var heroSubtitle = document.querySelector('.hero__subtitle');
  if (heroSubtitle && isTouchDevice) {
    heroSubtitle.textContent = 'Tilt your device to explore the depth';
  }

  var sceneDesc = document.querySelector('#scene .section-desc');
  if (sceneDesc && isTouchDevice) {
    sceneDesc.textContent = 'Tilt your device to rotate the scene in 3D space';
  }

})();
