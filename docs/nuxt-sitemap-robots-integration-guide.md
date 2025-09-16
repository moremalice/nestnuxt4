# Nuxt 4 Sitemap/Robots 이슈 해결 가이드 (실무용)

> **목표**: 개발/스테이징 환경에서 `__sitemap__/debug.json`에는 14개 URL이 보이는데 실제 `sitemap.xml`에는 1개만 출력되는 문제를 **안전하게** 해결하고, 운영 배포 시 **정상 인덱싱** + **스테이징/개발 안전 차단**을 동시에 만족하는 구성으로 표준화한다.

---

## TL;DR (핵심만)

- **원인**: 비프로덕션에서 `robots.txt`가 `Disallow: /` 이거나 `site.indexable=false` → Nuxt Sitemap이 **로봇 정책을 존중**하여 다수 URL을 sitemap에서 제외.
- **해결**:
  1) **반드시** `NUXT_SITE_URL`을 환경별로 설정 (로컬/스테이징/운영).
  2) 운영에서만 인덱싱, 개발·스테이징은 인덱싱 금지. 다만 **프리뷰 토글**(`NUXT_SITEMAP_PREVIEW=1`)로 개발/스테이징에서도 **임시로** sitemap 결과를 확인 가능.
  3) `includeGlobalSources:false`로 **API에서 제공하는 소스만** 사용해 디버깅 단순화.
  4) 검증 단계에서는 `routeRules` 캐시를 **임시로 끄고** 결과 확정 후 재활성화.

---

## 사전 조건

- Nuxt 4.x
- `@nuxtjs/sitemap` `^7.4.3` 이상
- `@nuxtjs/robots` 설치
- 서버 런타임에서 `.env`를 환경별로 분리(`.env.local`, `.env.development`, `.env.staging`, `.env.production` 등)

설치(미설치 시):

```bash
pnpm add -D @nuxtjs/sitemap @nuxtjs/robots
# or
yarn add -D @nuxtjs/sitemap @nuxtjs/robots
# or
npm i -D @nuxtjs/sitemap @nuxtjs/robots
```

---

## 환경 변수 표준화

### 1) 필수 환경 변수 (`NUXT_SITE_URL`)

각 환경에 맞춰 **반드시 설정**하세요.

```env
# .env.local (로컬)
NUXT_SITE_URL=http://localhost:3000

# .env.development (개발 서버 예시)
NUXT_SITE_URL=https://dev.pikitalk.com

# .env.staging (스테이징 예시)
NUXT_SITE_URL=https://staging.pikitalk.com

# .env.production (운영)
NUXT_SITE_URL=https://pikitalk.com
```

### 2) 선택: 프리뷰 토글

스테이징/개발에서 **일시적으로 sitemap 결과를 확인**할 때 사용:

```env
# 필요 시에만 1로 켬 (기본 OFF)
NUXT_SITEMAP_PREVIEW=1
```

> 운영에서는 **절대** 프리뷰 토글을 켜둘 필요가 없습니다.

---

## `nuxt.config.ts` 권장 구성 (핵심만 발췌)

아래 블록을 현재 구성에 **병합**하세요. (주석 참고)

```ts
// nuxt.config.ts
const isProd = process.env.NUXT_PUBLIC_APP_ENV === 'production'
const preview = process.env.NUXT_SITEMAP_PREVIEW === '1'

export default defineNuxtConfig({
  // ... 생략 ...

  // === Nuxt Site (Nuxt SEO 스택) ===
  site: {
    // ✅ 반드시 값이 존재해야 함. 환경별 .env에서 주입
    url: process.env.NUXT_SITE_URL!, 
    name: 'Pikitalk',
    // ✅ 운영에서만 인덱싱, 프리뷰 토글 시 임시 인덱싱 허용
    indexable: isProd || preview
  },

  // === Robots ===
  robots: preview
    // 프리뷰 모드: 임시로 차단 해제하여 sitemap 결과 확인
    ? {
        groups: [{ userAgent: '*', disallow: [] }],
        sitemap: ['/sitemap.xml'],
        cacheControl: 'no-store'
      }
    // 기본: 운영 외엔 차단(안전), 운영은 허용
    : {
        groups: [
          {
            userAgent: '*',
            disallow: isProd ? [] : ['/']
          }
        ],
        sitemap: ['/sitemap.xml'],
        cacheControl: isProd 
          ? 'max-age=14400, must-revalidate' // 운영: 4시간
          : 'no-store'                       // 개발/스테이징: 캐시 금지
      },

  // === Sitemap ===
  sitemap: {
    debug: true,
    sitemaps: {
      'sitemap.xml': {
        // ✅ API에서 제공하는 소스만 사용 (혼입 방지)
        sources: ['/api/__sitemap__/urls'],
        includeGlobalSources: false,
        includeAppSources: false
      }
    }
  },

  // === 캐시 / 헤더: 초기 검증 시 캐시 끄고 정확성부터 확보 ===
  routeRules: {
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

    // ... 기존 규칙들 유지 ...
  },

  // ... 나머지 설정 유지 ...
})
```

> **Tip**  
> 초기 검증이 끝나면 `routeRules`의 캐시 정책을 원래대로 복구하세요. (예: `swr: 600`, `stale-while-revalidate=86400` 등)

---

## API 응답 규격 재확인

`/api/__sitemap__/urls`는 아래 형태의 **배열**을 반환해야 합니다.

```ts
type SitemapUrl = {
  loc: string              // 필수: '/path' 또는 절대 URL
  lastmod?: string         // ISO8601 (예: new Date().toISOString())
  changefreq?: string      // 'daily' | 'weekly' ...
  priority?: number        // 0.0 ~ 1.0
}
```

- **loc**은 상대 경로여도 **OK**. 단, `site.url`이 반드시 채워져야 최종 정규화가 정확합니다.
- **lastmod**는 **문자열**로 ISO8601 보장(형식 에러는 드랍 원인).
- **중복 loc** 제거하세요(수집/집계 과정에서 중복 발생 가능).

---

## 검증 체크리스트 (순서대로)

1. **캐시 폴더 정리**  
   ```bash
   rimraf .nuxt .output .cache node_modules/.cache || true
   ```

2. **환경 변수 확인**  
   - `NUXT_SITE_URL`이 현재 환경(.env.\*)에 **정확히** 채워져 있는지
   - 프리뷰할 때만 `NUXT_SITEMAP_PREVIEW=1` 셋

3. **개발 서버 재시작**

4. **API 확인**  
   - `GET /api/__sitemap__/urls` → **14건** JSON 배열 확인

5. **디버그 확인**  
   - `GET /__sitemap__/debug.json` → `sitemaps.sitemap.xml.sources`에 **14건**

6. **Sitemap 확인**  
   - `GET /sitemap.xml` → **14건 노출**(프리뷰 토글 ON 또는 운영 환경)

7. **프리뷰 종료**  
   - `NUXT_SITEMAP_PREVIEW` 제거, `routeRules` 캐시 정책 복구

---

## 문제 해결 가이드 (증상별)

| 증상 | 원인 | 해결 |
|---|---|---|
| 디버그엔 14건인데 `sitemap.xml`은 0~1건 | 비프로덕션에서 `Disallow:/`, `site.indexable=false`, `routeRules.index:false` | 프리뷰 토글 사용 또는 로봇 차단 임시 해제. `index:false` 사용 금지. |
| 상대 경로가 이상하게 보이거나 누락 | `NUXT_SITE_URL` 미설정 | 환경별 `.env`에 `NUXT_SITE_URL` 필수 설정 |
| 디버그에 24건 등 **예상보다 많음** | `includeGlobalSources:true`로 기본 소스 섞임 | `includeGlobalSources:false` 로 API 소스만 사용 |
| 여전히 1~2건만 출력 | API 중 **형식 오류** (lastmod 형식, priority 범위, 중복 loc) | API 응답 형식 재검증, 중복 제거 |
| 경로가 `__sitemap__/sitemap.xml.xml` 등 혼동 | 디버그/내부 경로 오인 | 정식 엔드포인트는 `/sitemap.xml` 및 `/sitemap_index.xml` 사용 |
| 수정해도 결과 동일 | 캐시 | `.nuxt/.output` 삭제 + `routeRules` no-store로 재검증 |

---

## 운영/보안 베스트 프랙티스

- 스테이징은 **robots 허용** 대신 **HTTP Basic Auth / IP 제한**으로 보호하세요.  
  검색엔진 접근 자체가 불가하므로 sitemap 프리뷰를 항상 안전하게 확인할 수 있습니다.
- 운영에서만 `site.indexable:true` + robots 허용.
- CI에서 **브랜치/환경**에 따라 `NUXT_SITE_URL`, `NUXT_SITEMAP_PREVIEW`를 엄격히 분기.

### (예시) Nginx Basic Auth (스테이징)

```nginx
server {
  server_name staging.pikitalk.com;

  auth_basic "Restricted";
  auth_basic_user_file /etc/nginx/.htpasswd; # htpasswd로 생성

  location / {
    proxy_pass http://127.0.0.1:3000;
  }
}
```

---

## 최종 권장 Diff (핵심 포인트만)

```diff
- site: {
-   url: process.env.NUXT_PUBLIC_SITE_URL,
-   name: 'Pikitalk'
- },
+ const isProd = process.env.NUXT_PUBLIC_APP_ENV === 'production'
+ const preview = process.env.NUXT_SITEMAP_PREVIEW === '1'
+ site: {
+   url: process.env.NUXT_SITE_URL!,   // 환경별 고정
+   name: 'Pikitalk',
+   indexable: isProd || preview
+ },

- robots: {
-   groups: [{ userAgent: '*', disallow: process.env.NUXT_PUBLIC_APP_ENV === 'production' ? [] : ['/'] }],
-   sitemap: ['/sitemap.xml'],
-   cacheControl: 'max-age=14400, must-revalidate',
- },
+ robots: preview
+   ? { groups: [{ userAgent: '*', disallow: [] }], sitemap: ['/sitemap.xml'], cacheControl: 'no-store' }
+   : { groups: [{ userAgent: '*', disallow: isProd ? [] : ['/'] }], sitemap: ['/sitemap.xml'] },

- sitemap: {
-   debug: true,
-   sitemaps: {
-     'sitemap.xml': {
-       sources: ['/api/__sitemap__/urls'],
-       includeGlobalSources: true,
-       includeAppSources: false,
-     },
-   },
- },
+ sitemap: {
+   debug: true,
+   sitemaps: {
+     'sitemap.xml': {
+       sources: ['/api/__sitemap__/urls'],
+       includeGlobalSources: false,
+       includeAppSources: false
+     }
+   }
+ },

- routeRules: {
-   '/sitemap.xml': { swr: 600, headers: { 'cache-control': 'public, max-age=600, stale-while-revalidate=86400' } },
-   '/sitemap-*.xml': { swr: 600, headers: { 'cache-control': 'public, max-age=600, stale-while-revalidate=86400' } },
-   '/robots.txt': { swr: 600, headers: { 'cache-control': 'public, max-age=600, must-revalidate' } },
- },
+ routeRules: {
+   '/sitemap.xml': { swr: 0, headers: { 'cache-control': 'no-store' } },
+   '/sitemap-*.xml': { swr: 0, headers: { 'cache-control': 'no-store' } },
+   '/robots.txt': { swr: 0, headers: { 'cache-control': 'no-store' } },
+   // 안정화 후 운영 캐시로 복구
+ },
```

---

## 롤백 가이드

- 문제가 생기면 **프리뷰 토글 OFF** + 기존 `robots`/`routeRules` 캐시 정책으로 **즉시 복귀**.
- `NUXT_SITE_URL`은 **그대로 유지**(필수).

---

## 부록: 점검 스크립트 (선택)

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:3000}"

echo "[1] API URLs"
curl -fsSL "$BASE/api/__sitemap__/urls" | jq 'length'

echo "[2] Debug Sources"
curl -fsSL "$BASE/__sitemap__/debug.json" | jq '.sitemaps["sitemap.xml"].sources | length'

echo "[3] Sitemap XML (첫 20줄)"
curl -fsSL "$BASE/sitemap.xml" | sed -n '1,20p'
```

---

## 마무리

- 이 가이드는 **운영 안전성**(스테이징/개발 검색 노출 차단)과 **개발 편의성**(프리뷰 토글) 사이의 **현실적인 균형**을 제공합니다.
- 위 순서대로 적용하면 “디버그 OK, XML 1건” 문제는 **즉시 해소**되며, 배포 이후에도 **예측 가능한 결과**를 유지할 수 있습니다.
