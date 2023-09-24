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

type ColorHistogram = {
  R: number[],
  G: number[],
  B: number[],
  RGB: number[],
  maxR: number,
  maxG: number,
  maxB: number,
  maxRGB: number,
}

const props = defineProps({
  size: {
    type: Number,
    default: 512
  },
  colorHistogram: {
    type: Object as PropType<ColorHistogram>,
    required: false
  },
  pointRadius: {
    type: Number,
    default: 7
  },
  curveColor: {
    type: String,
    default: '#FAFAFA'
  }
});

const emit = defineEmits<{
  (e: 'curveChanged', polynomials: CubicSplineInterpolationResult): void
}>()

const isOutOfBounds = (p: Point, ignoreXAxis = false, ignoreYAxis = false) => {
  if (!ignoreXAxis && (p.x < 0 || p.x > props.size))
    return true;
  if (!ignoreYAxis && (p.y < 0 || p.y > props.size))
    return true;
  return false;
}

const initialPoints : BlockableDraggablePoint[] = [
  { x: 0, y: 0, blockX: true },
  { x: props.size, y: props.size, blockX: true  },
]
const points = ref(initialPoints.map(p => ({...p})));

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
    const upperD = p.polynomial.D - props.size - 0.5;  // find solution on a little lower height for prettier look
    const solutionsWithMax = solveCubic(p.polynomial.A, p.polynomial.B, p.polynomial.C, upperD);
    if (solutionsWithMax.length < 2) return;  // avoid unnecessary calculations
    const cubicSolutions : Point[] = [];
    solutionsWithMax.forEach(point => {
      if (point >= p.range.xmin && point <= p.range.xmax)
        cubicSolutions.push({ x: point, y: props.size });
    });
    if (cubicSolutions.length == 2)
      pointsOutOfBounds.push(cubicSolutions);
  });
  return pointsOutOfBounds;
});

const handleChangeCoords = (e : MouseEvent) => {
  if (currentDraggablePointIndex.value === null) return;
  const currentPoint = points.value[currentDraggablePointIndex.value];
  const newXPosition = e.offsetX;
  const newYPosition = e.offsetY;
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
  const newPoint = { x: e.offsetX, y: e.offsetY };
  if (isOutOfBounds(newPoint))
    return;
  const tempPoints = [...points.value];
  tempPoints.push(newPoint);
  tempPoints.sort((p1, p2) => p1.x - p2.x);
  points.value = tempPoints;
}

const handleMouseLeave = () => {
  currentDraggablePointIndex.value = null;
}

const reset = () => {
  points.value = initialPoints.map(p => ({...p}));
}

const set = (ps : Point[]) => {
  if (ps.length < 2) {
    points.value = initialPoints.map(p => ({...p}));
    throw new Error("Argument exception. Needs two or more points to build curve.");
  }
  if ((ps as BlockableDraggablePoint[])[0].x !== 0 || (ps as BlockableDraggablePoint[])[ps.length-1].x !== props.size) {
    points.value = initialPoints.map(p => ({...p}));
    throw new Error("Argument exception. First and last points must be at start and end of X axis.");
  }
  (ps as BlockableDraggablePoint[])[0].blockX = true;
  (ps as BlockableDraggablePoint[])[ps.length-1].blockX = true;
  points.value = ps.map(p => ({...p}));
}

defineExpose({
  reset,
  set
});
</script>

<template>
  <div class="curve-canvas-container" :style="{ height: size+'px', width: size+'px' }"
    @mouseup="handleStopDragging"
    @mousemove="handleChangeCoords"
    @mousedown="handleNotPointMouseDown"
    @mouseleave="handleMouseLeave"
  >
    <svg class="curve-canvas">
        <!-- Grid -->
        <line v-for="i in (4-1)" 
            :x1="i*size/4" :y1="0" :x2="i*size/4" :y2="size" 
            stroke="#eeeeee" stroke-width="1" stroke-dasharray="2,2"
        />
        <line v-for="i in (4-1)" 
            :x1="0" :y1="i*size/4" :x2="size" :y2="i*size/4" 
            stroke="#eeeeee" stroke-width="1" stroke-dasharray="2,2"
        />

        <!-- Bounds -->
        <line :x1="0"    :y1="0"    :x2="size" :y2="0"    stroke="#eeeeee" stroke-width="2" />
        <line :x1="size" :y1="0"    :x2="size" :y2="size" stroke="#eeeeee" stroke-width="2" />
        <line :x1="size" :y1="size" :x2="0"    :y2="size" stroke="#eeeeee" stroke-width="2" />
        <line :x1="0"    :y1="size" :x2="0"    :y2="0"    stroke="#eeeeee" stroke-width="2" />

        <!-- Histogram -->
        <rect 
          v-for="(value, i) in (colorHistogram?.RGB ?? [])" 
          :x="(i-1) * size/256" 
          :y="1"
          :height="colorHistogram?.maxRGB === 0 ? 0 : Math.max(value / (colorHistogram?.maxRGB ?? 1) * size - 2, 0)"
          :width="size/256"
          fill="#666666"
        />

        <!-- Curve -->
        <path :d="svgPath" fill="none" :stroke="curveColor" stroke-width="2"></path>
        <line v-for="p in curveOutOfBoundPoints" 
            :x1="p[0].x" :y1="p[0].y" :x2="p[1].x" :y2="p[1].y" 
            :stroke="curveColor" stroke-width="4"
        />
        
        <!-- Points -->
        <DraggablePoint 
            v-for="(p, i) in points"
            :point="p" 
            :radius="pointRadius"
            :color="curveColor"
            @startDragging="() => handleStartDragging(i)"
        />
    </svg>
  </div>
</template>

<style scoped>
.curve-canvas-container {
  background-color: #333333;
}

.curve-canvas {
  background-color: #333333;
  transform-origin: center center;
  transform: scale(1, -1);
  height: 100%;
  width: 100%;
}
</style>
