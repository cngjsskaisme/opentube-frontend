<script setup>
import _ from 'lodash'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'
import { useVideoWatchStore } from '~/stores/videoWatch'
import formatVideoPath from '~/tools/formatVideoPath';

const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()
const videoWatchStore = useVideoWatchStore()
const currentVideo = videoWatchStore.meta.current
const globalExports = { videoDOM: null, currentVideo: null, playlistState: null, activeCursor: null }

/* S - Queue & playlist with handlers */
const activeCursor = ref('queue')
globalExports.activeCursor = activeCursor
const handleCursorWithVideoClick = (type, index) => {
  activeCursor.value = type
  if (type === 'queue') videoWatchStore.meta.queue.cursor = index
}
/* E - Queue & playlist with handlers */

/* S - Playlist */
const playlist = reactive({
  name: '',
  isAvailable: false,
  cursor: 0,
  entries: [],
  popup: {
    isActive: false,
    entries: [],
    input: {
      playlistName: '',
      checkedPlaylist: {}
    }
  },
  methods: {
    popup: {
      setPopupPlaylist: async () => {
        const allPlaylist = await useOpenTubeFetch('/playlist')
        if (allPlaylist.data.value.resultCode !== '0000') {
          alert('Error at allPlaylist')
        }
        playlist.popup.entries = allPlaylist.data.value.data
        playlist.popup.input.playlistName = ''
        playlist.popup.input.checkedPlaylist = {}
        if (playlist.popup.entries?.length > 0) {
          _.forEach(currentVideo.playlists, (currentVideoPlaylistEntry) => {
            playlist.popup.input.checkedPlaylist[currentVideoPlaylistEntry.playlistId] = true
          })
        }
      },
      openPopupPlaylist: async () => {
        if (playlist.popup.isActive) {
          playlist.popup.isActive = false
          return
        }
        playlist.popup.isActive = true
        await setVideoInfo()
        await playlist.methods.popup.setPopupPlaylist()
      },
      handleDeletePlaylist: async (id) => {
        const postPlaylistResult = await useOpenTubeFetch(`/playlist`, {
          method: 'DELETE',
          body: {
            playlistId: id
          }
        })
        if (postPlaylistResult.data.value.resultCode !== '0000') {
          alert('Failed to delete playlist.')
          return
        }
        alert('Successfully deleted playlist.')
        await setVideoInfo()
        playlist.methods.popup.setPopupPlaylist()
      },
      handlePostPlaylist: async () => {
        const postPlaylistResult = await useOpenTubeFetch(`/playlist`, {
          method: 'POST',
          body: {
            playlistName: playlist.popup.input.playlistName
          }
        })
        if (postPlaylistResult.data.value.resultCode !== '0000') {
          alert('Failed to add playlist.')
          return
        }
        alert('Successfully added playlist.')
        await setVideoInfo()
        Promise.all([setPlaylistInfo({ playlistId: lastAddedPlaylist.data.value.data.id }), playlist.methods.popup.setPopupPlaylist()]) 
      },
      handlePostToRecentPlaylistVideo: async () => {
        const lastAddedPlaylist = await useOpenTubeFetch('/playlist/recent')
        if (lastAddedPlaylist.data.value.data) {
          const postPlaylistVideoResult = await useOpenTubeFetch('/playlist/video', {
            method: 'POST',
            body: {
              playlistId: lastAddedPlaylist.data.value.data.id,
              videoId: route.query.v,
              entryName: currentVideo.title,
              timestamp: null
            }
          })
          if (postPlaylistVideoResult.data.value.resultCode !== '0000') {
            alert('Failed to add video.')
            return
          }
          alert('Successfully added to the last added playlist')
          await setVideoInfo()
          Promise.all([setPlaylistInfo({ playlistId: lastAddedPlaylist.data.value.data.id }), playlist.methods.popup.setPopupPlaylist()]) 
          return
        }
        playlist.methods.popup.openPopupPlaylist()
      },
      handleTogglePostDeletePlaylistVideo: async (id) => {
        if (playlist.popup.input.checkedPlaylist[id]) {
          const postPlaylistVideoResult = await useOpenTubeFetch(`/playlist/video`, {
            method: 'DELETE',
            body: {
              videoId: route.query.v,
              playlistId: id
            }
          })
          if (postPlaylistVideoResult.data.value.resultCode !== '0000') {
            alert('Failed to delete video.')
            playlist.popup.input.checkedPlaylist[id] = true
            return
          }
          alert('Successfully deleted from the playlist.')
          playlist.popup.input.checkedPlaylist[id] = false
          await setVideoInfo()
          Promise.all([setPlaylistInfo({ playlistId: id }), playlist.methods.popup.setPopupPlaylist()])
          return
        }
        const postPlaylistVideoResult = await useOpenTubeFetch(`/playlist/video`, {
          method: 'POST',
          body: {
            videoId: route.query.v,
            playlistId: id,
            entryName: currentVideo.title,
            timestamp: null
          }
        })
        if (postPlaylistVideoResult.data.value.resultCode !== '0000') {
          alert('Failed to add video.')
          playlist.popup.input.checkedPlaylist[id] = false
          return
        }
        alert('Successfully added to the playlist.')
        playlist.popup.input.checkedPlaylist[id] = true
        await setVideoInfo()
        await setPlaylistInfo({ playlistId: id })
        await playlist.methods.popup.setPopupPlaylist()
      }
    }
  }
})
globalExports.playlistState = playlist
/* E - Playlist */

/* S - Define playlist info getter */
const setPlaylistInfo = async ({ playlistId } = { playlistId: null }) => {
  // if (!route.query.list) { return }
  const router = useRouter()
  const playlistInfo = await useOpenTubeFetch(`/playlist/${playlistId || route.query.list}`)
  const playlistEntries = playlistInfo.data.value.data.entries
  playlist.entries = playlistEntries
  if (playlistInfo.data.value?.resultCode !== '0000') {
    router.replace(formatVideoPath({ videoId: route.query.v, route, select: { videoId: true } }), undefined, () => { return })
    return
  }
  const foundVideoInPlaylistEntries = _.find(playlistEntries, (videoEntry) => {
    return videoEntry.videoId === parseInt(route.query.v)
  })
  if (!foundVideoInPlaylistEntries) {
    router.replace(formatVideoPath({ videoId: route.query.v, route, select: { videoId: true } }), undefined, () => { return })
    return
  }

  router.replace(formatVideoPath({
    videoId: route.query.v,
    playlistId: route.query.list,
    playlistVideoIndex: foundVideoInPlaylistEntries?.orderIndex,
    route
  }), undefined, () => { return })

  playlist.isAvailable = true
  activeCursor.value = 'playlist'
  playlist.name = playlistInfo.data.value.data.playlistName
  return
}
/* E - Define playlist info getter */



/* S - Add document keyup event for video hotkeys */
const videoDOM = ref()
function handleKeyDownListener(e) {
  globalExports.videoDOM = videoDOM.value
  globalExports.currentVideo = currentVideo
  _.includes([32, 38, 40], e.keyCode) && e.preventDefault()
  _.mapValues(videoWatchStore.getHotKey.result, (keyEntry) => {
    if (!keyEntry.keyCode) { return }
    if (e.keyCode === keyEntry.keyCode) {
      videoDOM?.value && keyEntry.callback(globalExports)
    }
  })
}
onMounted(() => {
  useEventListener('keydown', handleKeyDownListener)
})
/* E - Add document keyup event for video hotkeys */

/* S - Define video info getter */
const setVideoInfo = async () => {
  const videoInfo = await useOpenTubeFetch(`/video/info/${route.query.v}`)
  currentVideo.id = route.query.v
  currentVideo.title = videoInfo.data.value.title
  currentVideo.path = videoInfo.data.value.path
  currentVideo.length = videoInfo.data.value.length
  currentVideo.playlists = videoInfo.data.value.playlists
}
const setVideoPlayReady = async () => {
  videoDOM.value && videoDOM.value.pause()

  /* Get video info */
  await setVideoInfo()
  
  /* Push video history into queue */
  if (process.client) {
    const queue = videoWatchStore.meta.queue
    const lastQueueIndex = queue.entries.length <= 0 ? 0 : queue.entries.length
    if (queue.cursor === lastQueueIndex) {
      queue.entries.push(_.cloneDeep(currentVideo))
    }
  }

  videoDOM.value && videoDOM.value.load()
  videoDOM.value && videoDOM.value.play()
  return
}
/* E - Define video info getter */


/* S - Batch run getters */
await Promise.allSettled([setVideoPlayReady(), setPlaylistInfo(), playlist.methods.popup.setPopupPlaylist()])
/* E - Batch run getters */


/* S - Add reactivity into path query*/
watch(() => route.query, async () => {
  await Promise.allSettled([setVideoPlayReady(), setPlaylistInfo(), playlist.methods.popup.setPopupPlaylist()])
})
/* E - Add reactivity into path query*/

/* S - Etc helper tools */
const currentVideoPath = currentVideo.path
const { text, copy, copied, isSupported } = useClipboard({ currentVideoPath })
/* E - Etc helper tools */
</script>

<template>
  <div style="max-width: 85vw; margin: auto; display: flex; flex-wrap: wrap;">
    <!-- S : Video view container -->
    <div style="border: 1px solid black; flex-grow: 99999; max-width: 100%; width: 400px">
      <!-- Video -->
      <video controls loop style="width: 100%;" ref="videoDOM">
        <source :src="`${config.public.fetchBaseURL}/file/stream/${route.query.v}`" type="video/mp4">
      </video>

      <!-- Description -->
      <div>
        <span :title="currentVideo.path">{{ currentVideo.title }}</span>
      </div>

      <!-- Control panel -->
      <div>
        <div @click="playlist.methods.popup.openPopupPlaylist()" style="display: inline-block;">
          Playlist
        </div>
        <div style="margin-left: 1em; display: inline-block;" @click="copy(currentVideoPath)">
          Copy local file path
          <div v-if="copied" style="margin-left: 1em; display: inline-block;">Copied!</div>
        </div>
      </div>

      <!-- Playlist popup (temp) -->
      <div v-if="playlist.popup.isActive">
        <b>Popup</b>
        <div v-for="(entry, index) in playlist.popup.entries" :key="index">
          <input
            type="checkbox"
            :id="`video-watch-playlist-popup-checkbox-${entry?.id}`"
            :checked="playlist.popup.input.checkedPlaylist[entry?.id]"
            @click="playlist.methods.popup.handleTogglePostDeletePlaylistVideo(entry?.id)">
          <label :for="`video-watch-playlist-popup-ceckbox-${entry?.id}`">{{ entry?.name }}</label>
        </div>
        <div v-if="playlist.popup.entries.length === 0">
          There is no playlists.<br>
        </div>
        <br>
        <input type="text" v-model="playlist.popup.input.playlistName" placeholder="Playlist Name">
        <button @click="playlist.methods.popup.handlePostPlaylist()">Create</button>
      </div>
    </div>
    <!-- E : Video view container -->

    <!-- S : Meta view container -->
    <div style="border: 1px solid black; flex-grow: 1; width: 300px;">

      <!-- Playlist -->
      <div v-if="playlist.isAvailable">
        <div style="margin-bottom: 1em; font-weight: bold;">Playlist</div>
        <div style="margin-bottom: 0.5em; font-weight: bold;">{{ playlist.name }}</div>
        <div v-for="(entry, index) in playlist.entries" :key="index" style="margin-bottom: 0.5em" :style="{
          fontWeight: entry.videoId == route.query.v &&
                      entry.orderIndex == route.query.index &&
                      activeCursor === 'playlist' ? 'bold' : null
        }">
          <NuxtVideoLink
            :video-id="entry.videoId"
            :playlist="entry.playlistId"
            :index="entry.orderIndex"
            @click="handleCursorWithVideoClick('playlist', index)">
            {{ entry.entryName }}
          </NuxtVideoLink>
        </div>
      </div>

      <!-- Queue -->
      <div>
        <div style="margin-bottom: 1em; font-weight: bold;">Queue</div>
        <div v-for="(entry, index) in videoWatchStore.meta.queue.entries" :key="index" style="margin-bottom: 0.5em" :style="{
          fontWeight: videoWatchStore.meta.current.id == entry.id &&
                      activeCursor === 'queue' ? 'bold' : null
        }">
          <NuxtVideoLink
            :video-id="entry.id"
            @click="handleCursorWithVideoClick('queue', index)">
            {{ entry.title }}
          </NuxtVideoLink>
        </div>
      </div>



      <!-- Hotkeys -->
      <div style="margin-top: 2em">
        <b>Hotkeys</b>
        <div v-for="(entry, index) in Object.keys(videoWatchStore.getHotKey.result)" :key="index">
          <div style="display: inline-block; width: 10em;" :title="videoWatchStore.getHotKey.result[entry].description">
            {{ entry }}
          </div>
          <div style="display: inline-block">
            {{ videoWatchStore.getHotKey.result[entry].code || '(Not Set)' }}
          </div>
        </div>
      </div>
    </div>
    <!-- E : Meta view container -->
  </div>
</template>