<script setup lang="ts">
import { computed, ref, Ref } from 'vue';
import DraggablePoint from './components/DraggablePoint.vue';
import { Point, cubicSplineInterpolation, getSVGPathForSpline } from "./utils/cubicSplineInterpolation";

const size = {
  width: 500,
  height: 500
};

const initialPoints : Point[] = [
  { x: 0, y: 0 },
  { x: size.height, y: size.width },
]

const points = ref(initialPoints);
const currentDraggablePointIndex : Ref<number | null> = ref(null);

const cubicPolynomials = computed(() => cubicSplineInterpolation(points.value));
const svgPath = computed(() => getSVGPathForSpline(cubicPolynomials.value, points.value));

const isMonotonic = (seq : Point[]) => seq.every((e, i, a) => i ? e.x >= a[i-1].x : true) || seq.every((e, i, a) => i ? e.x <= a[i-1].x : true);

const handleChangeCoords = (e : MouseEvent) => {
  if (currentDraggablePointIndex.value === null) return;
  const tempPoints = [...points.value];
  if (currentDraggablePointIndex.value !== 0 && currentDraggablePointIndex.value !== (points.value.length - 1)) {
    tempPoints[currentDraggablePointIndex.value].x = e.clientX;
  }
  tempPoints[currentDraggablePointIndex.value].y = e.clientY;
  if (!isMonotonic(tempPoints)) {
    tempPoints.sort((p1, p2) => p1.x - p2.x);
    currentDraggablePointIndex.value = tempPoints.findIndex(p => p.x === e.clientX && p.y === e.clientY);
  }
  let prevPoint = tempPoints[0];

  // prevent distortion on points x equality
  // ДОДЕЛАТЬ
  for (let i = 1; i < tempPoints.length; i++) {
    if (prevPoint.x === tempPoints[i].x)
      tempPoints[i].x = tempPoints[i].x + 1;
    prevPoint = tempPoints[i];
  }
  points.value = tempPoints;
}

const handleStartDragging = (pointIndex : number) => {
  currentDraggablePointIndex.value = pointIndex;
};

const handleStopDragging = () => {
  currentDraggablePointIndex.value = null;
};

const handleNotPointMouseDown = (e : MouseEvent) => {
  const tempPoints = [...points.value];
  tempPoints.push({ x: e.clientX, y: e.clientY });
  tempPoints.sort((p1, p2) => p1.x - p2.x);
  points.value = tempPoints;
}
</script>

<template>
  <div :style="{ height: size.height+'px', width: size.width+'px', backgroundColor: '#5C5C5C', position: 'relative'}"
    @mouseup="handleStopDragging"
    @mousemove="handleChangeCoords"
    @mousedown="handleNotPointMouseDown"
  >
    <svg :style="{height: '100%', width: '100%', backgroundColor: '#5C5C5C'}">
      <path :d="svgPath" fill="none" stroke="#FAFAFA" stroke-width="2"></path>
      <DraggablePoint 
        v-for="(p, i) in points" 
        :key="i"
        :point="p" 
        @startDragging="() => handleStartDragging(i)"
      >
      </DraggablePoint>
    </svg>
  </div>
  <p>{{ points }}</p>
</template>

<style scoped>

</style>
