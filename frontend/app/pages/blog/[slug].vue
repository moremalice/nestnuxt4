<template>
  <div class="blog-post">
    <header class="post-header">
      <h1>{{ blogTitle }}</h1>
      <div class="post-meta">
        <span>작성일: {{ formatDate(sampleDate) }}</span>
        <span>카테고리: 예시</span>
      </div>
    </header>

    <article class="post-content">
      <p>이것은 블로그 포스트 예시 페이지입니다.</p>
      <p>Slug: <code>{{ $route.params.slug }}</code></p>

      <h2>동적 라우팅 테스트</h2>
      <p>이 페이지는 동적 라우팅을 통해 생성되며, 사이트맵에 자동으로 포함됩니다.</p>

      <h3>예시 콘텐츠</h3>
      <ul>
        <li>실제 블로그에서는 마크다운 또는 리치 텍스트 콘텐츠가 표시됩니다</li>
        <li>댓글 시스템이 있을 수 있습니다</li>
        <li>태그나 카테고리별 분류가 가능합니다</li>
        <li>관련 글 추천 기능이 있을 수 있습니다</li>
      </ul>
    </article>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const blogTitle = computed(() => {
  return `${slug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 블로그 포스트`
})

const sampleDate = '2024-12-01T10:00:00Z'

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// SEO 메타 태그 설정
useSeoMeta({
  title: blogTitle.value,
  description: `${slug} 블로그 포스트 - 동적 URL 테스트용 예시 페이지`,
  ogTitle: blogTitle.value,
  ogDescription: `동적 라우팅 테스트용 블로그 포스트입니다.`
})
</script>

<style scoped>
.blog-post {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.6;
}

.post-header {
  border-bottom: 1px solid #eee;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}

.post-header h1 {
  color: #2c3e50;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.post-meta span {
  padding: 0.25rem 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.post-content {
  font-size: 1.1rem;
}

.post-content h2 {
  color: #34495e;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.post-content h3 {
  color: #555;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.post-content code {
  background-color: #f1f2f6;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.post-content ul {
  margin-left: 1.5rem;
}

.post-content li {
  margin-bottom: 0.5rem;
}
</style>