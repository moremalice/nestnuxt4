// frontend/nuxt.config.ts

export default defineNuxtConfig({
    srcDir: 'app',
    // 하이브리드 렌더링: 기본 CSR, 특정 페이지만 SSR
    ssr: false,

    experimental: {
        asyncContext: true,
        // 빌드 재현성 향상을 위한 실험적 기능
        payloadExtraction: false
    },

    devtools: {
        enabled: process.env.NUXT_PUBLIC_APP_ENV !== 'production',
        timeline: {
            enabled: true
        }
    },

    modules: [
        '@nuxtjs/i18n',
        '@pinia/nuxt',
        '@nuxtjs/sitemap',
        '@nuxtjs/robots',
        'nuxt-aos',
        'nuxt-qrcode'
    ],

    // AOS 설정
    aos: {
        duration: 800,
        easing: 'ease-in-out',
        once: true
    },

    // QR 코드 설정
    qrcode: {
        options: {
            ecc: 'M',
            blackColor: '#000000',
            whiteColor: '#ffffff',
            border: 2
        }
    },

    compatibilityDate: '2024-04-03',

    // Auto-import 설정
    imports: {
        dirs: ['composables/**']
    },

    components: [
        {path: '~/components', pathPrefix: false},
    ],

    site: {
        url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        name: 'Pikitalk',
        indexable: process.env.NUXT_PUBLIC_APP_ENV === 'production' || process.env.NUXT_SITEMAP_PREVIEW === '1'
    },

    sitemap: {
        debug: true,
        sitemaps: {
            'sitemap.xml': {
                sources: ['/api/__sitemap__/urls'],
                includeAppSources: false
            }
        }
    },

    i18n: {
        // i18n 해석 기준 디렉토리를 app으로 변경
        restructureDir: 'app',

        // app/locales를 가리키게 됨
        langDir: 'locales',

        // (권장) SEO 사용 시 language 키 사용
        // 기존 iso 대신 language로 변경 예시
        locales: [
            {code: 'ko', language: 'ko-KR', file: 'ko.json'},
            {code: 'en', language: 'en-US', file: 'en.json'},
            {code: 'de', language: 'de-DE', file: 'de.json'},
            {code: 'es', language: 'es-ES', file: 'es.json'},
            {code: 'fr', language: 'fr-FR', file: 'fr.json'},
            {code: 'id', language: 'id-ID', file: 'id.json'},
            {code: 'it', language: 'it-IT', file: 'it.json'},
            {code: 'ja', language: 'ja-JP', file: 'ja.json'},
            {code: 'pt', language: 'pt-BR', file: 'pt-BR.json'},
            {code: 'ru', language: 'ru-RU', file: 'ru.json'},
            {code: 'th', language: 'th-TH', file: 'th.json'},
            {code: 'tr', language: 'tr-TR', file: 'tr.json'},
            {code: 'vi', language: 'vi-VN', file: 'vi.json'},
            {code: 'zh_s', language: 'zh-Hans', file: 'zh-CN.json'},
            {code: 'zh_t', language: 'zh-Hant', file: 'zh-TW.json'}
        ],

        defaultLocale: 'en',
        strategy: 'no_prefix',

        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: 'i18n_redirected',
            redirectOn: 'root',
            alwaysRedirect: false,
            fallbackLocale: 'ko',
            // 운영 환경에서는 HTTPS 사용 시 true 권장
            cookieSecure: process.env.NUXT_PUBLIC_APP_ENV === 'production',
        },

        // 보안/빌드 설정
        compilation: {
            // 엄격한 보안 모드 - HTML 태그 차단으로 XSS 공격 방지
            strictMessage: true,
            // HTML 이스케이프 처리로 보안 강화
            escapeHtml: true
        },
    },

    app: {
        head: {
            // meta 배열 useSEO.ts에서 관리
            link: [
                {rel: 'apple-touch-icon', sizes: '57x57', href: '/favicon.ico'},
                {rel: 'icon', type: 'image/png', sizes: '57x57', href: '/favicon.ico'},
            ],
            script: [
            ]
        }
    },

    css: [
        '~/assets/css/font.css',
        '~/assets/css/default.css',
        '~/assets/css/common.css',
        'swiper/css',
        'swiper/css/pagination',
        'swiper/css/navigation',
        '~/assets/css/content.css'
    ],

    // === Robots ===
    robots: process.env.NUXT_SITEMAP_PREVIEW === '1'
        ? {
            groups: [{ userAgent: '*', disallow: [] }],
            sitemap: ['/sitemap.xml'],
            cacheControl: 'no-store'
          }
        : {
            groups: [
                {
                    userAgent: '*',
                    disallow: process.env.NUXT_PUBLIC_APP_ENV === 'production' ? [] : ['/']
                }
            ],
            sitemap: ['/sitemap.xml'],
            cacheControl: process.env.NUXT_PUBLIC_APP_ENV === 'production'
                ? 'max-age=14400, must-revalidate'
                : 'no-store'
          },

    // === 하이브리드 렌더링 + 캐시 전략 ===
    routeRules: {
        // === SSR 페이지 (메인페이지와 특정 페이지만) ===
        '/': {
            ssr: true,
            prerender: true
        },
        '/dashboard': { ssr: true },
        '/profile': { ssr: true },
        '/blog/**': {
            ssr: true,
            headers: { 'cache-control': 's-maxage=3600' }
        },

        // === 나머지 모든 페이지는 기본값(CSR) 사용 ===

        // === API 및 시스템 파일 ===
        '/sitemap.xml': {
            swr: 0,
            headers: { 'cache-control': 'no-store' }
        },
        '/sitemap-*.xml': {
            swr: 0,
            headers: { 'cache-control': 'no-store' }
        },
        '/robots.txt': {
            swr: 0,
            headers: { 'cache-control': 'no-store' }
        },

        // === NestJS API 프록시 ===
        '/api/nestjs/**': {
            cors: true,
            headers: { 'access-control-allow-credentials': 'true' }
        }
    },

    runtimeConfig: {
        // ======== Server-Only (Private) ========
        // Backend API URL - Hidden from client bundles for security
        NEST_BACKEND_BASE_URL: process.env.NUXT_BACKEND_BASE_URL || 'http://localhost:3020',

        // ======== Client-Exposed (Public) ========
        // Variables safe for client-side exposure
        public: {
            // Application environment identifier
            NUXT_APP_ENVIRONMENT: process.env.NUXT_PUBLIC_APP_ENV || 'local',
            // API proxy path (hides real backend URL from client)
            NUXT_API_BASE_URL: process.env.NUXT_PUBLIC_API_BASE || '/api/nestjs',
            // Site URL for SEO, canonical URLs, and meta tags
            NUXT_APP_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            // CDN/File server URL for static resources and downloads
            NUXT_CDN_BASE_URL: process.env.NUXT_PUBLIC_CDN_BASE || '/api/proxy',
            // reCAPTCHA site key for client-side verification
            NUXT_RECAPTCHA_SITE_KEY: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
        }
    }
})
