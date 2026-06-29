export default function decorate(block) {
  const rows = [...block.children];

  const headers = document.createElement('div');
  headers.className = 'tabs-nav';

  const content = document.createElement('div');
  content.className = 'tabs-content';

  rows.forEach((row, index) => {
    const cols = [...row.children];

    if (cols.length < 2) {
      return;
    }

    const title = cols[0].textContent.trim();

    const panel = document.createElement('div');
    panel.className = 'tab-panel';

    Array.from(cols[1].childNodes).forEach((node) => {
      panel.appendChild(node);
    });

    if (index !== 0) {
      panel.hidden = true;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = title;
    button.className = 'tab-button';

    if (index === 0) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      headers.querySelectorAll('button').forEach((btn) => {
        btn.classList.remove('active');
      });

      content.querySelectorAll('.tab-panel').forEach((tabPanel) => {
        tabPanel.hidden = true;
      });

      button.classList.add('active');
      panel.hidden = false;
    });

    headers.append(button);
    content.append(panel);
  });

  block.replaceChildren(headers, content);
}
