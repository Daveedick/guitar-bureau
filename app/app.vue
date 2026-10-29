<template>
  <div>
    <a class="skip-link" href="#main">К содержимому</a>
    <header class="site-header">
      <NuxtLink class="brand" to="/" aria-label="GBS — каталог гитар"
        >GBS<span class="brand-dot"
      /></NuxtLink>
      <span class="brand-expansion">Guitar Bureau<br />Showroom</span>
      <NuxtLink class="catalog-link" to="/"
        >Все инструменты
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path d="M6 18 18 6M6 6h12v12" /></svg
      ></NuxtLink>
    </header>
    <NuxtPage />
    <footer class="site-footer">
      <div class="footer-copy">
        <span>GBS · Гитарное бюро шоурум</span>
        <span>Смотреть. Переключать. Слушать.</span>
      </div>
      <nav class="footer-links" aria-label="Связаться">
        <a
          class="contact-link"
          href="https://t.me/daveedick"
          aria-label="Написать в Telegram"
          title="Написать в Telegram"
        >
          <!-- Telegram Plane: Font Awesome Free 5.15.4, CC BY 4.0. https://fontawesome.com/license/free -->
          <svg aria-hidden="true" focusable="false" viewBox="0 0 448 512">
            <path
              d="M446.7 98.6l-67.6 318.8c-5.1 22.5-18.4 28.1-37.3 17.5l-103-75.9-49.7 47.8c-5.5 5.5-10.1 10.1-20.7 10.1l7.4-104.9 190.9-172.5c8.3-7.4-1.8-11.5-12.9-4.1L117.8 284 16.2 252.2c-22.1-6.9-22.5-22.1 4.6-32.7L418.2 66.4c18.4-6.9 34.5 4.1 28.5 32.2z"
            />
          </svg>
        </a>
      </nav>
    </footer>
  </div>
</template>
