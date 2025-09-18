// server/api/nestjs/[...path].ts
/**
 * NestJS API 프록시 라우트
 * 클라이언트 요청을 프라이빗 백엔드 URL로 안전하게 전달
 */

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = getMethod(event)
  const query = getQuery(event)
  const body = method !== 'GET' ? await readBody(event).catch(() => null) : null

  // 필수 헤더만 전달
  const headers = getRequestHeaders(event)
  const forwardHeaders: Record<string, string> = {}

  // 보안 및 인증 헤더 전달
  const importantHeaders = ['authorization', 'content-type', 'x-csrf-token', 'cookie']
  for (const header of importantHeaders) {
    if (headers[header]) {
      forwardHeaders[header] = headers[header] as string
    }
  }

  if (import.meta.server) {
    forwardHeaders['x-server-request'] = 'true'
  }
  
  try {
    const config = useRuntimeConfig()
    const nestApiUrl = config.backendBaseUrl
    
    const response = await $fetch.raw(`${nestApiUrl}/${path}`, {
      method,
      query,
      body,
      headers: forwardHeaders,
      timeout: 30000,
      ignoreResponseError: true
    })

    // 응답 헤더 전달 (쿠키 등)
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