import _ from 'lodash'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { useOpenTubeFetch } from '~/tools/useOpenTubeFetch'

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
      }
    },
    meta: {
      current: {
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
      clear () {
        this.meta.playlist.entries = []
      },
      setCursor (index: number) {
        this.meta.playlist.cursor = index
      },
      push (item: any) {
        this.meta.queue.entries.push(item)
        return item
      },
      pop (item: any) {
        return this.meta.queue.entries.pop()
      }
    },
    playlist: {
      async set (playlistId: number) {
        await useOpenTubeFetch(``)
      },
      async addVideo (videoId: number) {

      },
      async deleteVideo (videoId: number) {

      }
    }
  },
  getters: {
    getHotKey: (state) => {
      return {
        hotKey: {
          toggleBossKey: {
            description: 'Toggle boss key',
            keyCode: null,
            code: null,
            callback: null
          },
          togglePlay: {
            description: 'Toggle play & pause video',
            keyCode: 32,
            code: 'Space',
            callback: ({ videoDOM, currentVideo }: any) => {
              videoDOM.paused ? videoDOM.play() : videoDOM.pause()

            }
          },
          toggleFullScreen: {
            description: 'Toggle fullscreen mode',
            keyCode: 70,
            code: 'KeyF',
            callback: ({ videoDOM, currentVideo }: any) => {
              const targetWindow = window as any
              console.log(targetWindow)
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
            callback: ({ videoDOM, currentVideo }: any) => {
              const resultAmount = videoDOM.volume + state.setting.video.volumeAmount / 100
              if (resultAmount >= 1) { videoDOM.volume = 1; return }
              videoDOM.volume = resultAmount
            }
          },
          setVolumeDown: {
            description: 'Volume Down',
            keyCode: 40,
            code: 'ArrowDown',
            callback: ({ videoDOM, currentVideo }: any) => {
              const resultAmount = videoDOM.volume - state.setting.video.volumeAmount / 100
              if (resultAmount <= 0) { videoDOM.volume = 0; return }
              videoDOM.volume = resultAmount
            }
          },
          toggleVolumeMute: {
            description: 'Volume Mute',
            keyCode: 77,
            code: 'KeyM',
            callback: ({ videoDOM, currentVideo }: any) => {
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
            keyCode: 65,
            code: 'KeyA',
            callback: ({ videoDOM, currentVideo }: any) => {

            }
          },
          seekNextPoint: {
            description: 'Seek next point',
            keyCode: 39,
            code: 'ArrowRight',
            callback: ({ videoDOM, currentVideo }: any) => {
              const videoWatchStore = useVideoWatchStore()
              const finalVideoLength = videoDOM.duration >= currentVideo.length ? videoDOM.duration : currentVideo.length
              const resultCurrentTime = videoDOM.currentTime + videoWatchStore.setting.video.seekTimeAmount
              if (resultCurrentTime >= finalVideoLength) { videoDOM.currentTime = finalVideoLength; return }
              videoDOM.currentTime = resultCurrentTime
            }
          },
          seekPrevPoint: {
            description: 'Seek previous point',
            keyCode: 37,
            code: 'ArrowLeft',
            callback: ({ videoDOM, currentVideo }: any) => {
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
            callback: ({ videoDOM, currentVideo }: any) => {
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
            callback: async ({ videoDOM, currentVideo }: any) => {
              const router = useRouter()
              const randomIndexResult = await useOpenTubeFetch('/video/random/index') as any
              router.push(`/watch/${randomIndexResult.data.value.data}`)
            }
          },
          playPrevQueue: {
            description: 'Play previous video in the queue',
            keyCode: 67,
            code: 'KeyC',
            callback: ({ videoDOM, currentVideo }: any) => {
              const videoWatchStore = useVideoWatchStore()
              const queue = videoWatchStore.meta.queue
              const router = useRouter()
              if (queue.cursor <= 0) { return }
              queue.cursor += (-1)
              const currentPrevVideo = videoWatchStore.meta.queue.entries[queue.cursor]
              router.push(`/watch/${currentPrevVideo.id}`)
            }
          },
          playNextQueue: {
            description: 'Play next video in the queue',
            keyCode: 86,
            code: 'KeyV',
            callback: async ({ videoDOM, currentVideo }: any) => {
              const videoWatchStore = useVideoWatchStore()
              const queueSetting = videoWatchStore.setting.queue
              const queue = videoWatchStore.meta.queue
              const router = useRouter()
              if ((queue.entries.length === 0 || queue.cursor === queue.entries.length - 1)
                && queueSetting.autoAddRandomVideoIfQueueEmpty) {
                const randomIndexResult = await useOpenTubeFetch('/video/random/index') as any
                queue.cursor += 1
                router.push(`/watch/${randomIndexResult.data.value.data}`)
                return
              }
              queue.cursor += 1
              const currentNextVideo = videoWatchStore.meta.queue.entries[queue.cursor]
              router.push(`/watch/${currentNextVideo.id}`)
            }
          },
          playPrevPlaylist: {
            description: 'Play previous video in playlist',
            keyCode: 65,
            code: 'KeyA',
            callback: ({ videoDOM, currentVideo }: any) => {

            }
          },
          playNextPlaylist: {
            description: 'Play next video in playlist',
            keyCode: 83,
            code: 'KeyS',
            callback: ({ videoDOM, currentVideo }: any) => {

            }
          },
          navigateToVideoList: {
            description: 'Navigate back to Main Video List',
            keyCode: 68,
            code: 'KeyD',
            callback: ({ videoDOM, currentVideo }: any) => {
              const router = useRouter()
              router.push('/')
            }
          },
          toggleTheaterMode: {
            description: 'Toggle theater mode',
            keyCode: 81,
            code: 'KeyQ',
            callback: ({ videoDOM, currentVideo }: any) => {

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
