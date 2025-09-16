import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sources', (ctx) => {
    // 전역 소스를 실제 처리 파이프라인에 강제 포함
    ctx.sources.push('/api/__sitemap__/urls')
  })
})