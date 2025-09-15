// server/api/nestjs/[...path].ts
/**
 * 간소화된 NestJS API 프록시 라우트
 */

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = getMethod(event)
  const query = getQuery(event)
  const body = method !== 'GET' ? await readBody(event).catch(() => null) : null
  
  // 기본 헤더 포워딩
  const headers = getRequestHeaders(event)
  const forwardHeaders: Record<string, string> = {}
  
  // 중요한 헤더만 포워딩
  const importantHeaders = ['authorization', 'content-type', 'x-csrf-token', 'cookie']
  for (const header of importantHeaders) {
    if (headers[header]) {
      forwardHeaders[header] = headers[header] as string
    }
  }
  
  // 서버 요청 표시
  if (import.meta.server) {
    forwardHeaders['x-server-request'] = 'true'
  }
  
  try {
    const config = useRuntimeConfig()
    const nestApiUrl = config.public.NUXT_API_BASE_URL
    
    const response = await $fetch.raw(`${nestApiUrl}/${path}`, {
      method,
      query,
      body,
      headers: forwardHeaders,
      timeout: 30000,
      ignoreResponseError: true
    })
    
    // 응답 헤더 포워딩 (쿠키 등)
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      setResponseHeader(event, 'set-cookie', setCookie)
    }
    
    setResponseStatus(event, response.status || 200)
    return response._data
    
  } catch (error: any) {
    console.error('[Proxy Error]:', error.message)
    
    setResponseStatus(event, error.status || 500)
    return {
      status: 'error',
      data: {
        name: 'ProxyError',
        message: error.message || 'Backend request failed'
      }
    }
  }
})