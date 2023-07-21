<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'
import { useSettingStore } from '~/stores/setting'
import _ from 'lodash'
import dayjs from '~/tools/provideDayjs'
import videoThumbnailHoverClosure from '~/tools/videoList/videoThumbnailHoverClosure'
import makeVideoList from '~/tools/videoList/makeVideoList'

const settingStore = useSettingStore()

const config = useRuntimeConfig();

const videoList = ref({
  isLoading: true,
  data: null
})
const videoDOMList = ref(null)

const videoSettings = reactive({
  player: {
    thumbnailPlayerAutoMute: true,
    thumbnailPlayerRandomPointPlay: true,
    thumbnailImageGetBatchCount: 1,
    thumbnailImageGetBatchList: []
  },
  walk: {
    videoLengthThreshold: 0,
    videoListCount: 12
  }
})

const handleVideoThumbnailHover = videoThumbnailHoverClosure({ videoList, videoSettings, videoDOMList })

const fetchOpenTube = async (initLoadMode) => {
  if (!initLoadMode) { videoList.value.isLoading = true }
  videoSettings.player.thumbnailImageGetBatchList = []

  const { data } = await useOpenTubeFetch(`/video/random`, {
    query: {
      amount: videoSettings.walk.videoListCount,
      getThumbnail: false
    }
  })

  const gottenVideoList = await makeVideoList({ videoList: data.value })


  videoList.value = {
    isLoading: false,
    data: gottenVideoList,
    thumbnail: {}
  }

  videoSettings.player.thumbnailImageGetBatchList = _.map(gottenVideoList, (element) => { return element.id })

  if (!initLoadMode) {
    let currentVideoSlot = 0

    while (videoSettings.player.thumbnailImageGetBatchList?.length > 0) {
      const currentGetThumbnailList = _.map(_.slice(videoSettings.player.thumbnailImageGetBatchList, 0, videoSettings.player.thumbnailImageGetBatchCount), (element) => {
        return useOpenTubeFetch(`/video/thumbnail/${element}`)
      })
      videoSettings.player.thumbnailImageGetBatchList = _.slice(videoSettings.player.thumbnailImageGetBatchList, videoSettings.player.thumbnailImageGetBatchCount, videoSettings.player.thumbnailImageGetBatchList.length)
  
      const thumbnailImageFetchResult = await Promise.allSettled(currentGetThumbnailList)

      for (let i = 0; i < currentGetThumbnailList.length; i++) {
        const curNode = videoList.value.data[currentVideoSlot]
        videoList.value.thumbnail[curNode.id] = thumbnailImageFetchResult[i].value.data._rawValue.data
        currentVideoSlot += 1
      }
    }
  }

}

fetchOpenTube()
</script>

<template>
  <label for="settings-player-auto-muted">thumbnailPlayerAutoMute</label>
  <input type="checkbox" v-model="videoSettings.player.thumbnailPlayerAutoMute" id="settings-player-auto-muted"><br>

  <label for="settings-player-play-random-point">thumbnailPlayerRandomPointPlay</label>
  <input type="checkbox" v-model="videoSettings.player.thumbnailPlayerRandomPointPlay"
    id="settings-player-play-random-point"><br>

  <label for="settings-walk-video-list-count">videoListCount</label>
  <input type="number" v-model="videoSettings.walk.videoListCount" id="settings-walk-video-list-count"><br>

  <label for="settings-walk-video-length-threshold">walkVideoThreshold</label>
  <input type="number" v-model="videoSettings.walk.videoLengthThreshold" id="settings-walk-video-length-threshold">

  <div @click="fetchOpenTube()">Reload</div>

  <div id="main" style="width: 100%; margin-top: 20px; display: flex; justify-content: center;">
    <div style="max-width: 1400px; width: 90%; display: flex; flex-wrap: wrap; justify-content: center;">
      <div v-if="videoList.isLoading" v-for="_ in Array(videoSettings.walk.videoListCount)" class="video"
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
        style="width: 320px;">
        <NuxtLink :to="`/watch/${entry.id}`">
          <div v-if="!entry.shouldHideThumbnail" :style="{
            position: 'relative',
            width: '320px',
            height: '180px',
            backgroundImage: videoList.thumbnail[videoList.data[index]?.id] ?
              `url('${`data:image/png;base64,${videoList.thumbnail[videoList.data[index]?.id].replace(/(\r\n|\n|\r)/gm, '')}`}')` :
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
          <video v-else style="cursor: pointer; background-color: black; width: 320px; height: 180px;" class="video-js"
            preload="auto" controls loop autoplay :muted="videoSettings.player.thumbnailPlayerAutoMute"
            @pointerleave="handleVideoThumbnailHover(entry, index, true)">
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
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
