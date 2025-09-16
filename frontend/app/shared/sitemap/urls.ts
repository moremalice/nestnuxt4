import type { SitemapUrl } from '#sitemap/types'

export async function getAllSitemapUrls(): Promise<SitemapUrl[]> {
  const allUrls: SitemapUrl[] = [
    // 홈페이지 (최고 우선순위)
    {
      loc: '/',
      lastmod: new Date().toISOString(),
      priority: 1.0,
      changefreq: 'weekly'
    },
    // 정적 페이지들 (고정 페이지, 변경 빈도 낮음)
    {
      loc: '/policy/privacy',
      lastmod: '2024-12-01T00:00:00.000Z',
      priority: 0.7,
      changefreq: 'monthly'
    },
    {
      loc: '/policy/terms',
      lastmod: '2024-12-01T00:00:00.000Z',
      priority: 0.7,
      changefreq: 'monthly'
    },
    {
      loc: '/community/faq',
      priority: 0.6,
      changefreq: 'monthly'
    },
    {
      loc: '/community/notice',
      priority: 0.8,
      changefreq: 'daily'
    },
    {
      loc: '/login',
      priority: 0.5,
      changefreq: 'monthly'
    },
    {
      loc: '/dashboard',
      priority: 0.7,
      changefreq: 'weekly'
    },
    {
      loc: '/profile',
      priority: 0.6,
      changefreq: 'monthly'
    },

    // 동적 예시 페이지들
    {
      loc: '/example/1',
      lastmod: '2024-12-01T10:00:00.000Z',
      priority: 0.6,
      changefreq: 'weekly'
    },
    {
      loc: '/example/2',
      lastmod: '2024-11-28T14:30:00.000Z',
      priority: 0.6,
      changefreq: 'weekly'
    },
    {
      loc: '/example/3',
      lastmod: '2024-11-25T16:15:00.000Z',
      priority: 0.6,
      changefreq: 'weekly'
    },

    // 블로그 포스트 예시들
    {
      loc: '/blog/getting-started',
      lastmod: '2024-12-01T09:00:00.000Z',
      priority: 0.7,
      changefreq: 'monthly'
    },
    {
      loc: '/blog/nuxt-tutorial',
      lastmod: '2024-11-30T15:20:00.000Z',
      priority: 0.7,
      changefreq: 'monthly'
    },
    {
      loc: '/blog/vue-composition-api',
      lastmod: '2024-11-28T11:45:00.000Z',
      priority: 0.7,
      changefreq: 'monthly'
    }
  ]

  return allUrls
}