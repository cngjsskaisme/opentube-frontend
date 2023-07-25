import _ from 'lodash'

const formatVideoPath = ({ videoId, playlistId, playlistVideoIndex, route, select }: { videoId: any, playlistId?: any, playlistVideoIndex?: any, route: any, select?: any }) => {
  let cVideoId = _.cloneDeep(videoId) || null
  let cPlaylistId = _.cloneDeep(playlistId) || null
  let cPlaylistVideoIndex = _.cloneDeep(playlistVideoIndex) || null
  let href = null

  let queries = { 'v': cVideoId, 'list': cPlaylistId, 'index': cPlaylistVideoIndex } as any
  queries = _.map(_.keys(queries), (key) => {
    const queryValue = queries[key]
    return queryValue ? `${key}=${queryValue}` : null
  })
  queries = _.filter(queries, (element) => { return element }).join('&')
  href = `/watch?${queries}`

  if (select?.videoId) {
    href = `/watch?v=${cVideoId}`
  }
  
  return href
}

export default formatVideoPath