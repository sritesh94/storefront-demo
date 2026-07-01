export default function decorate(block) {
  if (block.querySelector('video')) return;

  const link = block.querySelector('a');
  let url = link ? link.href : '';

  if (!url) {
    const text = block.textContent.trim();
    if (/^https?:\/\//i.test(text)) {
      url = text;
    }
  }

  if (!url) return;

  const video = document.createElement('video');

  video.src = url;
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;

  if (block.classList.contains('autoplay')) {
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
  }

  block.replaceChildren(video);
}
