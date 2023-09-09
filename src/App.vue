<script setup lang="ts">
import { ref } from 'vue'; 
import CurveCanvas from './components/CurveCanvas.vue';
import { CubicSplineInterpolationResult } from './utils/cubicSplineInterpolation';

const polynomials = ref<CubicSplineInterpolationResult>([]);

const onCurveChanged = (ps: CubicSplineInterpolationResult) => {
  polynomials.value = [...ps];
}

</script>

<template>
  <CurveCanvas 
    @curve-changed="onCurveChanged"
  />
  <p v-for="p in polynomials">{{ p }}</p>
</template>

<style scoped>

</style>
