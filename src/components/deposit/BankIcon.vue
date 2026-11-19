<template>
  <span class="bank-icon" :class="{ 'is-default': !preset || !src }" :style="sizeStyle">
    <img v-if="preset && src" :src="src" :alt="name" />
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9.5 12 4l9 5.5v1.5H3V9.5Z" />
      <path d="M5 12h2.5v7H5zM10.75 12h2.5v7h-2.5zM16.5 12H19v7h-2.5z" />
      <path d="M3 20h18v1.6H3z" />
    </svg>
  </span>
</template>

<script lang="ts" setup>
import { computed, defineProps } from "vue";
import { resolveBankPreset } from "@/configs/BankPresets";

const props = defineProps({
  icon: { type: String, default: "" },
  name: { type: String, default: "" },
  size: { type: Number, default: 24 },
});

const iconContext = (require as any).context("@/assets/bank-icons", false, /\.svg$/);

const preset = computed(() => resolveBankPreset(props.icon, props.name));
const src = computed(() => {
  if (!preset.value) {
    return "";
  }
  const key = `./${preset.value.icon}.svg`;
  if (!iconContext.keys().includes(key)) {
    return "";
  }
  const module = iconContext(key);
  return module && (module.default || module);
});
const sizeStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<style scoped>
.bank-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
  border-radius: 6px;
  background-color: #ffffff;
}

.bank-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bank-icon.is-default {
  background-color: #f0f1f5;
  color: #9aa0ad;
}

.bank-icon svg {
  width: 62%;
  height: 62%;
  fill: currentColor;
}
</style>
