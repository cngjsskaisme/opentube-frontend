export const useOpenTubeFetch = (request, opts) => {
  const config = useRuntimeConfig();

  return useFetch(request, { baseURL: config.public.fetchBaseURL, ...opts })
}