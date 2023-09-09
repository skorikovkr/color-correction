<script setup lang="ts">
import { computed, ref, Ref, PropType } from 'vue';
import DraggablePoint from './DraggablePoint.vue';
import { CubicSplineInterpolationResult, Point, cubicSplineInterpolation, getSVGPathForSpline } from "../utils/cubicSplineInterpolation";
import { solveCubic } from '../utils/cubicSolver';

type BlockableDraggablePoint = {
  x: number,
  y: number,
  blockX?: boolean,
  blockY?: boolean
};

type Size = {
    height: number,
    width: number
}

const props = defineProps({
    size: {
        type: Object as PropType<Size>,
        default: {
            width: 500,
            height: 500
        }
    },
    pointRadius: {
        type: Number,
        default: 7
    },
});

const emit = defineEmits<{
  (e: 'curveChanged', polynomials: CubicSplineInterpolationResult): void
}>()

const isOutOfBounds = (p: Point, ignoreXAxis = false, ignoreYAxis = false) => {
  if (!ignoreXAxis && (p.x < 0 || p.x > props.size.width))
    return true;
  if (!ignoreYAxis && (p.y < 0 || p.y > props.size.height))
    return true;
  return false;
}

const initialPoints : BlockableDraggablePoint[] = [
  { x: 0, y: 0, blockX: true },
  { x: props.size.width, y: props.size.height, blockX: true  },
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
  // avoid curve distortion on two point.x equality
  const tempPoints : Point[] = [{ x : sortedPoints.value[0].x, y: sortedPoints.value[0].y }];
  for (let i = 1; i < sortedPoints.value.length; i++) {
    if (prevPoint.x === sortedPoints.value[i].x)
      tempPoints.push({ x : sortedPoints.value[i].x + 1, y: sortedPoints.value[i].y });
    else
      tempPoints.push({ x : sortedPoints.value[i].x, y: sortedPoints.value[i].y });
    prevPoint = sortedPoints.value[i];
  }
  const result = cubicSplineInterpolation(tempPoints)
  emit('curveChanged', result);
  return result;
});

const svgPath = computed(() => getSVGPathForSpline(cubicPolynomials.value, sortedPoints.value));

// Line to show culling negatives to zero or max value
const curveOutOfBoundPoints = computed(() => {
  const pointsOutOfBounds : Point[][] = [];
  // with lower bound
  cubicPolynomials.value.forEach(p => {
    const solutionsWithZero = solveCubic(p.polynomial.A, p.polynomial.B, p.polynomial.C, p.polynomial.D);
    if (solutionsWithZero.length < 2) return;  // avoid unnecessary calculations
    const cubicSolutions : Point[] = [];
    solutionsWithZero.forEach(point => {
      if (point >= p.range.xmin && point <= p.range.xmax)
        cubicSolutions.push({ x: point, y: 0 });
    });
    if (cubicSolutions.length == 2)  // we want to draw line between only two points
      pointsOutOfBounds.push(cubicSolutions);
  });
  // with upper bound
  cubicPolynomials.value.forEach(p => {
    const upperD = p.polynomial.D - props.size.height - 0.5;  // find solution on a little lower height for prettier look
    const solutionsWithMax = solveCubic(p.polynomial.A, p.polynomial.B, p.polynomial.C, upperD);
    if (solutionsWithMax.length < 2) return;  // avoid unnecessary calculations
    const cubicSolutions : Point[] = [];
    solutionsWithMax.forEach(point => {
      if (point >= p.range.xmin && point <= p.range.xmax)
        cubicSolutions.push({ x: point, y: props.size.height });
    });
    if (cubicSolutions.length == 2)
      pointsOutOfBounds.push(cubicSolutions);
  });
  return pointsOutOfBounds;
});

const handleChangeCoords = (e : MouseEvent) => {
  if (currentDraggablePointIndex.value === null) return;
  const currentPoint = points.value[currentDraggablePointIndex.value];
  const newXPosition = e.clientX - 2*props.pointRadius;
  const newYPosition = props.size.height - e.clientY + 2*props.pointRadius;
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
  const newPoint = { x: e.clientX - props.pointRadius, y: props.size.height - e.clientY + props.pointRadius };
  if (isOutOfBounds(newPoint))
    return;
  const tempPoints = [...points.value];
  tempPoints.push(newPoint);
  tempPoints.sort((p1, p2) => p1.x - p2.x);
  points.value = tempPoints;
}
</script>

<template>
  <div class="curve-canvas-container" :style="{ height: size.height+'px', width: size.width+'px' }"
    @mouseup="handleStopDragging"
    @mousemove="handleChangeCoords"
    @mousedown="handleNotPointMouseDown"
  >
    <svg class="curve-canvas">
        <!-- Grid -->
        <line v-for="i in (4-1)" 
            :x1="i*size.width/4" :y1="0" :x2="i*size.width/4" :y2="size.height" 
            stroke="#FAFAFA" stroke-width="1" stroke-dasharray="2,2"
        />
        <line v-for="i in (4-1)" 
            :x1="0" :y1="i*size.height/4" :x2="size.width" :y2="i*size.height/4" 
            stroke="#FAFAFA" stroke-width="1" stroke-dasharray="2,2"
        />

        <!-- Bounds -->
        <line :x1="0"          :y1="0"           :x2="size.width" :y2="0"           stroke="#FAFAFA" stroke-width="2" />
        <line :x1="size.width" :y1="0"           :x2="size.width" :y2="size.height" stroke="#FAFAFA" stroke-width="2" />
        <line :x1="size.width" :y1="size.height" :x2="0"          :y2="size.height" stroke="#FAFAFA" stroke-width="2" />
        <line :x1="0"          :y1="size.height" :x2="0"          :y2="0"           stroke="#FAFAFA" stroke-width="2" />

        <!-- Curve -->
        <path :d="svgPath" fill="none" stroke="#FAFAFA" stroke-width="2"></path>
        <line v-for="p in curveOutOfBoundPoints" 
            :x1="p[0].x" :y1="p[0].y" :x2="p[1].x" :y2="p[1].y" 
            stroke="#FAFAFA" stroke-width="4"
        />
        
        <!-- Points -->
        <DraggablePoint 
            v-for="(p, i) in points"
            :point="p" 
            :radius="pointRadius"
            @startDragging="() => handleStartDragging(i)"
        />
    </svg>
  </div>
</template>

<style scoped>
.curve-canvas-container {
  background-color: #5C5C5C;
  border: 5px solid #5C5C5C;
}

.curve-canvas {
  background-color: #5C5C5C;
  transform-origin: center center;
  transform: scale(1, -1);
  height: 100%;
  width: 100%;
}
</style>