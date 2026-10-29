<script setup lang="ts">
import { guitars } from '~/data/guitars'
definePageMeta({ key: (route) => route.params.slug as string })
const route = useRoute()
const guitar = guitars.find((item) => item.slug === route.params.slug)
if (!guitar) throw createError({ statusCode: 404, statusMessage: 'Инструмент не найден' })
const other = guitars[(guitars.indexOf(guitar) + 1) % guitars.length]!
useSeoMeta({ title: `${guitar.name} — GBS`, description: guitar.description })
</script>

<template>
  <main v-if="guitar" id="main" class="instrument-page">
    <NuxtLink to="/" class="back-link"
      ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 12H4m6-6-6 6 6 6" /></svg> Все
      инструменты</NuxtLink
    >
    <div class="instrument-stage">
      <div class="instrument-photo">
        <img
          :src="guitar.image"
          :alt="guitar.imageAlt"
          width="1600"
          height="900"
          fetchpriority="high"
        /><span class="photo-caption">{{ guitar.configuration }}</span>
      </div>
      <div class="instrument-console">
        <h1>
          {{ guitar.titleLines[0] }} <br />{{ guitar.titleLines[1]
          }}<span class="title-dot">.</span>
        </h1>
        <p class="instrument-subtitle">{{ guitar.subtitle }}</p>
        <GuitarPlayer :key="guitar.slug" :guitar="guitar" />
      </div>
    </div>
    <section class="instrument-details">
      <div>
        <h2>Об инструменте</h2>
        <p>{{ guitar.description }}</p>
        <p v-if="guitar.imageNote" class="image-note">{{ guitar.imageNote }}</p>
      </div>
      <dl>
        <div v-for="spec in guitar.specs" :key="spec.label">
          <dt>{{ spec.label }}</dt>
          <dd>{{ spec.value }}</dd>
        </div>
      </dl>
    </section>
    <section v-if="guitar.work?.length" class="facts-section">
      <h2>Выполненные работы</h2>
      <ul>
        <li v-for="work in guitar.work" :key="work">{{ work }}</li>
      </ul>
    </section>
    <section v-if="guitar.comments?.length" class="facts-section">
      <h2>Комментарии</h2>
      <p v-for="comment in guitar.comments" :key="comment">{{ comment }}</p>
    </section>
    <NuxtLink class="next-instrument" :to="`/guitars/${other.slug}`">
      <span class="next-name">{{ other.name }}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
    </NuxtLink>
  </main>
</template>
