<script setup lang="ts">
import { ref } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult } from './utils/cubicSplineInterpolation';

const polynomials = ref<CubicSplineInterpolationResult>([]);
const canvas = ref<InstanceType<typeof CurveCanvas>>();

const onCurveChanged = (ps: CubicSplineInterpolationResult) => {
  polynomials.value = [...ps];
}

const handleClick = () => {
  canvas.value?.reset();
};
</script>

<template>
  <CurveCanvas 
    ref="canvas"
    @curve-changed="onCurveChanged"
  />
  <button @click="handleClick">Reset</button>
  <p v-for="p in polynomials">{{ p }}</p>
</template>

<style scoped>

</style>
