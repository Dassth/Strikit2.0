function createNav(activePage) {
  const nav = document.createElement('header');
  nav.className = 'header';
  nav.id = 'site-header';
  nav.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="logo-area">
        <img src="logo.jpeg" alt="Strikit Logo" class="logo-img">
        <div class="logo-text"><span>STRIK</span><span>IT</span></div>
      </a>
      <nav class="main-nav">
        <a href="index.html" class="nav-link ${activePage==='home'?'active':''}">Home</a>
        <a href="index.html#about" class="nav-link ${activePage==='about'?'active':''}">About Us</a>
        <a href="dashboard/index.html" class="nav-link ${activePage==='dashboard'?'active':''}">Dashboard</a>
        <a href="privacy.html" class="nav-link ${activePage==='privacy'?'active':''}">Privacy Policy</a>
        <a href="terms.html" class="nav-link ${activePage==='terms'?'active':''}">Terms</a>
      </nav>
      <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>`;
  document.body.prepend(nav);
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function toggleMobileMenu() {
  document.querySelector('.main-nav').classList.toggle('mobile-open');
  document.querySelector('.mobile-menu-btn').classList.toggle('open');
}
