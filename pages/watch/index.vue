<script setup>
import _ from 'lodash'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'
import { useVideoWatchStore } from '~/stores/videoWatch'

const config = useRuntimeConfig()
const route = useRoute()
const videoWatchStore = useVideoWatchStore()
const currentVideo = videoWatchStore.meta.current

/* Add document keyup event for video hotkeys */
const videoDOM = ref()
function handleKeyDownListener(e) {
  _.includes([32, 38, 40], e.keyCode) && e.preventDefault()
  _.mapValues(videoWatchStore.getHotKey.hotKey, (keyEntry) => {
    if (!keyEntry.keyCode) { return }
    if (e.keyCode === keyEntry.keyCode) {
      videoDOM?.value && keyEntry.callback({ videoDOM: videoDOM.value, currentVideo })
    }
  })
}
onMounted(() => {
  useEventListener('keydown', handleKeyDownListener)
})

const setVideoInfo = async () => {
  videoDOM.value && videoDOM.value.pause()

  /* Get video info */
  const videoInfo = await useOpenTubeFetch(`/video/info/${route.query.v}`)
  currentVideo.id = route.query.v
  currentVideo.title = videoInfo.data.value.title
  currentVideo.path = videoInfo.data.value.path
  currentVideo.length = videoInfo.data.value.length
  
  /* Push video history into queue */
  if (process.client) {
    const queue = videoWatchStore.meta.queue
    const lastQueueIndex = queue.entries.length <= 0 ? 0 : queue.entries.length
    if (queue.cursor === lastQueueIndex) {
      queue.entries.push(_.cloneDeep(currentVideo))
    }
  }
  
  videoDOM.value && videoDOM.value.load()
}

await setVideoInfo()

watch(() => route.query, async () => {
  await setVideoInfo()
})
</script>

<template>
  <div style="max-width: 85vw; margin: auto; display: flex; flex-wrap: wrap;">
    <div style="border: 1px solid black; flex-grow: 99999; max-width: 100%; width: 400px">
      <video controls style="width: 100%;" ref="videoDOM">
        <source :src="`${config.public.fetchBaseURL}/file/stream/${route.query.v}`" type="video/mp4">
      </video>
      <div>
        <span :title="currentVideo.path">{{ currentVideo.title }}</span>
      </div>
    </div>
    <div style="border: 1px solid black; flex-grow: 1; width: 300px;">
      <div>
        <div style="margin-bottom: 1em; font-weight: bold;">Queue</div>
        <div v-for="(entry, index) in videoWatchStore.meta.queue.entries" :key="index" style="margin-bottom: 0.5em" :style="{
          fontWeight: videoWatchStore.meta.current.id == entry.id ? 'bold' : null
        }">
          <NuxtLink :to="`/watch?v=${entry.id}`">
            {{ entry.title }}
          </NuxtLink>
        </div>
      </div>

      <div>
        <div style="margin-bottom: 1em; font-weight: bold;">Playlist</div>
        <div v-for="(entry, index) in videoWatchStore.meta.playlist.entries" :key="index" style="margin-bottom: 0.5em" :style="{
          fontWeight: videoWatchStore.meta.current.id == entry.id ? 'bold' : null
        }">
          <NuxtLink :to="`/watch?v=${entry.id}`">
            {{ entry.title }}
          </NuxtLink>
        </div>
      </div>

      <div style="margin-top: 2em">
        <b>Hotkeys</b>
        <div v-for="(entry, index) in Object.keys(videoWatchStore.getHotKey.hotKey)" :key="index">
          <div style="display: inline-block; width: 10em;" :title="videoWatchStore.getHotKey.hotKey[entry].description">
            {{ entry }}
          </div>
          <div style="display: inline-block">
            {{ videoWatchStore.getHotKey.hotKey[entry].code || '(Not Set)' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>