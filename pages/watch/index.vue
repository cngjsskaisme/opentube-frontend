<script setup>
import _ from 'lodash'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'
import { useVideoWatchStore } from '~/stores/videoWatch'

const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()
const videoWatchStore = useVideoWatchStore()
const currentVideo = videoWatchStore.meta.current

const globalExports = { videoDOM: null, currentVideo: null, playlistState: null }

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


/* S - Define playlist info getter */
const setPlaylistInfo = async () => {
  if (!route.query.list) { return }
  const playlistInfo = await useOpenTubeFetch(`/playlist/${route.list}`)
  if (playlistInfo.resultCode === '0000') {
    playlist.isAvailable = true
    playlist.entries = playlistInfo.data
  }
  return
}
/* E - Define playlist info getter */


/* S - Batch run getters */
await Promise.allSettled([setVideoPlayReady(), setPlaylistInfo()])
/* E - Batch run getters */


/* S - Add reactivity into path query*/
watch(() => route.query, async () => {
  await Promise.allSettled([setVideoPlayReady(), setPlaylistInfo()])
})
/* E - Add reactivity into path query*/


/* S - Playlist */
const playlist = reactive({
  isAvailable: false,
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
      },
      openPopupPlaylist: async () => {
        if (playlist.popup.isActive) {
          playlist.popup.isActive = false
          return
        }
        playlist.popup.isActive = true
        playlist.popup.input.playlistName = ''
        playlist.popup.input.checkedPlaylist = {}
        
        await playlist.methods.popup.setPopupPlaylist()
        if (playlist.popup.entries?.length > 0) {
          _.forEach(currentVideo.playlists, (currentVideoPlaylistEntry) => {
            playlist.popup.input.checkedPlaylist[currentVideoPlaylistEntry.playlistId] = true
          })
        }
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
        Promise.all([setPlaylistInfo(), playlist.methods.popup.setPopupPlaylist()]) 
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
          setVideoInfo()
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
        setVideoInfo()
      }
    }
  }
})
globalExports.playlistState = playlist

/* E - Playlist */
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
        <div @click="playlist.methods.popup.openPopupPlaylist()">
          Playlist
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
          <label :for="`video-watch-playlist-popup-checkbox-${entry?.id}`">{{ entry?.name }}</label>
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
      <!-- Queue -->
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

      <!-- Playlist -->
      <div v-if="playlist.isAvailable">
        <div style="margin-bottom: 1em; font-weight: bold;">Playlist</div>
        <div v-for="(entry, index) in playlist.entries" :key="index" style="margin-bottom: 0.5em" :style="{
          fontWeight: videoWatchStore.meta.current.id == entry.id ? 'bold' : null
        }">
          <NuxtLink :to="`/watch?v=${entry.id}`">
            {{ entry.title }}
          </NuxtLink>
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