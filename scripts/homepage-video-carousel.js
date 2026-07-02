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
  let currentPage = 0;

  function getSlidesPerView() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 4;
  }

  function totalPages() {
    return Math.ceil(slides.length / slidesPerView);
  }

  function update() {
    slidesPerView = getSlidesPerView();

    const pageWidth = viewport.clientWidth;

    wrapper.style.transform = `translateX(-${currentPage * pageWidth}px)`;

    currentEl.textContent = currentPage + 1;
    totalEl.textContent = totalPages();

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages() - 1;

    section.querySelectorAll('video').forEach((video) => video.pause());
  }

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages() - 1) {
      currentPage += 1;
      update();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage -= 1;
      update();
    }
  });

  let startX = 0;
  let endX = 0;

  viewport.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  viewport.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  });

  viewport.addEventListener('touchend', () => {
    const diff = startX - endX;

    if (Math.abs(diff) < 50) return;

    if (diff > 0 && currentPage < totalPages() - 1) {
      currentPage += 1;
    }

    if (diff < 0 && currentPage > 0) {
      currentPage -= 1;
    }

    update();
  });

  window.addEventListener('resize', () => {
    const maxPage = totalPages() - 1;

    if (currentPage > maxPage) {
      currentPage = maxPage;
    }

    update();
  });

  update();
}
