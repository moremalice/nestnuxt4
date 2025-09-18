<template>
  <div class="container">
    <h1>예시 동적 페이지</h1>
    <p>페이지 ID: {{ route.params.idx }}</p>
    <p>이 페이지는 동적 URL 사이트맵 테스트용입니다.</p>

    <div class="content">
      <h2>동적 콘텐츠 예시</h2>
      <p>실제 서비스에서는 여기에 데이터베이스에서 가져온 콘텐츠가 표시됩니다.</p>
      <ul>
        <li>게시물 제목</li>
        <li>게시물 내용</li>
        <li>작성일시</li>
        <li>작성자 정보</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

// 페이지 메타 정보 설정
useSeoMeta({
  title: `예시 페이지 ${route.params.id}`,
  description: `동적 URL 테스트용 예시 페이지입니다. ID: ${route.params.id}`
})
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.content {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

h1 {
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 0.5rem;
}

h2 {
  color: #555;
  margin-top: 1.5rem;
}

ul {
  list-style-type: disc;
  margin-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
}
</style>