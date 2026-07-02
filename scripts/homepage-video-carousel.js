export default function initHomepageVideoCarousel(root = document) {
  const section = root.querySelector('.homepage-video-sec');

  if (!section) return;

  const wrapper = section.querySelector('.columns.block > div');

  if (!wrapper) return;

  const slides = [...wrapper.children];

  if (slides.length <= 1) return;

  wrapper.classList.add('video-carousel-track');

  slides.forEach((slide) => {
    slide.classList.add('video-slide');
  });

  const viewport = document.createElement('div');
  viewport.className = 'video-carousel-viewport';

  wrapper.parentNode.insertBefore(viewport, wrapper);
  viewport.appendChild(wrapper);

  const controls = document.createElement('div');
  controls.className = 'video-carousel-controls';

  controls.innerHTML = `
    <button class="video-prev" aria-label="Previous">&#10094;</button>
    <span class="video-pagination">
      <span class="current">1</span>/<span class="total">1</span>
    </span>
    <button class="video-next" aria-label="Next">&#10095;</button>
  `;

  viewport.after(controls);

  const prevBtn = controls.querySelector('.video-prev');
  const nextBtn = controls.querySelector('.video-next');
  const currentEl = controls.querySelector('.current');
  const totalEl = controls.querySelector('.total');

  let slidesPerView = getSlidesPerView();
  let currentIndex = 0;

  function getSlidesPerView() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 4;
  }

  function maxIndex() {
    return Math.max(0, slides.length - slidesPerView);
  }

  function update() {
    slidesPerView = getSlidesPerView();

    slides.forEach((slide) => {
      slide.style.flex = `0 0 ${100 / slidesPerView}%`;
    });

    const slideWidth = viewport.clientWidth / slidesPerView;

    wrapper.style.transform = `translateX(-${currentIndex * slideWidth}px)`;

    currentEl.textContent = currentIndex + 1;
    totalEl.textContent = maxIndex() + 1;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex();

    section.querySelectorAll('video').forEach((video) => {
      video.pause();
    });
  }

  nextBtn.addEventListener('click', () => {
    if (currentIndex < maxIndex()) {
      currentIndex += 1;
      update();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      update();
    }
  });

  let startX = 0;
  let endX = 0;

  viewport.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    endX = startX;
  });

  viewport.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  });

  viewport.addEventListener('touchend', () => {
    const diff = startX - endX;

    if (Math.abs(diff) < 50) return;

    if (diff > 0 && currentIndex < maxIndex()) {
      currentIndex += 1;
    }

    if (diff < 0 && currentIndex > 0) {
      currentIndex -= 1;
    }

    update();
  });

  window.addEventListener('resize', () => {
    slidesPerView = getSlidesPerView();

    if (currentIndex > maxIndex()) {
      currentIndex = maxIndex();
    }

    update();
  });

  update();
}
