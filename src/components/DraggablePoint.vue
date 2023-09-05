<script lang="ts" setup>
import { PropType } from 'vue';
import { Point } from '../utils/cubicSplineInterpolation';

defineProps({
    point: {
        type: Object as PropType<Point>,
        required: true
    },
    radius: {
        type: Number,
        default: 5
    },
    color: {
        type: String,
        default: '#FAFAFA'
    }
});

const emit = defineEmits(['startDragging']);

</script>

<template>
  <circle
    class="draggable-point"
    :cx="point.x" 
    :cy="point.y" 
    :r="radius"
    :fill="color"
    @mousedown.stop="() => emit('startDragging')"
  />
</template>