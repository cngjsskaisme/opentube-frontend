import _ from 'lodash'

export default async ({ videoList } = { videoList: null }) => {
  let tempVideoList = null

  tempVideoList = _.map(videoList, (element) => {
    element.thumbnail = null
    element.shouldHideThumbnail = false
    element.isThumbnailTransitionStarted = false
    element.isThumbnailTransitionInTheMiddle = false
    element.videoPlayer = null
    element.title = element.path.split('\\')
    element.title = element.title[element.title.length - 1]
    return element
  })

  // _.forEach(videoList.value, async (element, index) => {
  //   try {
  //     videoList.value[index].thumbnail = await getVideoThumbnailBase64({
  //       videoPath: element.path,
  //       startingPoint: Math.floor(Math.random() * parseFloat(element.length)) || 0
  //     })
  //   } catch (e) {

  //   }
  // })

  return tempVideoList
}