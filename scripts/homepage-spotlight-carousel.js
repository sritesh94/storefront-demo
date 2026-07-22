export default function initHomepageSpotlightCarousel(root = document) {
  const section = root.querySelector('.homepage-spotlight-section');
  if (!section || section.dataset.spotlightCarouselInitialized === 'true') return;
  section.dataset.spotlightCarouselInitialized = 'true';

  const columnsBlock = section.querySelector('.columns');
  if (!columnsBlock) return;

  const track = columnsBlock;
  const slides = [...track.children];

  if (slides.length <= 1) return;

  let isInitialized = false;
  let currentIndex = 0;
  let viewport = null;
  let indicators = null;
  let startX = 0;
  let endX = 0;

  function isMobile() {
    return window.innerWidth < 900;
  }

  function maxIndex() {
    return Math.max(0, slides.length - 1);
  }

  function update() {
    if (!isInitialized || !viewport || !indicators) return;

    slides.forEach((slide) => {
      slide.style.flex = '0 0 100%';
    });

    const slideWidth = viewport.clientWidth;
    track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;

    indicators.innerHTML = '';
    slides.forEach((_, i) => {
      const li = document.createElement('li');
      li.className = `spotlight-indicator${i === currentIndex ? ' active' : ''}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Go to slide ${i + 1}`);
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
      btn.dataset.index = i;

      const dot = document.createElement('span');
      dot.className = 'spotlight-indicator-dot';
      btn.appendChild(dot);

      li.appendChild(btn);
      indicators.appendChild(li);
    });
  }

  function goToSlide(index) {
    if (index < 0) {
      currentIndex = 0;
    } else if (index > maxIndex()) {
      currentIndex = maxIndex();
    } else {
      currentIndex = index;
    }
    update();
  }

  function onIndicatorClick(e) {
    const btn = e.target.closest('button[data-index]');
    if (btn && btn.dataset.index !== undefined) {
      goToSlide(Number(btn.dataset.index));
    }
  }

  function onKeyDown(e) {
    if (!isMobile() || !isInitialized) return;
    if (e.key === 'ArrowRight') {
      goToSlide(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      goToSlide(currentIndex - 1);
    }
  }

  function onTouchStart(e) {
    if (!isMobile() || !isInitialized) return;
    startX = e.touches[0].clientX;
    endX = startX;
  }

  function onTouchMove(e) {
    if (!isMobile() || !isInitialized) return;
    endX = e.touches[0].clientX;
  }

  function onTouchEnd() {
    if (!isMobile() || !isInitialized) return;
    const diff = startX - endX;
    if (Math.abs(diff) < 40) return;

    if (diff > 0) {
      goToSlide(currentIndex + 1);
    } else if (diff < 0) {
      goToSlide(currentIndex - 1);
    }
  }

  function initCarousel() {
    if (isInitialized) return;

    section.querySelectorAll('.spotlight-carousel-indicators').forEach((el) => el.remove());

    viewport = document.createElement('div');
    viewport.className = 'spotlight-carousel-viewport';
    viewport.setAttribute('tabindex', '0');
    viewport.setAttribute('aria-label', 'Spotlight Carousel');

    track.parentNode.insertBefore(viewport, track);
    viewport.appendChild(track);

    indicators = document.createElement('ul');
    indicators.className = 'spotlight-carousel-indicators';
    indicators.setAttribute('role', 'tablist');
    indicators.setAttribute('aria-label', 'Spotlight Navigation');
    viewport.after(indicators);

    track.classList.add('spotlight-carousel-track');
    slides.forEach((slide) => {
      slide.classList.add('spotlight-slide');
    });

    indicators.addEventListener('click', onIndicatorClick);
    viewport.addEventListener('keydown', onKeyDown);
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: true });
    viewport.addEventListener('touchend', onTouchEnd);

    isInitialized = true;
    currentIndex = 0;
    update();
  }

  function destroyCarousel() {
    if (!isInitialized) return;

    if (indicators) {
      indicators.removeEventListener('click', onIndicatorClick);
      indicators.remove();
      indicators = null;
    }

    if (viewport) {
      viewport.removeEventListener('keydown', onKeyDown);
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);

      if (viewport.parentNode) {
        viewport.parentNode.insertBefore(track, viewport);
        viewport.remove();
      }
      viewport = null;
    }

    track.classList.remove('spotlight-carousel-track');
    track.style.transform = '';

    slides.forEach((slide) => {
      slide.classList.remove('spotlight-slide');
      slide.style.flex = '';
    });

    isInitialized = false;
  }

  function checkViewport() {
    if (isMobile()) {
      if (!isInitialized) {
        initCarousel();
      } else {
        if (currentIndex > maxIndex()) {
          currentIndex = maxIndex();
        }
        update();
      }
    } else if (isInitialized) {
      destroyCarousel();
    }
  }

  window.addEventListener('resize', checkViewport);
  checkViewport();
}
