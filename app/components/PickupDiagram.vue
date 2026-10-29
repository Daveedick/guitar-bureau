<script setup lang="ts">
import type { Pickup } from '~/data/guitars'
defineProps<{ pickups: Pickup[]; active: string[] }>()
</script>
<template>
  <div
    class="pickup-diagram"
    role="img"
    :aria-label="`Активные датчики: ${pickups
      .filter((p) => active.includes(p.id))
      .map((p) => p.label)
      .join(' + ')}`"
  >
    <div
      v-for="pickup in pickups"
      :key="pickup.id"
      class="pickup-row"
      :class="{ active: active.includes(pickup.id) }"
      :data-pickup="pickup.id"
      :data-active="active.includes(pickup.id)"
    >
      <div class="pickup-coils" :style="{ transform: `rotate(${pickup.angle ?? 0}deg)` }">
        <span v-for="coil in pickup.coils" :key="coil" class="pickup-coil"
          ><i v-for="pole in 6" :key="pole"
        /></span>
      </div>
      <span>{{ pickup.label }}</span
      ><span v-if="active.includes(pickup.id)" class="sr-only">активен</span>
    </div>
  </div>
</template>
