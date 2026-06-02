/* ── nav.js — hamburger + active link ── */
(function () {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  }

  // Mark active nav link
  const links = document.querySelectorAll('.nav-link, .mobile-menu a');
  const path = location.pathname;
  links.forEach(l => {
    const href = l.getAttribute('href') || '';
    const match = href === path || (href !== '/' && href !== 'index.html' && path.includes(href));
    if (match) l.classList.add('active');
  });
})();
