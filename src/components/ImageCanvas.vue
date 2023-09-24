<script setup lang="ts">
import { onMounted, ref } from 'vue'; 

const props = defineProps({
  height: {
    type: Number,
    default: 500
  },
  width: {
    type: Number,
    default: 500
  },
  bgColor: {
    type: String,
    default: '#AAAAAA'
  }
});

const emit = defineEmits<{
  (e: 'imageLoaded', data: ImageData): void
}>()

const imageCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const inMemCanvas = document.createElement("canvas");
let inMemContext : CanvasRenderingContext2D | null = null;
let viewContext : CanvasRenderingContext2D | null = null;
let img = new Image();
const isDragging = ref(false);
const dragStartPosition = ref<DOMPoint | null>(new DOMPoint(0, 0));
const currentTransformedCursor = ref<DOMPoint | null>(null);

const getTransformedPoint = (x : number, y: number) => {
  if (viewContext == null) return null;
  const originalPoint = new DOMPoint(x, y);
  return viewContext?.getTransform().invertSelf().transformPoint(originalPoint);
}
    
const handleMouseDown = (e : MouseEvent) => {
  if (imageCanvas.value == null || viewContext == null) return;
  isDragging.value = true;
  dragStartPosition.value = getTransformedPoint(e.offsetX, e.offsetY);
}

const handleMouseMove = (e: MouseEvent) => {
  currentTransformedCursor.value = getTransformedPoint(e.offsetX, e.offsetY);
  if (isDragging.value && viewContext != null && currentTransformedCursor.value != null && dragStartPosition.value != null) {
      viewContext.translate(
        currentTransformedCursor.value.x - dragStartPosition.value.x, 
        currentTransformedCursor.value.y - dragStartPosition.value.y
      );
      redrawImageCanvas();
    }
}

const handleMouseUp = () => {
  isDragging.value = false;
}

const handleWheel = (e : WheelEvent) => {
  if (viewContext == null || currentTransformedCursor.value == null) return;
  const zoom = e.deltaY < 0 ? 1.1 : 0.9;
  viewContext.translate(currentTransformedCursor.value.x, currentTransformedCursor.value.y);
  viewContext.scale(zoom, zoom);
  viewContext.translate(-currentTransformedCursor.value.x, -currentTransformedCursor.value.y);
  redrawImageCanvas();
  e.preventDefault();
}

onMounted(() => {
  if (imageCanvas.value == null || inMemCanvas == null)
    throw new Error("Error initializing canvas.");
  viewContext = imageCanvas.value.getContext("2d", { willReadFrequently: true });
  inMemContext = inMemCanvas.getContext("2d", { willReadFrequently: true });
  if (inMemContext == null || viewContext == null)
    throw new Error("Error getting canvas context.");
  imageCanvas.value.width = props.width;
  imageCanvas.value.height = props.height;
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

const draw = (data : ImageData | null) => {
  if (viewContext == null || inMemContext == null) return;
  viewContext.fillStyle = props.bgColor;
  viewContext.fillRect(0, 0, props.width, props.height);
  if (data == null) return;
  inMemContext.putImageData(data, 0, 0);
  redrawImageCanvas();
}

const redrawImageCanvas = () => {
  if (viewContext == null || inMemContext == null) return;
  viewContext.save();
  viewContext.setTransform(1,0,0,1,0,0);
  viewContext.fillStyle = props.bgColor;
  viewContext.fillRect(0, 0, props.width, props.height);
  viewContext.restore();
  viewContext.imageSmoothingEnabled = false;
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
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseUp"
      @wheel="handleWheel"
    ></canvas>
</template>

<style scoped>

</style>
