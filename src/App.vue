<script setup lang="ts">
import { computed, ref, Ref } from 'vue';
import DraggablePoint from './components/DraggablePoint.vue';
import { Point, cubicSplineInterpolation, getSVGPathForSpline } from "./utils/cubicSplineInterpolation";

type BlockableDraggablePoint = {
  x: number,
  y: number,
  blockX?: boolean,
  blockY?: boolean
};

const size = {
  width: 500,
  height: 500
};
const bounds = {
  x: [10, size.width - 10],
  y: [10, size.height - 10],
};
const pointRadius = 5;

const isOutOfBounds = (p: Point, ignoreXAxis = false, ignoreYAxis = false) => {
  if (!ignoreXAxis && (p.x < bounds.x[0] || p.x > bounds.x[1]))
    return true;
  if (!ignoreYAxis && (p.y < bounds.y[0] || p.y > bounds.y[1]))
    return true;
  return false;
}

const initialPoints : BlockableDraggablePoint[] = [
  { x: bounds.x[0], y: bounds.y[0], blockX: true },
  { x: bounds.x[1], y: bounds.y[1], blockX: true  },
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
  const currentPoint = points.value[currentDraggablePointIndex.value];
  const newXPosition = e.clientX - pointRadius;
  const newYPosition = e.clientY - pointRadius;
  if (currentPoint.blockX) {
    if (!isOutOfBounds({ x: newXPosition, y: newYPosition }, true)) {
      currentPoint.y = newYPosition;
    }
  } else {
    if (!isOutOfBounds({ x: newXPosition, y: newYPosition })) {
      currentPoint.x = newXPosition;
      currentPoint.y = newYPosition;
    }
  }
}

const handleStartDragging = (pointIndex : number) => {
  currentDraggablePointIndex.value = pointIndex;
};

const handleStopDragging = () => {
  currentDraggablePointIndex.value = null;
};

const handleNotPointMouseDown = (e : MouseEvent) => {
  const newPoint = { x: e.clientX, y: e.clientY };
  if (isOutOfBounds(newPoint))
    return;
  const tempPoints = [...points.value];
  tempPoints.push(newPoint);
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
        :radius="pointRadius"
        @startDragging="() => handleStartDragging(i)"
      />
    </svg>
  </div>
  <p>{{ points }}</p>
</template>

<style scoped>

</style>
