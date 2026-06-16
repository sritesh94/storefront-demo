export default function decorate(block) {
  const cards = [...block.children];

  cards.forEach((card) => {
    card.classList.add('card-item');
  });
}

console.log('cards-slider block loaded');
