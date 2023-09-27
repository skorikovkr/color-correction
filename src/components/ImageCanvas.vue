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

const viewCanvas = ref<InstanceType<typeof HTMLCanvasElement>>();
const inMemCanvas = document.createElement("canvas");
let inMemContext: CanvasRenderingContext2D | null = null;
let viewContext: CanvasRenderingContext2D | null = null;
let img = ref(new Image());
const isDragging = ref(false);
const dragStartPosition = ref<DOMPoint | null>(new DOMPoint(0, 0));
const currentCursor = ref<DOMPoint | null>(null);
const zoomMulti = ref(1);

onMounted(() => {
  if (viewCanvas.value == null || inMemCanvas == null)
    throw new Error("Error initializing canvas.");
  viewContext = viewCanvas.value.getContext("2d", { willReadFrequently: true });
  inMemContext = inMemCanvas.getContext("2d", { willReadFrequently: true });
  if (inMemContext == null || viewContext == null)
    throw new Error("Error getting canvas context.");
  viewCanvas.value.width = props.width;
  viewCanvas.value.height = props.height;
});

const getTransformedPoint = (x: number, y: number) => {
  if (viewContext == null) return null;
  const originalPoint = new DOMPoint(x, y);
  return viewContext?.getTransform().invertSelf().transformPoint(originalPoint);
}

const handleMouseDown = (e: MouseEvent) => {
  if (e.button == 0 && e.shiftKey) {
    if (viewCanvas.value == null || viewContext == null) return;
    isDragging.value = true;
    dragStartPosition.value = getTransformedPoint(e.offsetX, e.offsetY);
  }
}

const handleMouseMove = (e: MouseEvent) => {
  currentCursor.value = new DOMPoint(e.offsetX, e.offsetY);
  if (e.button == 0 && e.shiftKey) {
    if (isDragging.value && viewContext != null && currentCursor.value != null && dragStartPosition.value != null) {
      const currentTransformedCursor = getTransformedPoint(currentCursor.value.x, currentCursor.value.y);
      if (currentTransformedCursor == null) return;
      translateViewAbsolute(
        currentTransformedCursor.x - dragStartPosition.value.x,
        currentTransformedCursor.y - dragStartPosition.value.y
      );
      redrawView();
    }
  }
}

const handleMouseUp = () => {
  isDragging.value = false;
}

const handleWheel = (e: WheelEvent) => {
  if (currentCursor.value == null) return;
  const zoom: number = e.deltaY < 0 ? 1.1 : 0.9;
  zoomViewToPoint(zoomMulti.value * zoom, currentCursor.value.x, currentCursor.value.y);
  redrawView();
  e.preventDefault();
}

const zoomViewToPoint = (scale: number, originX: number, originY: number) => {
  if (viewContext == null) return;
  const currentTransformedCursor = getTransformedPoint(originX, originY);
  if (currentTransformedCursor == null) return;
  viewContext.translate(currentTransformedCursor.x, currentTransformedCursor.y);
  const prevDOMMatrix = viewContext.getTransform();
  prevDOMMatrix.a = 1;
  prevDOMMatrix.d = 1;
  viewContext.setTransform(prevDOMMatrix);
  viewContext.scale(scale, scale);
  viewContext.translate(-currentTransformedCursor.x, -currentTransformedCursor.y);
  zoomMulti.value = scale;
}

const translateViewAbsolute = (x: number, y: number) => {
  if (viewContext == null) return;
  viewContext.translate(x, y);
}

const translateViewToPoint = (x: number, y: number) => {
  if (viewContext == null) return;
  const currentTransformedCursor = getTransformedPoint(x, y);
  if (currentTransformedCursor == null) return;
  translateViewAbsolute(currentTransformedCursor.x, currentTransformedCursor.y);
}

const loadImage = (file: File) => {
  img.value.src = URL.createObjectURL(file);
  let imageData: ImageData | null = null;
  if (viewCanvas.value != null) {
    img.value.onload = () => {
      if (viewContext == null || inMemContext == null)
        throw new Error("Canvas context is null.");
      inMemCanvas.width = img.value.width;
      inMemCanvas.height = img.value.height;
      inMemContext.drawImage(img.value, 0, 0)
      imageData = inMemContext.getImageData(0, 0, img.value.width, img.value.height);
      emit('imageLoaded', imageData);
    };
  }
};

const draw = (data: ImageData | null) => {
  if (viewContext == null || inMemContext == null) return;
  if (data == null) return;
  inMemContext.putImageData(data, 0, 0);
  redrawView();
}

const redrawView = () => {
  if (viewContext == null || inMemContext == null) return;
  viewContext.save();
  viewContext.setTransform(1, 0, 0, 1, 0, 0);
  viewContext.fillStyle = props.bgColor;
  viewContext.fillRect(0, 0, props.width, props.height);
  viewContext.restore();
  viewContext.imageSmoothingEnabled = false;
  viewContext.drawImage(inMemCanvas, 0, 0);
}

defineExpose({
  draw,
  loadImage,
  img,
  redrawView,
  translateViewToPoint,
  zoomViewToPoint
});
</script>

<template>
  <canvas ref="viewCanvas" :style="{ imageRendering: zoomMulti > 3 ? 'pixelated' : 'auto' }" @mousedown="handleMouseDown"
    @mouseup="handleMouseUp" @mousemove="handleMouseMove" @mouseleave="handleMouseUp" @wheel="handleWheel"></canvas>
</template>

<style scoped></style>
