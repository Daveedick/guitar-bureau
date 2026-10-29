export default defineNuxtConfig({
  compatibilityDate: '2026-09-16',
  devtools: { enabled: false },
  css: ['@fontsource-variable/manrope', '~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'GBS — Guitar Bureau Showroom',
      meta: [{ name: 'theme-color', content: '#e8e8e5' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  nitro: {
    prerender: {
      routes: ['/', '/guitars/black-strat', '/guitars/blue-strat', '/guitars/gibson-sg'],
    },
  },
})
