// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    [
      '@nuxtjs/i18n',
      {
        vueI18n: './i18n.config.ts' // if you are using custom path, default 
      }
    ],
    '@vueuse/nuxt'
  ],
  runtimeConfig: {
    public: {
      fetchBaseURL: process.env.FETCH_BASE_URL
    }
  },
  vite: {
    optimizeDeps: {
      exclude: ['vue-demi']
    }
  }
})
