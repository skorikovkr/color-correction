<script setup lang="ts">
import { ref, onMounted } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult, evaluateInterpolationAtPoint } from './utils/cubicSplineInterpolation';
import './style.css';

const curveCanvas = ref<InstanceType<typeof CurveCanvas>>();
const imageCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const ctx = ref<CanvasRenderingContext2D | null>();
const curveCanvasSize = 256;
const ratioTo255 = curveCanvasSize / 256;  // assuming interpolation always start in x:0
const colorCount = {
  R: Array.from({ length: 256 }, () => 0),
  G: Array.from({ length: 256 }, () => 0),
  B: Array.from({ length: 256 }, () => 0),
  RGB: Array.from({ length: 256 }, () => 0),
  maxR: 0,
  maxG: 0,
  maxB: 0,
  maxRGB: 0,
};

const img = ref<HTMLImageElement>(new Image());
img.value.src = "/src/assets/example.jpg";

onMounted(() => {
  if (imageCanvas.value != null) {
    imageCanvas.value.width = 512;
    imageCanvas.value.height = 512;
    ctx.value = imageCanvas.value.getContext("2d", { willReadFrequently: true });
    img.value.onload = () => {
      ctx.value?.drawImage(img.value, 0, 0);
      const imageData = ctx.value?.getImageData(0, 0, img.value.width, img.value.height);
      const data = imageData?.data;
      if (data) {
        for (let i = 0; i < data.length; i += 4) {
          colorCount.R[data[i]]++;
          if (colorCount.R[data[i]] > colorCount.maxR)
            colorCount.maxR = colorCount.R[data[i]];

          colorCount.G[data[i+1]]++;
          if (colorCount.G[data[i+1]] > colorCount.maxG)
            colorCount.maxG = colorCount.G[data[i+1]];

          colorCount.B[data[i+2]]++;
          if (colorCount.B[data[i+2]] > colorCount.maxB)
            colorCount.maxB = colorCount.B[data[i+2]];

          colorCount.RGB[data[i]]++;
          colorCount.RGB[data[i+1]]++;
          colorCount.RGB[data[i+2]]++;
          if (colorCount.RGB[data[i]] > colorCount.maxRGB)
            colorCount.maxRGB = colorCount.RGB[data[i]];
          if (colorCount.RGB[data[i+1]] > colorCount.maxRGB)
            colorCount.maxRGB = colorCount.RGB[data[i+1]];
          if (colorCount.RGB[data[i+2]] > colorCount.maxRGB)
            colorCount.maxRGB = colorCount.RGB[data[i+2]];
        }
      }
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
    { x: 0, y: curveCanvasSize }, 
    { x: curveCanvasSize, y: 0 }
  ]);
}

const handleContrastClick = () => {
  const contrastValue = curveCanvasSize / 8;
  curveCanvas.value?.set([
    { x: 0, y: 0 }, 
    { x: curveCanvasSize * 1/4, y: curveCanvasSize * 1/4 - contrastValue}, 
    { x: curveCanvasSize * 3/4, y: curveCanvasSize * 3/4 + contrastValue }, 
    { x: curveCanvasSize, y: curveCanvasSize }
  ]);
}

const handleDecontrastClick = () => {
  const decontrastValue = curveCanvasSize / 8;
  curveCanvas.value?.set([
    { x: 0, y: 0 }, 
    { x: curveCanvasSize * 1/4, y: curveCanvasSize * 1/4 + decontrastValue }, 
    { x: curveCanvasSize * 3/4, y: curveCanvasSize * 3/4 - decontrastValue }, 
    { x: curveCanvasSize, y: curveCanvasSize }
  ]);
}
</script>

<template>
  <div class="flex gap-2 flex-auto">
    <CurveCanvas 
      ref="curveCanvas"
      :size="curveCanvasSize"
      :colorHistogram="colorCount"
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
