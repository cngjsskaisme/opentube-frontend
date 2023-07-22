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
    element.thumbnailBase64 = ''
    return element
  })

  return tempVideoList
}