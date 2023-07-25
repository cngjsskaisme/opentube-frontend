<script setup>
import _ from 'lodash'
import formatVideoPath from '~/tools/formatVideoPath'

const props = defineProps(['videoId', 'playlist', 'index'])
const route = useRoute()
let href = ref(null)

href.value = formatVideoPath({ videoId: props.videoId,
                               playlistId: props.playlist,
                               playlistVideoIndex: props.index,
                               route})
</script>

<template>
  <NuxtLink :to="href">
    <slot></slot>
  </NuxtLink>
</template>