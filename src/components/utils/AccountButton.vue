<template>
  <button class="button" @click="clickHandler">{{ buttonText }}</button>
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
    default: "16px",
  },
  buttonType: {
    type: String as PropType<"primary" | "success" | "delete">,
    default: "primary",
  },
  clickHandler: {
    type: Function as PropType<() => void>,
    default: () => {},
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
  border-radius: 10px;
  box-shadow: 0px 3px 12px rgba(0, 0, 0, 0.25);
  color: white;
  font-size: v-bind("textFontSize");
  transition: transform 0.1s ease;
}

.button:active {
  transform: scale(0.95); /* 定义点击时的缩放效果 */
}
</style>
@/configs/Color.json
