<template>
  <button class="button" :disabled="disabled" @click="clickHandler">
    {{ buttonText }}
  </button>
</template>

<script lang="ts" setup>
import { PropType, defineProps, toRefs } from "vue";
import Color from "@/configs/Color.json";
const props = defineProps({
  buttonWidth: {
    type: String,
    default: "100px",
  },
  buttonHeight: {
    type: String,
    default: "40px",
  },
  buttonText: {
    type: String,
    default: "Click me",
  },
  textFontSize: {
    type: String,
    default: "13px",
  },
  buttonType: {
    type: String as PropType<"primary" | "success" | "delete">,
    default: "primary",
  },
  clickHandler: {
    type: Function as PropType<() => void>,
    default: () => {},
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const { buttonWidth, buttonHeight, textFontSize } = toRefs(props);

function backgroundColor() {
  const buttonType = props.buttonType;
  if (typeof buttonType === "string" && buttonType === "primary") {
    return Color.primary;
  } else if (typeof buttonType === "string" && buttonType === "success") {
    return Color.success;
  } else if (typeof buttonType === "string" && buttonType === "delete") {
    return Color.delete;
  } else {
    return Color.text;
  }
}
</script>

<style scoped>
.button {
  width: v-bind("buttonWidth");
  height: v-bind("buttonHeight");
  background-color: v-bind("backgroundColor()");
  border: 0px;
  border-radius: 8px;
  box-shadow: 0px 1px 2px rgba(27, 31, 39, 0.12);
  color: white;
  font-family: inherit;
  font-size: v-bind("textFontSize");
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
}

.button:not(:disabled):hover {
  filter: brightness(1.06);
  box-shadow: 0px 2px 6px rgba(27, 31, 39, 0.16);
}

.button:active {
  transform: scale(0.97); /* 定义点击时的缩放效果 */
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
@/configs/Color.json
