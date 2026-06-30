const PROMO_COUNTDOWN_END_DATE = '2026-12-31T23:59:59Z';

function pad(value) {
  return String(value).padStart(2, '0');
}

function getLabelFromListItem(listItem) {
  const text = listItem.textContent || '';
  return text.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim();
}

function updateListItem(listItem, value) {
  const label = getLabelFromListItem(listItem);
  listItem.innerHTML = `<span class="countdown-value">${pad(value)}</span><br>${label}`;
}

function computeCountdown(endTime) {
  const diff = Math.max(endTime.getTime() - Date.now(), 0);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    expired: diff === 0,
  };
}

export function initHomepagePromoCountdown(root = document) {
  const section = root.querySelector('.homepage-promo-section');
  if (!section) return;

  const endDateString = section.dataset.countdownEnd || PROMO_COUNTDOWN_END_DATE;
  const endTime = new Date(endDateString);
  if (Number.isNaN(endTime.getTime())) return;

  const listItems = [...section.querySelectorAll('table ul li')];
  if (listItems.length < 4) return;

  const values = ['days', 'hours', 'minutes', 'seconds'];
  let timerId;
  const tick = () => {
    const countdown = computeCountdown(endTime);
    if (countdown.expired) {
      listItems.forEach((listItem) => {
        updateListItem(listItem, 0);
      });
      clearInterval(timerId);
      return;
    }

    values.forEach((key, index) => {
      updateListItem(listItems[index], countdown[key]);
    });
  };

  tick();
  timerId = setInterval(tick, 1000);
}
