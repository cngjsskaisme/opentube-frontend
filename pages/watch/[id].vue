<script setup>
const config = useRuntimeConfig()
const route = useRoute()
</script>

<template>
  <div style="width: 85%; margin: auto; display: flex">
    <div style="border: 1px solid black; flex-grow: 1">
      <video controls style="width: 100%">
        <source :src="`${config.public.fetchBaseURL}/file/stream/${route.params.id}`" type="video/mp4">
      </video>
    </div>
    <div style="border: 1px solid black; width: 200px">
      asdf
    </div>
  </div>
</template>