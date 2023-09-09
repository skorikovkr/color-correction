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


const onCurveChanged = (ps: CubicSplineInterpolationResult) => {
  if (ctx.value != null && imageCanvas.value != null) {
    ctx.value.drawImage(img.value, 0, 0);
    const imageData = ctx.value.getImageData(0, 0, imageCanvas.value.width, imageCanvas.value.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // data[i] = 255 - data[i]; // red
      // data[i + 1] = 255 - data[i + 1]; // green
      let newBlueVal = evaluateInterpolationAtPoint(data[i+2], ps);
      if (newBlueVal != null) {
        if (newBlueVal > 255)
          newBlueVal = 255;
        if (newBlueVal < 0)
          newBlueVal = 0;
        data[i + 2] = newBlueVal;
      }
    }
    ctx.value.putImageData(imageData, 0, 0);
  }
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
