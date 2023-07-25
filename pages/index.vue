<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'
import { useSettingStore } from '~/stores/setting'
import _ from 'lodash'
import dayjs from '~/tools/provideDayjs'
import videoThumbnailHoverClosure from '~/tools/videoList/videoThumbnailHoverClosure'
import makeVideoList from '~/tools/videoList/makeVideoList'
import formatVideoPath from '~/tools/formatVideoPath'

// should be videoList key
const videoMainListSettings = reactive({
  thumbnail: {
    playerAutoMute: true,
    playerRandomPointPlay: true,
    playerShowControls: false,
    imageGetBatchCount: 1,
    imageBlockRefreshDuringLoad: false,
    imageForceCreate: false
  },
  walk: {
    videoLengthThreshold: 0,
    videoListCount: 12,
    videoCrawlPath: '',
    videoExceptKeyword: ''
  }
})
const settingStore = useSettingStore()
const config = useRuntimeConfig();
const videoList = ref({
  isLoading: true,
  isThumbnailsLoading: true,
  data: null
})
const videoDOMList = ref(null)


/* Load playlist */
const fetchedAllPlaylist = await useOpenTubeFetch('/playlist')
const allPlaylist = ref(null)
allPlaylist.value = fetchedAllPlaylist.data.value


/* Fetch Crawl Path List */
const result = await useOpenTubeFetch('/video/scan/path')
videoMainListSettings.walk.videoCrawlPath = result.data.value?.crawlPath || ''
const onUpdateCrawlPath = async () => {
  await $fetch(`${config.public.fetchBaseURL}/video/scan/path`, {
    method: 'POST',
    body: {
      crawlPath: videoMainListSettings.walk.videoCrawlPath
    }
  })
  alert('Update done.')
}
const onStartCrawlPath = async () => {
  await $fetch(`${config.public.fetchBaseURL}/video/scan`, {
    method: 'POST',
    body: {
      addToDB: true
    }
  })
  alert('Crawl done.')
}

/* Hover Video logic */
const handleVideoThumbnailHover = videoThumbnailHoverClosure({ videoList, videoMainListSettings, videoDOMList })


/* VideoList Fetch Logic */
let thumbnailRequestAbortControllers = {}
let thumbnailGetBatchList = []

onBeforeRouteLeave(() => {
  _.mapValues(thumbnailRequestAbortControllers, (element) => {
    try {
      element.abort()
    } catch (e) {
      // noop
    }
  })
})

const fetchOpenTube = async ({ mode } = { mode: 'normal' }) => {
  /* Abort thumbnail requests if there are existing requests... */
  _.mapValues(thumbnailRequestAbortControllers, (element) => {
    element.abort()
  })
  _.mapValues(thumbnailRequestAbortControllers, (element) => {
    if (element.signal === 'aborted'){
      delete thumbnailRequestAbortControllers[element]
    }
  })

  /* Stop if debounced mode & loading */
  if (
    mode === 'debounced' &&
    videoList.value.isThumbnailsLoading &&
    videoMainListSettings.thumbnail.imageBlockRefreshDuringLoad
  ) { return }
  

  /* Mark thumbnail is loading - Nothing to do with UI, but state */
  videoList.value.isThumbnailsLoading = true


  /* SEO */
  if (mode !== 'init') { videoList.value.isLoading = true }


  /* Request video list */
  const { data } = await useOpenTubeFetch(`/video/random`, {
    query: {
      videoListCount: videoMainListSettings.walk.videoListCount,
      videoLengthThreshold: videoMainListSettings.walk.videoLengthThreshold,
      videoExceptKeyword: videoMainListSettings.walk.videoExceptKeyword
    }
  })


  /* Make Videolist for UI */
  videoList.value.isLoading = false
  videoList.value.data = await makeVideoList({ videoList: data.value })
  videoList.value.thumbnail = {}


  /* Request thumbnails on client */
  if (process.client) {
    thumbnailGetBatchList = _.map(
      _.filter(videoList.value.data, (element) => { return !element.isThumbnailCached }),
    (element) => { return element.id })

    /* Load cached thumbnails */
    _.forEach(_.filter(videoList.value.data, (videoEntry) => { return videoEntry.isThumbnailCached }), (videoEntry) => {
      thumbnailRequestAbortControllers[videoEntry.id] = new AbortController()
      useOpenTubeFetch(`/video/thumbnail/${videoEntry.id}`, {
        query: {
          thumbnailImageForceCreate: videoMainListSettings.thumbnail.imageForceCreate
        },
        signal: thumbnailRequestAbortControllers[videoEntry.id].signal,
        onResponse({ request, response, options }) {
          const targetVideoEntry = _.find(videoList.value.data, (searchVideoEntry) => { return searchVideoEntry.id === videoEntry.id })
          targetVideoEntry.thumbnailBase64 = response._data.data
        }
      })
    })

    /* Generate thumbnails */
    const runQueuedFetch = ({ connectionCount = 1, fetchList = [], fetchDoneCallback }) => {
      const clonedFetchList = _.map(fetchList, (element, index) => {
        return { index, data: element }
      })
      return new Promise((resolve) => {
        if (connectionCount < 1) { throw new Error('runQueuedFetch: connectionCount must be higher than 0')}
        const runner = async (fetchElement) => {
          if (!fetchElement) { return }
          const fetchResult = await useOpenTubeFetch(fetchElement.data[0], fetchElement.data[1])
          typeof fetchDoneCallback === 'function' && fetchDoneCallback(fetchResult, fetchElement.index)
          if (!(clonedFetchList.length > 0)) { resolve(true); return }
          runner(clonedFetchList.shift())
        }

        for (let i = 0; i < connectionCount; i++) {
          runner(clonedFetchList.shift())
        }
      })
    }

    const currentGetThumbnailList = _.map(thumbnailGetBatchList, (videoId, index) => {
      thumbnailRequestAbortControllers[videoId] = new AbortController()
      return [`/video/thumbnail/${videoId}`, {
        query: {
          thumbnailImageForceCreate: videoMainListSettings.thumbnail.imageForceCreate
        },
        signal: thumbnailRequestAbortControllers[videoId].signal
      }]
    })

    await runQueuedFetch({
      connectionCount: 3,
      fetchList: currentGetThumbnailList,
      fetchDoneCallback: (element, index) => {
        if (!element.data) { return }
        const targetVideoEntry = _.find(videoList.value.data, (searchVideoEntry) => { return searchVideoEntry.id === thumbnailGetBatchList[index] })
        targetVideoEntry.thumbnailBase64 = element.data._rawValue.data
      }
    })
  }

  /* Mark thumbnails load done */
  videoList.value.isThumbnailsLoading = false
}

useAsyncData((ojbs) => {
  // console.log(ojbs.$router.getRoutes());
})

fetchOpenTube({ mode: 'init' })
</script>

<template>
  <label for="settings-000">thumbnailPlayerAutoMute</label>
  <input type="checkbox" v-model="videoMainListSettings.thumbnail.playerAutoMute" id="settings-000"><br>

  <label for="settings-001">thumbnailPlayerRandomPointPlay</label>
  <input type="checkbox" v-model="videoMainListSettings.thumbnail.playerRandomPointPlay" id="settings-001"><br>

  <label for="settings-009">thumbnailPlayerShowControls</label>
  <input type="checkbox" v-model="videoMainListSettings.thumbnail.playerShowControls" id="settings-009"><br>

  <label for="settings-002">thumbnailImageGetBatchCount</label>
  <input type="number" v-model="videoMainListSettings.thumbnail.imageGetBatchCount" id="settings-002"><br>

  <label for="settings-005">thumbnailImageBlockRefreshDuringLoad</label>
  <input type="checkbox" v-model="videoMainListSettings.thumbnail.imageBlockRefreshDuringLoad" id="settings-005"><br>

  <label for="settings-006">thumbnailImageForceCreate</label>
  <input type="checkbox" v-model="videoMainListSettings.thumbnail.imageForceCreate" id="settings-006"><br>

  <label for="settings-003">walkVideoListCount</label>
  <input type="number" v-model="videoMainListSettings.walk.videoListCount" id="settings-003"><br>

  <label for="settings-004">walkVideoLengthThreshold</label>
  <input type="number" v-model="videoMainListSettings.walk.videoLengthThreshold" id="settings-004"><br>

  <label for="settings-007">walkVideoCrawlPath</label>
  <textarea type="text" v-model="videoMainListSettings.walk.videoCrawlPath" id="settings-007"></textarea>
  <button @click="onUpdateCrawlPath">Update</button>
  <button @click="onStartCrawlPath">Start Crawl</button><br>

  <label for="settings-008">walkVideoExceptKeyword (split by :)</label>
  <textarea type="text" v-model="videoMainListSettings.walk.videoExceptKeyword" id="settings-008"></textarea>

  <div
    :style="{
      cursor: videoMainListSettings.thumbnail.imageBlockRefreshDuringLoad &&
              videoList.isThumbnailsLoading ? 'progress' : 'pointer'
    }"
    @click="fetchOpenTube({ mode: 'debounced' })">Reload</div>

  <div id="main" style="width: 100%; margin-top: 20px; display: flex; justify-content: center;">
    <div style="max-width: 1400px; width: 90%; display: flex; flex-wrap: wrap; justify-content: center;">
      <div
        v-if="videoList.isLoading"
        v-for="_ in Array(videoMainListSettings.walk.videoListCount)"
        class="video"
        style="width: 320px; margin: 0 0.5em 2em 0.5em;">
        <div :style="{
          position: 'relative',
          width: '320px',
          height: '180px',
          backgroundImage: 'url(\'https://via.placeholder.com/320x180?text=\')',
          backgroundSize: 'cover',
          cursor: 'pointer',
          borderRadius: '0.8em'
        }" class="thumbnail">
        </div>
        <a style="
            width: 12em;
            word-wrap: break-all;
            font-weight: bold;
            font-size: 1.1em;
            height: 1em;
            border-radius: 0.2em;
            line-height: 1.2em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-top: 10px;
            background-color: #CCCCCC;
          ">
        </a>
      </div>
      <div v-else v-for="(entry, index) in videoList.data" :key="index" ref="videoDOMList" class="video"
        style="width: 320px; margin: 0 0.5em 2em 0.5em;">
        <NuxtVideoLink :video-id="entry.id">
          <div v-if="!entry.shouldHideThumbnail" :style="{
            position: 'relative',
            width: '320px',
            height: '180px',
            backgroundImage: videoList.data[index].thumbnailBase64?.length > 0 ?
              `url('${`data:image/png;base64,${videoList.data[index].thumbnailBase64.replace(/(\r\n|\n|\r)/gm, '')}`}')` :
              'url(\'https://via.placeholder.com/320x180?text=Loading+Thumbnail...\')',
            backgroundSize: 'cover',
            cursor: 'pointer',
            borderRadius: entry.isThumbnailTransitionStarted ? 0 : '0.8em',
            opacity: entry.isThumbnailTransitionInTheMiddle ? 0 : 1,
            transition: entry.isThumbnailTransitionStarted ? 'border-radius 0.3s, opacity 0.1s' : null
          }" class="thumbnail" @pointerover="handleVideoThumbnailHover(entry, index)"
            @pointerleave="handleVideoThumbnailHover(entry, index, true)">
            <div style="
                  position: absolute;
                  bottom: 5px;
                  right: 5px;
                  background-color: rgba(0, 0, 0, 0.5);
                  width: fit-content;
                  padding: 4px 7px;
                  border-radius: 3px;
                  color: white;
                  font-weight: bold;
                " :style="{
                  opacity: entry.isThumbnailTransitionStarted ? 0 : 1,
                  transition: entry.isThumbnailTransitionStarted ? 'all 0.3s' : null
                }">
              {{ dayjs.duration(entry.length * 1000).format(entry.length >= 3600 ? 'H:mm:ss' : 'm:ss') }}
            </div>
          </div>
          <video v-else style="cursor: pointer; background-color: black; width: 320px; height: 176px;" class="video-js"
            preload="auto" loop autoplay :muted="videoMainListSettings.thumbnail.playerAutoMute"
            @pointerleave="handleVideoThumbnailHover(entry, index, true)"
            :controls="videoMainListSettings.thumbnail.playerShowControls"
          >
            <source :src="`${config.public.fetchBaseURL}/file/stream/${entry.id}`">
            <!-- type="video/mp4" -->
          </video>
          <a style="
                width: 100%;
                word-wrap: break-all;
                font-weight: bold;
                font-size: 1.1em;
                height: 2.4em;
                line-height: 1.2em;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                margin-top: 10px;
              ">
            {{ entry.title }}
          </a>
        </NuxtVideoLink>
      </div>
      <div style="width: 90%;">
        <b>Playlists</b>
        <div v-for="(entry, index) in allPlaylist.data">
          <NuxtLink :to="formatVideoPath({ videoId: entry.videos[0].video.id, playlistId: entry.id, playlistVideoIndex: 1 })">
            {{ entry.name }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
