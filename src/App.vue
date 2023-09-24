<script setup lang="ts">
import { onMounted, ref } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult, evaluateInterpolationAtPoint } from './utils/cubicSplineInterpolation';
import './style.css';

const curveCanvas = ref<InstanceType<typeof CurveCanvas>>();
const imageCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const inMemCanvas = document.createElement("canvas");
let inMemContext : CanvasRenderingContext2D | null = null;
let savedImageData : ImageData | null = null;
let tempImageData : ImageData | null = null;
const ctx = ref<CanvasRenderingContext2D | null>();
const curveColor = ref('#FAFAFA');
const curveCanvasSize = 256;
const canvasSizeRatioTo255 = curveCanvasSize / 256;  // assuming interpolation always start in x:0
const colorCount = ref({
  R: Array.from({ length: 256 }, () => 0),
  G: Array.from({ length: 256 }, () => 0),
  B: Array.from({ length: 256 }, () => 0),
  RGB: Array.from({ length: 256 }, () => 0),
  maxR: 0,
  maxG: 0,
  maxB: 0,
  maxRGB: 0,
});
const defaultColor = "#FAFAFA";
const canvasWidth = 1000;
const canvasHeight = 1000;

const img = ref<HTMLImageElement>(new Image());

onMounted(() => {
  if (imageCanvas.value == null || inMemCanvas == null)
    throw new Error("Error initializing canvas.");
  ctx.value = imageCanvas.value.getContext("2d", { willReadFrequently: true });
  inMemContext = inMemCanvas.getContext("2d", { willReadFrequently: true });
  if (inMemContext == null || ctx.value == null)
    throw new Error("Error getting canvas context.");
  imageCanvas.value.width = canvasWidth;
  imageCanvas.value.height = canvasHeight;
  draw();
});

const createColorHist = (data: Uint8ClampedArray) => {
  const colorCountTemp = {
    R: Array.from({ length: 256 }, () => 0),
    G: Array.from({ length: 256 }, () => 0),
    B: Array.from({ length: 256 }, () => 0),
    RGB: Array.from({ length: 256 }, () => 0),
    maxR: 0,
    maxG: 0,
    maxB: 0,
    maxRGB: 0,
  };
  for (let i = 0; i < data.length; i += 4) {
    colorCountTemp.R[data[i]]++;
    if (colorCountTemp.R[data[i]] > colorCountTemp.maxR)
    colorCountTemp.maxR = colorCountTemp.R[data[i]];

    colorCountTemp.G[data[i+1]]++;
    if (colorCountTemp.G[data[i+1]] > colorCountTemp.maxG)
    colorCountTemp.maxG = colorCountTemp.G[data[i+1]];

    colorCountTemp.B[data[i+2]]++;
    if (colorCountTemp.B[data[i+2]] > colorCountTemp.maxB)
    colorCountTemp.maxB = colorCountTemp.B[data[i+2]];

    colorCountTemp.RGB[data[i]]++;
    colorCountTemp.RGB[data[i+1]]++;
    colorCountTemp.RGB[data[i+2]]++;
    if (colorCountTemp.RGB[data[i]] > colorCountTemp.maxRGB)
    colorCountTemp.maxRGB = colorCountTemp.RGB[data[i]];
    if (colorCountTemp.RGB[data[i+1]] > colorCountTemp.maxRGB)
    colorCountTemp.maxRGB = colorCountTemp.RGB[data[i+1]];
    if (colorCountTemp.RGB[data[i+2]] > colorCountTemp.maxRGB)
    colorCountTemp.maxRGB = colorCountTemp.RGB[data[i+2]];
  }
  colorCount.value = colorCountTemp;
}

const handleOpenImage = (e: Event) => {
  if (e.target != null) {
    const files = (e.target as HTMLInputElement)?.files;
    if (files == null) return;
    const file = files[0];
    loadImage(file);
  }
} 

const loadImage = (file: File) => {
  img.value.src = URL.createObjectURL(file);
  if (imageCanvas.value != null) {
    img.value.onload = () => {
      if (ctx.value == null || inMemContext == null)
        throw new Error("Canvas context is null.");
      inMemCanvas.width = img.value.width;
      inMemCanvas.height = img.value.height;
      inMemContext.drawImage(img.value, 0, 0)
      const imageData = inMemContext.getImageData(0, 0, img.value.width, img.value.height);
      createColorHist(imageData.data);
      savedImageData = new ImageData(imageData.data, img.value.width, img.value.height);
      tempImageData = new ImageData(imageData.data, img.value.width, img.value.height);
      draw();
    };
  }
};

const affectRedChannel = ref(true);
const affectGreenChannel = ref(true);
const affectBlueChannel = ref(true);

const correctColor = (
  oldValue: number, 
  valueMapperFunction: (value: number) => number,
  ratioTo255: number
) => {
  let newVal = valueMapperFunction(oldValue * ratioTo255) / ratioTo255;
  if (newVal - 255 > 1e-8)
    newVal = 255;
  if (newVal < 1e-8)
    newVal = 0;
  return newVal;
}

const render = (
  redChannel: boolean, greenChannel: boolean, blueChannel: boolean,
  redMapperFunction: (value: number) => number, greenMapperFunction: (value: number) => number, blueMapperFunction: (value: number) => number,
) => {
  const rerenderTime = Date.now();
  if ((rerenderTime - lastRerenderTime) >= waitInterval) {
    if (ctx.value != null && imageCanvas.value != null) {
      if (savedImageData == null) return;
      const data = new Uint8ClampedArray(savedImageData.data);
      for (let i = 0; i < data.length; i += 4) {
        if (redChannel)
          data[i] = correctColor(data[i], redMapperFunction, canvasSizeRatioTo255) ?? 0;
        if (greenChannel)
          data[i+1] = correctColor(data[i+1], greenMapperFunction, canvasSizeRatioTo255) ?? 0;
        if (blueChannel)
          data[i+2] = correctColor(data[i+2], blueMapperFunction, canvasSizeRatioTo255) ?? 0;
      }
      tempImageData = new ImageData(data, img.value.width);
      draw();
    }
  }
}

let lastRerenderTime = Date.now();
const waitInterval = 100;
const onCurveChanged = (ps: CubicSplineInterpolationResult) => {
  lastRerenderTime = Date.now();
  const redChannel = affectRedChannel.value;
  const greenChannel = affectGreenChannel.value;
  const blueChannel = affectBlueChannel.value;
  const redMapperFunction = (val: number) => evaluateInterpolationAtPoint(val, ps);
  const greenMapperFunction = (val: number) => evaluateInterpolationAtPoint(val, ps);
  const blueMapperFunction = (val: number) => evaluateInterpolationAtPoint(val, ps);
  setTimeout(() => {
    render(redChannel, greenChannel, blueChannel, redMapperFunction, greenMapperFunction, blueMapperFunction);
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

const handleRGBChannelClick = () => {
  curveColor.value = '#FAFAFA';
  affectRedChannel.value = true;
  affectGreenChannel.value = true;
  affectBlueChannel.value = true;
}

const handleRChannelClick = () => {
  curveColor.value = '#FF0000';
  affectRedChannel.value = true;
  affectGreenChannel.value = false;
  affectBlueChannel.value = false;
}

const handleGChannelClick = () => {
  curveColor.value = '#00FF00';
  affectRedChannel.value = false;
  affectGreenChannel.value = true;
  affectBlueChannel.value = false;
}

const handleBChannelClick = () => {
  curveColor.value = '#148aff';
  affectRedChannel.value = false;
  affectGreenChannel.value = false;
  affectBlueChannel.value = true;
}

function draw() {
  if (ctx.value == null || savedImageData == null || inMemContext == null) return;
  inMemContext.putImageData(tempImageData ?? savedImageData, 0, 0);
  ctx.value.fillStyle = defaultColor;
  ctx.value.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.value.imageSmoothingEnabled = false;
  ctx.value.setTransform(100, 0, 0, 100, 0, 0);
  ctx.value.drawImage(inMemCanvas, 0, 0);
}
</script>

<template>
  <input type="file" @change="handleOpenImage"/>
  <div class="flex gap-2 flex-auto mt-2">
    <div>
      <CurveCanvas 
        ref="curveCanvas"
        :size="curveCanvasSize"
        :colorHistogram="colorCount"
        :curve-color="curveColor"
        @curve-changed="onCurveChanged"
      />
      <span>Presets:</span>
      <div class="toolbox flex gap-2 ml-2 flex-auto">
        <button @click="handleClick">Reset</button>
        <button @click="handleNegativeClick">Negative</button>
        <button @click="handleContrastClick">Contrast</button>
        <button @click="handleDecontrastClick">Decontrast</button>
      </div>
      <span>Channels:</span>
      <div class="channels flex gap-2 ml-2 flex-auto">
        <button @click="handleRGBChannelClick">RGB</button>
        <button @click="handleRChannelClick">R</button>
        <button @click="handleGChannelClick">G</button>
        <button @click="handleBChannelClick">B</button>
      </div>
    </div>
    <canvas 
      ref="imageCanvas" 
      style="image-rendering: pixelated;"
    ></canvas>
  </div>
</template>

<style scoped>

</style>
