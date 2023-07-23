import _ from 'lodash'

export default ({ videoList, videoMainListSettings, videoDOMList }) => {
  let registeredCallback = []
  return (videoEntry, index, clearEvent) => {
    videoList.value.data[index].isThumbnailTransitionStarted = true

    if (clearEvent) {
      _.forEach(registeredCallback, (element) => clearTimeout(element))
      registeredCallback = []
      videoList.value.data[index].shouldHideThumbnail = false
      videoList.value.data[index].isThumbnailTransitionStarted = false
      videoList.value.data[index].isThumbnailTransitionInTheMiddle = false
      return
    }

    if (registeredCallback?.length > 0) {
      _.forEach(registeredCallback, (element) => clearTimeout(element));
      registeredCallback = [];
      return
    }

    registeredCallback.push(setTimeout(() => {
      videoList.value.data = _.map(videoList.value.data, (element, innerIndex) => {
        element.isThumbnailTransitionStarted = (innerIndex === index)

        /* Thumbnail Transition Middle (Player Appears & Thumbnail Disappears) */
        registeredCallback.push(setTimeout(() => {
          element.isThumbnailTransitionInTheMiddle = (innerIndex === index)
        }, 80))

        /* Thumbnail Hide */
        registeredCallback.push(setTimeout(() => {
          element.shouldHideThumbnail = (innerIndex === index)
          if (videoMainListSettings.thumbnail.playerRandomPointPlay) {
            const currentVideoTag = videoDOMList.value[index] && videoDOMList.value[index].querySelector('video')
            if (currentVideoTag) {
              currentVideoTag.onloadedmetadata = () => {
                let randomSeed = 0
                try {
                  randomSeed = crypto.getRandomValues(new Uint32Array(1))[0] / Math.pow(2, 32)
                } catch { randomSeed = Math.random() }
                const finalVideoLength = currentVideoTag.duration >= element.length ? currentVideoTag.duration : element.length
                currentVideoTag.currentTime = Math.floor(randomSeed * finalVideoLength)
                try {
                  currentVideoTag.play()
                } catch (e) {
                  // noop 
                }
              };
            }
          }
        }, 200))

        return element
      })
    }, 500))
  }
}