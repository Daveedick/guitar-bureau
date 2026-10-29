<script setup lang="ts">
import { guitars } from '~/data/guitars'
useSeoMeta({
  title: 'GBS — Гитарное бюро шоурум',
  description:
    'Интерактивная витрина гитар. Рассмотрите инструменты и послушайте записи разных положений датчиков.',
})
</script>

<template>
  <main id="main" class="catalog-page">
    <section class="catalog-intro">
      <h1>У каждой гитары<br />свой голос.</h1>
      <p>
        Три инструмента. У каждого — свой набор записей.<br class="desktop-break" />
        Выберите гитару и послушайте её сами.
      </p>
    </section>
    <div class="guitar-grid">
      <NuxtLink
        v-for="guitar in guitars"
        :key="guitar.slug"
        :to="`/guitars/${guitar.slug}`"
        class="guitar-card"
        :aria-label="`${guitar.name} — смотреть и слушать`"
      >
        <div class="card-photo">
          <img
            :src="guitar.image"
            :alt="guitar.imageAlt"
            width="1600"
            height="900"
            fetchpriority="high"
          /><span class="photo-caption">{{ guitar.configuration }}</span
          ><span class="card-arrow" aria-hidden="true"
            ><svg viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14" /></svg
          ></span>
        </div>
        <div class="card-title">
          <h2>{{ guitar.name }}</h2>
          <span>{{ guitar.toneSummary }}</span>
        </div>
        <p class="card-action">
          Смотреть и слушать
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </p>
      </NuxtLink>
    </div>
  </main>
</template>
