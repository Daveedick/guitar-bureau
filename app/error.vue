<script setup lang="ts">
defineProps<{ error: { statusCode: number } }>()
</script>
<template>
  <main class="error-page">
    <span class="brand">GBS</span>
    <h1>{{ error.statusCode === 404 ? 'Здесь пока тихо.' : 'Что-то пошло не так.' }}</h1>
    <p>
      {{
        error.statusCode === 404
          ? 'Такой страницы нет. Выберите инструмент в каталоге.'
          : 'Попробуйте открыть каталог ещё раз.'
      }}
    </p>
    <a href="/" class="back-link">Перейти к инструментам</a>
  </main>
</template>
