// frontend/server/api/__sitemap__/urls.ts
import { getAllSitemapUrls } from '~/shared/sitemap/urls'

export default defineSitemapEventHandler(async (event: any) => {
    try {
        console.log('[Sitemap] Generating URLs...')

        const allUrls = await getAllSitemapUrls()

        console.log(`[Sitemap] Generated ${allUrls.length} URLs`)
        return allUrls

    } catch (error) {
        console.error('[Sitemap] Error generating URLs:', error)
        // 에러 발생 시 최소한 홈페이지는 포함
        return [
            {
                loc: '/',
                lastmod: new Date().toISOString(),
                priority: 1.0,
                changefreq: 'weekly'
            }
        ]
    }
})

