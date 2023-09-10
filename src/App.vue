<script setup lang="ts">
import { ref, onMounted } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult, evaluateInterpolationAtPoint } from './utils/cubicSplineInterpolation';

const curveCanvas = ref<InstanceType<typeof CurveCanvas>>();
const imageCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const ctx = ref<CanvasRenderingContext2D | null>();

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
          const ratioTo255 = ps[ps.length - 1].range.xmax / 256;  // assuming interpolation always start in x:0
          ctx.value.drawImage(img.value, 0, 0);
          const imageData = ctx.value.getImageData(0, 0, imageCanvas.value.width, imageCanvas.value.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (affectRedChannel)
              data[i] = correctColor(data[i], ps, ratioTo255) ?? 0;
            if (affectGreenChannel)
              data[i + 1] = correctColor(data[i+1], ps, ratioTo255) ?? 0;
            if (affectBlueChannel)
              data[i + 2] = correctColor(data[i+2], ps, ratioTo255) ?? 0;
          }
          ctx.value.putImageData(imageData, 0, 0);
        }
      }
  }, waitInterval);
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
  <canvas ref="imageCanvas"></canvas>
</template>

<style scoped>

</style>
