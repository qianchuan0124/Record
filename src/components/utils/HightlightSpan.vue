<template>
  <div>
    <span
      :class="item.isHightlight ? 'hightLight' : 'normal'"
      v-for="(item, index) in textData"
      :key="index">
      {{ item.content }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref, onMounted, watch } from "vue";
import Color from "@/configs/Color.json";

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  keyword: {
    type: String,
    default: "",
  },
  fontSize: {
    type: String,
    default: "16px",
  },
});

const textData = ref<HightlightItem[]>([]);

interface HightlightItem {
  content: string;
  isHightlight: boolean;
}

const highlightKeywords = () => {
  const content = props.content;
  const keyword = props.keyword;
  // 使用正则表达式将content按照keyword进行拆分
  const reg = new RegExp(`(${keyword})`, "g");
  const result: HightlightItem[] = content.split(reg).map((item) => {
    return {
      content: item,
      isHightlight: item === keyword,
    };
  });
  textData.value = result;
};

// 在组件挂载时执行一次高亮操作
onMounted(highlightKeywords);

// 监听props.content和props.keyword的变化
watch([() => props.content, () => props.keyword], highlightKeywords);
</script>

<style>
.hightLight {
  color: v-bind("Color.success");
}

.normal {
  color: v-bind("Color.text");
}
</style>
@/configs/Color.json
