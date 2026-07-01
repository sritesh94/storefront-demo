export default function decorate(block) {
  const link = block.querySelector('a');

  if (!link) return;

  const url = link.href;
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
