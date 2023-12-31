import _ from 'lodash'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'
import formatVideoPath from '~/tools/formatVideoPath'

export const useVideoWatchStore = defineStore({
  id: 'videoWatch',
  state: () => ({
    setting: {
      video: {
        seekTimeAmount: 5,
        volumeAmount: 10,
        volumeSaved: 100,
      },
      queue: {
        autoAddRandomVideoIfQueueEmpty: true
      },
      bossKey: {
        url: 'https://www.naver.com'
      }
    },
    meta: {
      current: {
        playlists: [],
        id: null,
        title: '',
        path: '',
        length: 0
      },
      playlist: {
        entries: [],
        cursor: 0
      },
      queue: {
        entries: [] as any,
        cursor: 0
      }
    }
  }),
  actions: {
    queue: {
      clear() {
        this.meta.playlist.entries = []
      },
      setCursor(index: number) {
        this.meta.playlist.cursor = index
      },
      push(item: any) {
        this.meta.queue.entries.push(item)
        return item
      },
      pop(item: any) {
        return this.meta.queue.entries.pop()
      }
    },
  },
  getters: {
    getHotKey: (state) => {
      return {
        result: {
          toggleBossKey: {
            description: 'Toggle boss key',
            keyCode: 87,
            code: 'KeyW',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const videoWatchStore = useVideoWatchStore()
              window.location.href = videoWatchStore.setting.bossKey.url
            }
          },
          togglePlay: {
            description: 'Toggle play & pause video',
            keyCode: 32,
            code: 'Space',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              videoDOM.paused ? videoDOM.play() : videoDOM.pause()

            }
          },
          toggleFullScreen: {
            description: 'Toggle fullscreen mode',
            keyCode: 71,
            code: 'KeyG',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const targetWindow = window as any
              if (targetWindow.fullScreen) {
                console.log('?')
                targetWindow.document.webkitExitFullscreen && targetWindow.document.webkitExitFullscreen()
                targetWindow.document.mozCancelFullscreen && targetWindow.document.mozCancelFullscreen()
                targetWindow.document.exitFullscreen && targetWindow.document.exitFullscreen()
              }
              else { videoDOM.requestFullscreen && videoDOM.requestFullscreen() }
            }
          },
          setVolumeUp: {
            description: 'Volume up',
            keyCode: 38,
            code: 'ArrowUp',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const resultAmount = videoDOM.volume + state.setting.video.volumeAmount / 100
              if (resultAmount >= 1) { videoDOM.volume = 1; return }
              videoDOM.volume = resultAmount
            }
          },
          setVolumeDown: {
            description: 'Volume Down',
            keyCode: 40,
            code: 'ArrowDown',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const resultAmount = videoDOM.volume - state.setting.video.volumeAmount / 100
              if (resultAmount <= 0) { videoDOM.volume = 0; return }
              videoDOM.volume = resultAmount
            }
          },
          toggleVolumeMute: {
            description: 'Volume Mute',
            keyCode: 77,
            code: 'KeyM',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              if (videoDOM.volume === 0) {
                videoDOM.volume = state.setting.video.volumeSaved
                return
              }
              state.setting.video.volumeSaved = videoDOM.volume
              videoDOM.volume = 0
            }
          },
          addToPlaylist: {
            description: 'Add current video to playlist',
            keyCode: 66,
            code: 'KeyB',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              playlistState.methods.popup.handlePostToRecentPlaylistVideo()
            }
          },
          seekNextPoint: {
            description: 'Seek next point',
            keyCode: 70,
            code: 'KeyF',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const videoWatchStore = useVideoWatchStore()
              const finalVideoLength = videoDOM.duration >= currentVideo.length ? videoDOM.duration : currentVideo.length
              const resultCurrentTime = videoDOM.currentTime + videoWatchStore.setting.video.seekTimeAmount
              if (resultCurrentTime >= finalVideoLength) { videoDOM.currentTime = finalVideoLength; return }
              videoDOM.currentTime = resultCurrentTime
            }
          },
          seekPrevPoint: {
            description: 'Seek previous point',
            keyCode: 68,
            code: 'KeyD',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const videoWatchStore = useVideoWatchStore()
              const resultCurrentTime = videoDOM.currentTime - videoWatchStore.setting.video.seekTimeAmount
              if (resultCurrentTime <= 0) { videoDOM.currentTime = 0; return }
              videoDOM.currentTime = resultCurrentTime
            }
          },
          seekRandom: {
            description: 'Seek random point',
            keyCode: 90,
            code: 'KeyZ',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const finalVideoLength = videoDOM.duration >= currentVideo.length ? videoDOM.duration : currentVideo.length
              let randomSeed = 0
              try {
                randomSeed = crypto.getRandomValues(new Uint32Array(1))[0] / Math.pow(2, 32)
              } catch { randomSeed = Math.random() }
              videoDOM.currentTime = Math.floor(randomSeed * finalVideoLength)
            }
          },
          playNextRandom: {
            description: 'Play next random video',
            keyCode: 88,
            code: 'KeyX',
            callback: async ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              activeCursor.value = 'queue'
              const videoWatchStore = useVideoWatchStore()
              const route = useRoute()
              const router = useRouter()
              const queue = videoWatchStore.meta.queue
              const randomIndexResult = await useOpenTubeFetch('/video/random/index') as any
              const lastQueueIndex = queue.entries.length <= 0 ? 0 : queue.entries.length - 1
              queue.cursor = lastQueueIndex === 0 ? 1 : lastQueueIndex + 1
              router.push(formatVideoPath({ videoId: randomIndexResult.data.value.data, route }))
              return
            }
          },
          playPrevQueue: {
            description: 'Play previous video in the queue',
            keyCode: 67,
            code: 'KeyC',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              activeCursor.value = 'queue'
              const videoWatchStore = useVideoWatchStore()
              const queue = videoWatchStore.meta.queue
              const route = useRoute()
              const router = useRouter()
              if (queue.cursor <= 0) { return }
              queue.cursor += (-1)
              const currentPrevVideo = videoWatchStore.meta.queue.entries[queue.cursor]
              router.push(formatVideoPath({ videoId: currentPrevVideo.id, route }))
            }
          },
          playNextQueue: {
            description: 'Play next video in the queue',
            keyCode: 86,
            code: 'KeyV',
            callback: async ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              activeCursor.value = 'queue'
              const videoWatchStore = useVideoWatchStore()
              const queueSetting = videoWatchStore.setting.queue
              const queue = videoWatchStore.meta.queue
              const route = useRoute()
              const router = useRouter()
              if ((queue.entries.length === 0 || queue.cursor === queue.entries.length - 1)
                && queueSetting.autoAddRandomVideoIfQueueEmpty) {
                videoWatchStore.getHotKey.result.playNextRandom.callback({ videoDOM, currentVideo, playlistState, activeCursor })
                return
              }
              queue.cursor += 1
              const currentNextVideo = videoWatchStore.meta.queue.entries[queue.cursor]
              router.push(formatVideoPath({ videoId: currentNextVideo.id, route }))
            }
          },
          playPrevPlaylist: {
            description: 'Play previous video in playlist',
            keyCode: 65,
            code: 'KeyA',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              if (!playlistState.isAvailable) { return }
              const route = useRoute()
              const router = useRouter()
              activeCursor.value = 'playlist'
              if (playlistState.cursor <= 0) { return }
              playlistState.cursor += (-1)
              const currentPrevVideo = playlistState.entries[playlistState.cursor]
              router.push(formatVideoPath({
                videoId: currentPrevVideo.videoId,
                playlistId: currentPrevVideo.playlistId,
                playlistVideoIndex: currentPrevVideo.orderIndex,
                route
              }))

            }
          },
          playNextPlaylist: {
            description: 'Play next video in playlist',
            keyCode: 83,
            code: 'KeyS',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              if (!playlistState.isAvailable) { return }
              const route = useRoute()
              const router = useRouter()
              activeCursor.value = 'playlist'
              if (playlistState.entries.length === 0 ||
                playlistState.cursor === playlistState.entries.length - 1) {
                return
              }
              playlistState.cursor += 1
              const currentNextVideo = playlistState.entries[playlistState.cursor]
              router.push(formatVideoPath({
                videoId: currentNextVideo.videoId,
                playlistId: currentNextVideo.playlistId,
                playlistVideoIndex: currentNextVideo.orderIndex,
                route
              }))
            }
          },
          navigateToVideoList: {
            description: 'Navigate back to Main Video List',
            keyCode: 69,
            code: 'KeyE',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
              const router = useRouter()
              router.push('/')
            }
          },
          toggleTheaterMode: {
            description: 'Toggle theater mode',
            keyCode: 81,
            code: 'KeyQ',
            callback: ({ videoDOM, currentVideo, playlistState, activeCursor }: any) => {
            }
          }
        }
      }
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVideoWatchStore, import.meta.hot))
}
