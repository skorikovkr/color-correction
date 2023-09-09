<script setup lang="ts">
import { ref, onMounted } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult } from './utils/cubicSplineInterpolation';

const polynomials = ref<CubicSplineInterpolationResult>([]);
const curveCanvas = ref<InstanceType<typeof CurveCanvas>>();


onMounted(() => {
  const canvas = (document.getElementById('imageCanvas') as HTMLCanvasElement);
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
  };
  img.src = "/src/assets/example.jpg";
})

const onCurveChanged = (ps: CubicSplineInterpolationResult) => {
  polynomials.value = [...ps];
}

const handleClick = () => {
  curveCanvas.value?.reset();
};
</script>

<template>
  <CurveCanvas 
    ref="curveCanvas"
    @curve-changed="onCurveChanged"
  />
  <button @click="handleClick">Reset</button>
  <canvas id="imageCanvas"></canvas>
</template>

<style scoped>

</style>
