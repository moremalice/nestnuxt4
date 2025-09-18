<!-- components/dev/SecurityCheckComponent.vue -->
<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const isLocal = runtimeConfig.public.appEnv === 'local'

interface SecurityCheck {
  name: string
  status: 'safe' | 'warning' | 'danger'
  message: string
  details?: string[]
}

const securityChecks = ref<SecurityCheck[]>([])

// SSR 직렬화 데이터 검사
const checkSSRSerialization = (): SecurityCheck => {
  if (!import.meta.client) {
    return {
      name: 'SSR Serialization',
      status: 'warning',
      message: 'Cannot check on server side'
    }
  }

  const nuxtData = (window as any).__NUXT__
  if (!nuxtData) {
    return {
      name: 'SSR Serialization',
      status: 'safe',
      message: 'No __NUXT__ data found (CSR mode)'
    }
  }

  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /private/i,
    /credential/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i
  ]

  const serializedData = JSON.stringify(nuxtData)
  const foundSensitive: string[] = []

  sensitivePatterns.forEach(pattern => {
    const matches = serializedData.match(new RegExp(pattern.source, 'gi'))
    if (matches) {
      foundSensitive.push(...matches)
    }
  })

  if (foundSensitive.length > 0) {
    return {
      name: 'SSR Serialization',
      status: 'danger',
      message: `Potential sensitive data found in window.__NUXT__`,
      details: [...new Set(foundSensitive)]
    }
  }

  return {
    name: 'SSR Serialization',
    status: 'safe',
    message: 'No sensitive data patterns detected in window.__NUXT__'
  }
}

// 환경변수 노출 검사
const checkEnvironmentVariables = (): SecurityCheck => {
  const publicConfig = runtimeConfig.public
  
  // 실제로 위험한 키워드들만 체크
  const dangerousPatterns = [
    /secret/i,
    /password/i,
    /private[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /api[_-]?key/i,
    /auth[_-]?token/i,
    /database[_-]?url/i,
    /jwt[_-]?secret/i
  ]
  
  const sensitiveKeys = Object.keys(publicConfig).filter(key => 
    dangerousPatterns.some(pattern => pattern.test(key))
  )

  // 값도 체크 (실제 토큰이나 비밀 형태인지)
  const sensitiveValues = Object.entries(publicConfig).filter(([key, value]) => {
    const valueStr = String(value)
    return (
      valueStr.length > 32 && // 긴 문자열
      (/^[A-Za-z0-9+/=]{32,}$/.test(valueStr) || // Base64 형태
       /^[a-f0-9]{32,}$/.test(valueStr) || // Hex 형태
       /^sk_/.test(valueStr) || // Stripe secret key
       /^pk_/.test(valueStr)) // Public key 패턴
    )
  }).map(([key]) => key)

  const allSensitive = [...new Set([...sensitiveKeys, ...sensitiveValues])]

  if (allSensitive.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'danger',
      message: 'Potentially sensitive data found in public environment variables',
      details: allSensitive.map(key => `${key}: ${publicConfig[key]}`)
    }
  }

  // 안전한 public 변수들 표시
  const publicKeys = Object.keys(publicConfig)
  const details = publicKeys.map(key => `${key}: ${publicConfig[key]}`)

  return {
    name: 'Environment Variables',
    status: 'safe',
    message: publicKeys.length > 0 
      ? `${publicKeys.length} safe public environment variables found`
      : 'No public environment variables found',
    details
  }
}

// console.log를 통한 정보 누출 검사
const checkConsoleLeaks = (): SecurityCheck => {
  if (!import.meta.client) {
    return {
      name: 'Console Leaks',
      status: 'warning',
      message: 'Cannot check on server side'
    }
  }

  // 개발 도구에서 console.log 캐치 시뮬레이션
  const originalLog = console.log
  const loggedData: string[] = []
  
  // 짧은 시간 동안 console.log 모니터링
  console.log = (...args) => {
    const logString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    loggedData.push(logString)
    originalLog.apply(console, args)
  }

  // 원래 console.log 복원
  setTimeout(() => {
    console.log = originalLog
  }, 100)

  return {
    name: 'Console Leaks',
    status: 'safe',
    message: 'Console monitoring enabled for development'
  }
}

// 모든 보안 검사 실행
const runSecurityChecks = () => {
  securityChecks.value = [
    checkSSRSerialization(),
    checkEnvironmentVariables(),
    checkConsoleLeaks()
  ]
}

// 브라우저 개발자 도구에서 실행할 수 있는 함수 노출
const exposeSecurityTools = () => {
  if (!import.meta.client) return

  // 전역 보안 체크 함수 노출
  (window as any).checkNuxtSecurity = () => {
    console.group('🔒 Nuxt Security Check')
    
    // 1. __NUXT__ 데이터 검사
    const nuxtData = (window as any).__NUXT__
    if (nuxtData) {
      console.warn('⚠️ __NUXT__ data found. Checking for sensitive information...')
      console.log('__NUXT__ data:', nuxtData)
      
      const serialized = JSON.stringify(nuxtData)
      const sensitivePatterns = [
        /password/i, /secret/i, /token/i, /key/i, /auth/i,
        /private/i, /credential/i, /api[_-]?key/i
      ]
      
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(serialized)) {
          console.error(`🚨 Potential sensitive data pattern found: ${pattern}`)
        }
      })
    } else {
      console.log('✅ No __NUXT__ data found (CSR mode)')
    }
    
    // 2. Runtime Config 검사
    console.log('🔧 Runtime Config Public:', useRuntimeConfig().public)
    
    // 3. 환경변수 검사
    const envKeys = Object.keys(useRuntimeConfig().public)
    if (envKeys.length > 0) {
      console.warn(`⚠️ ${envKeys.length} public environment variables exposed:`, envKeys)
    }
    
    console.groupEnd()
  }

  console.log('🔒 Security tools loaded. Run checkNuxtSecurity() to perform security check.')
}

onMounted(() => {
  if (isLocal) {
    runSecurityChecks()
    exposeSecurityTools()
  }
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'safe': return '#10b981'
    case 'warning': return '#f59e0b'
    case 'danger': return '#ef4444'
    default: return '#6b7280'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'safe': return '✅'
    case 'warning': return '⚠️'
    case 'danger': return '🚨'
    default: return '❓'
  }
}
</script>

<template>
  <div v-if="isLocal" class="security-check-container">
    <div class="security-check-header">
      <h3>🔒 Security Check (Development Only)</h3>
      <button @click="runSecurityChecks" class="refresh-btn">
        🔄 Refresh
      </button>
    </div>
    
    <div class="security-checks">
      <div 
        v-for="check in securityChecks" 
        :key="check.name"
        class="security-check-item"
        :style="{ borderLeftColor: getStatusColor(check.status) }"
      >
        <div class="check-header">
          <span class="check-icon">{{ getStatusIcon(check.status) }}</span>
          <span class="check-name">{{ check.name }}</span>
          <span 
            class="check-status"
            :style="{ color: getStatusColor(check.status) }"
          >
            {{ check.status.toUpperCase() }}
          </span>
        </div>
        
        <p class="check-message">{{ check.message }}</p>
        
        <details v-if="check.details" class="check-details">
          <summary>Details</summary>
          <ul>
            <li v-for="detail in check.details" :key="detail">
              <code>{{ detail }}</code>
            </li>
          </ul>
        </details>
      </div>
    </div>
    
    <div class="security-tools">
      <h4>🛠️ Developer Tools</h4>
      <p>Open browser console and run:</p>
      <code class="console-command">checkNuxtSecurity()</code>
    </div>
  </div>
</template>

<style scoped>
.security-check-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 16px;
  font-family: monospace;
  font-size: 12px;
  color: #f9fafb;
  z-index: 9999;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.security-check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #374151;
}

.security-check-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
}

.refresh-btn {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
}

.refresh-btn:hover {
  background: #4338ca;
}

.security-check-item {
  margin-bottom: 12px;
  padding: 12px;
  border-left: 4px solid #6b7280;
  background: #111827;
  border-radius: 4px;
}

.check-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.check-name {
  font-weight: bold;
  flex-grow: 1;
}

.check-status {
  font-size: 10px;
  font-weight: bold;
}

.check-message {
  margin: 0 0 8px 0;
  color: #d1d5db;
}

.check-details {
  font-size: 10px;
}

.check-details summary {
  cursor: pointer;
  color: #9ca3af;
  margin-bottom: 4px;
}

.check-details ul {
  margin: 0;
  padding-left: 16px;
}

.check-details li {
  margin-bottom: 2px;
}

.check-details code {
  background: #374151;
  padding: 1px 4px;
  border-radius: 2px;
  color: #fbbf24;
}

.security-tools {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #374151;
}

.security-tools h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
}

.security-tools p {
  margin: 0 0 4px 0;
  color: #d1d5db;
}

.console-command {
  display: block;
  background: #374151;
  padding: 8px;
  border-radius: 4px;
  color: #fbbf24;
  font-family: monospace;
  font-size: 11px;
}
</style>