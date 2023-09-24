<script setup lang="ts">
import { onMounted, ref } from 'vue'; 

const imageCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const inMemCanvas = document.createElement("canvas");
let inMemContext : CanvasRenderingContext2D | null = null;
let viewContext : CanvasRenderingContext2D | null = null;
let img = new Image();
const bgColor = "#FAFAFA";
const canvasWidth = 1000;
const canvasHeight = 1000;

const emit = defineEmits<{
  (e: 'imageLoaded', data: ImageData): void
}>()

onMounted(() => {
  if (imageCanvas.value == null || inMemCanvas == null)
    throw new Error("Error initializing canvas.");
  viewContext = imageCanvas.value.getContext("2d", { willReadFrequently: true });
  inMemContext = inMemCanvas.getContext("2d", { willReadFrequently: true });
  if (inMemContext == null || viewContext == null)
    throw new Error("Error getting canvas context.");
  imageCanvas.value.width = canvasWidth;
  imageCanvas.value.height = canvasHeight;
});

const loadImage = (file: File) => {
  img.src = URL.createObjectURL(file);
  let imageData : ImageData | null = null;
  if (imageCanvas.value != null) {
    img.onload = () => {
      if (viewContext == null || inMemContext == null)
        throw new Error("Canvas context is null.");
      inMemCanvas.width = img.width;
      inMemCanvas.height = img.height;
      inMemContext.drawImage(img, 0, 0)
      imageData = inMemContext.getImageData(0, 0, img.width, img.height);
      emit('imageLoaded', imageData);
    };
  }
};

const draw = (data : ImageData) => {
  if (viewContext == null || data == null || inMemContext == null) return;
  inMemContext.putImageData(data, 0, 0);
  viewContext.fillStyle = bgColor;
  viewContext.fillRect(0, 0, canvasWidth, canvasHeight);
  viewContext.imageSmoothingEnabled = false;
  viewContext.setTransform(30, 0, 0, 30, 0, 0);
  viewContext.drawImage(inMemCanvas, 0, 0);
}

defineExpose({
    draw,
    loadImage
});
</script>

<template>
    <canvas 
      ref="imageCanvas" 
      style="image-rendering: pixelated;"
    ></canvas>
</template>

<style scoped>

</style>
