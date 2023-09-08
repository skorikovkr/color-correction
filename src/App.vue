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
  { x: 50, y: 50 },
  { x: 50, y: 100 },
  { x: size.height, y: size.width },
]

const points = ref(initialPoints);
const sortedPoints = computed(() => {
  const tempPoints = [...points.value];
  tempPoints.sort((p1, p2) => p1.x - p2.x);
  return tempPoints;
});
const currentDraggablePointIndex : Ref<number | null> = ref(null);

const cubicPolynomials = computed(() => {
  let prevPoint = sortedPoints.value[0];
  const tempPoints : Point[] = [{ x : sortedPoints.value[0].x, y: sortedPoints.value[0].y }];
  for (let i = 1; i < sortedPoints.value.length; i++) {
    if (prevPoint.x === sortedPoints.value[i].x)
      tempPoints.push({ x : sortedPoints.value[i].x + 1, y: sortedPoints.value[i].y });
    else
      tempPoints.push({ x : sortedPoints.value[i].x, y: sortedPoints.value[i].y });
    prevPoint = sortedPoints.value[i];
  }
  return cubicSplineInterpolation(tempPoints);
});
const svgPath = computed(() => getSVGPathForSpline(cubicPolynomials.value, sortedPoints.value));

const handleChangeCoords = (e : MouseEvent) => {
  if (currentDraggablePointIndex.value === null) return;
  const tempPoints = [...points.value];
  if (currentDraggablePointIndex.value > 0 && currentDraggablePointIndex.value < (points.value.length - 1)) {
    tempPoints[currentDraggablePointIndex.value].x = e.clientX;
  }
  tempPoints[currentDraggablePointIndex.value].y = e.clientY;
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
      />
    </svg>
  </div>
  <p>{{ points }}</p>
</template>

<style scoped>

</style>
