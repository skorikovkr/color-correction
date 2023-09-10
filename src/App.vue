<script setup lang="ts">
import { ref, onMounted } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult, evaluateInterpolationAtPoint } from './utils/cubicSplineInterpolation';
import './style.css';

const curveCanvas = ref<InstanceType<typeof CurveCanvas>>();
const imageCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const ctx = ref<CanvasRenderingContext2D | null>();
const curveCanvasSize = {
  height: 512,
  width: 512,
}
const ratioTo255 = curveCanvasSize.width / 256;  // assuming interpolation always start in x:0

const img = ref<HTMLImageElement>(new Image());
img.value.src = "/src/assets/example.jpg";

onMounted(() => {
  if (imageCanvas.value != null) {
    imageCanvas.value.width = 512;
    imageCanvas.value.height = 512;
    ctx.value = imageCanvas.value.getContext("2d", { willReadFrequently: true });
    img.value.onload = () => {
      ctx.value?.drawImage(img.value, 0, 0);
    };
  }
})

const affectRedChannel = true;
const affectGreenChannel = true;
const affectBlueChannel = true;

const correctColor = (oldValue: number, ps: CubicSplineInterpolationResult, ratioTo255 = 1) => {
  let newBlueVal = evaluateInterpolationAtPoint(oldValue * ratioTo255, ps) / ratioTo255;
  if (newBlueVal - 255 > 1e-8)
    newBlueVal = 255;
  if (newBlueVal < 1e-8)
    newBlueVal = 0;
  return newBlueVal;
}

let lastRerenderTime = Date.now();
const waitInterval = 200;
const onCurveChanged = (ps: CubicSplineInterpolationResult) => {
  lastRerenderTime = Date.now();
  setTimeout(() => {
      const rerenderTime = Date.now();
      if ((rerenderTime - lastRerenderTime) >= waitInterval) {
        if (ctx.value != null && imageCanvas.value != null) {
          ctx.value.drawImage(img.value, 0, 0);
          const imageData = ctx.value.getImageData(0, 0, imageCanvas.value.width, imageCanvas.value.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (affectRedChannel)
              data[i] = correctColor(data[i], ps, ratioTo255) ?? 0;
            if (affectGreenChannel)
              data[i+1] = correctColor(data[i+1], ps, ratioTo255) ?? 0;
            if (affectBlueChannel)
              data[i+2] = correctColor(data[i+2], ps, ratioTo255) ?? 0;
          }
          ctx.value.putImageData(imageData, 0, 0);
        }
      }
  }, waitInterval);
}

const handleClick = () => {
  curveCanvas.value?.reset();
};

const handleNegativeClick = () => {
  curveCanvas.value?.set([
    { x: 0, y: curveCanvasSize.height }, 
    { x: curveCanvasSize.width, y: 0 }
  ]);
}

const handleContrastClick = () => {
  const contrastValue = 50;
  curveCanvas.value?.set([
    { x: 0, y: 0 }, 
    { x: curveCanvasSize.width * 1/4, y: curveCanvasSize.height * 1/4 - contrastValue}, 
    { x: curveCanvasSize.width * 3/4, y: curveCanvasSize.height * 3/4 + contrastValue }, 
    { x: curveCanvasSize.width, y: curveCanvasSize.height }
  ]);
}

const handleDecontrastClick = () => {
  const decontrastValue = 50;
  curveCanvas.value?.set([
    { x: 0, y: 0 }, 
    { x: curveCanvasSize.width * 1/4, y: curveCanvasSize.height * 1/4 + decontrastValue }, 
    { x: curveCanvasSize.width * 3/4, y: curveCanvasSize.height * 3/4 - decontrastValue }, 
    { x: curveCanvasSize.width, y: curveCanvasSize.height }
  ]);
}
</script>

<template>
  <div class="flex gap-2 flex-auto">
    <CurveCanvas 
      ref="curveCanvas"
      :size="{
        height: curveCanvasSize.height,
        width: curveCanvasSize.width,
      }"
      @curve-changed="onCurveChanged"
    />
    <canvas ref="imageCanvas"></canvas>
  </div>
  <div class="toolbox">
    <button @click="handleClick">Reset</button>
    <button @click="handleNegativeClick">Negative</button>
    <button @click="handleContrastClick">Contrast</button>
    <button @click="handleDecontrastClick">Decontrast</button>
  </div>
</template>

<style scoped>

</style>
