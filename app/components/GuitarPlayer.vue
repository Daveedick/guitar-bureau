<script setup lang="ts">
import type { Guitar } from '~/data/guitars'
import { AudioPlayer, type PlayerState } from '~/utils/audio-player'
const props = defineProps<{ guitar: Guitar }>()
const tone = ref(props.guitar.tones[0]!)
const position = ref(props.guitar.positions[0]!)
const state = ref<PlayerState>({
  status: 'idle',
  wantsPlay: false,
  time: 0,
  duration: 0,
  error: '',
})
let player: AudioPlayer | undefined
const positionNumber = computed(
  () => props.guitar.positions.findIndex((item) => item.id === position.value.id) + 1,
)
const selectedTrack = computed(() => tone.value.tracks[position.value.id]!)
onMounted(() => {
  player = new AudioPlayer((value) => {
    state.value = value
  })
  player.select(selectedTrack.value)
})
watch(
  () => [selectedTrack.value, tone.value.id] as const,
  ([src, toneId], [, previousToneId]) =>
    player?.select(src, { preserveTime: toneId === previousToneId }),
  { flush: 'sync' },
)
onBeforeUnmount(() => player?.dispose())
onBeforeRouteLeave(() => player?.pause())
onBeforeRouteUpdate(() => player?.pause())
const formatTime = (value: number) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
const progress = computed(() =>
  state.value.duration ? (state.value.time / state.value.duration) * 100 : 0,
)
const status = computed(
  () =>
    ({
      idle: 'Нажмите Play, чтобы услышать гитару',
      loading: 'Загрузка записи…',
      playing: 'Воспроизведение',
      paused: 'На паузе',
      error: state.value.error,
    })[state.value.status],
)
</script>

<template>
  <section class="guitar-player" aria-label="Демо гитары">
    <fieldset v-if="guitar.tones.length > 1" class="tone-field">
      <legend>Тон</legend>
      <div class="tone-options">
        <label v-for="item in guitar.tones" :key="item.id" class="tone-option"
          ><input v-model="tone" type="radio" name="tone" :value="item" /><span>{{
            item.label
          }}</span></label
        >
      </div>
    </fieldset>
    <div v-else class="single-tone">
      Тон <strong>{{ tone.label }}</strong>
    </div>
    <div class="sound-view">
      <div class="position-display">
        <span class="position-counter"
          >{{ String(positionNumber).padStart(2, '0')
          }}<small> / {{ String(guitar.positions.length).padStart(2, '0') }}</small></span
        >
        <h2>{{ position.label }}</h2>
      </div>
      <PickupDiagram :pickups="guitar.pickups" :active="position.activePickups" />
    </div>
    <fieldset class="position-field">
      <legend>Позиция переключателя</legend>
      <div
        class="position-options"
        :style="{ gridTemplateColumns: `repeat(${guitar.positions.length}, minmax(0, 1fr))` }"
      >
        <label v-for="(item, index) in guitar.positions" :key="item.id" class="position-option"
          ><input
            v-model="position"
            type="radio"
            name="position"
            :value="item"
            :aria-label="`${index + 1} — ${item.label}`"
          /><span
            ><b>{{ String(index + 1).padStart(2, '0') }}</b
            ><small>{{ item.label }}</small></span
          ></label
        >
      </div>
    </fieldset>
    <div class="transport">
      <button
        class="play-button"
        :aria-label="state.wantsPlay ? 'Пауза' : 'Play — воспроизвести'"
        @click="player?.toggle()"
      >
        <svg v-if="state.wantsPlay" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14M16 5v14" /></svg
        ><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8z" /></svg>
      </button>
      <div class="timeline">
        <div class="track-caption">
          <span>{{ tone.label }} <span class="track-divider">/</span> {{ position.label }}</span
          ><span class="time"
            >{{ formatTime(state.time) }}
            <span>/ {{ state.duration ? formatTime(state.duration) : '—:—' }}</span></span
          >
        </div>
        <input
          class="seek"
          type="range"
          min="0"
          :max="state.duration || 1"
          step="0.1"
          :value="state.time"
          :disabled="!state.duration"
          aria-label="Перемотка записи"
          :aria-valuetext="`${formatTime(state.time)} из ${formatTime(state.duration)}`"
          :style="{ '--progress': `${progress}%` }"
          @input="player?.seek(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>
    <div class="player-status" :class="{ 'is-error': state.status === 'error' }">
      <span v-if="state.status === 'loading'" class="loading-dot" aria-hidden="true" />
      <p role="status" aria-live="polite">{{ status }}</p>
      <button v-if="state.status === 'error'" class="retry-button" @click="player?.retry()">
        Повторить
      </button>
    </div>
  </section>
</template>
