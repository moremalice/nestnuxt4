<!-- ~/app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const { locales } = useI18n()
const config = useRuntimeConfig()

/*/!* -------- 다국어 처리시 -------- *!/
useHead({
  link: computed(() => {
    if (!locales.value || locales.value.length === 0) return []

    const links: Array<{ rel: string; hreflang: string; href: string }> = []
    const siteUrl = config.public.NUXT_APP_SITE_URL

    for (const loc of locales.value) {
      const localeCode = typeof loc === 'string' ? loc : loc.code
      const localeIso = typeof loc === 'string'
          ? loc
          : (typeof loc.iso === 'string' ? loc.iso : loc.code)

      links.push({
        rel: 'alternate',
        hreflang: localeIso,
        href: `${siteUrl}${route.path}`
      })
    }

    links.push({
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${siteUrl}${route.path}`
    })

    return links
  })
})*/
</script>
