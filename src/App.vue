<template>
  <div class="common-layout">
    <el-container>
      <el-header>
        <TopBar></TopBar>
      </el-header>
      <el-main>
        <Home></Home>
      </el-main>
    </el-container>
  </div>
</template>

<script lang="ts" setup>
import TopBar from "./components/TopBar.vue";
import Home from "./components/MainHome.vue";
import Color from "@/configs/Color.json";
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.common-layout {
  background-color: v-bind("Color.background");
  height: calc(100vh);
}

html,
body {
  margin: 0;
}

.el-header {
  padding: 0px 0px 0px 0px !important;
}

.el-main {
  padding: 0px !important;
  margin-top: 12px;
}
</style>
