# 크로스 플랫폼 개발환경 설정 가이드

## 개요

이 프로젝트는 Windows, WSL, Linux, macOS에서 동일하게 동작하도록 설계되었습니다.

## 플랫폼별 설치 방법

### Windows (PowerShell/CMD)
```bash
# 프론트엔드
cd frontend
rmdir /s node_modules
del package-lock.json
npm install
npm run local

# 백엔드
cd ../backend
rmdir /s node_modules
del package-lock.json
npm install
npm run local
```

### WSL/Linux/macOS
```bash
# 프론트엔드
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run local

# 백엔드
cd ../backend
rm -rf node_modules package-lock.json
npm install
npm run local
```

## 주요 수정사항

### 1. 크로스 플랫폼 스크립트 통일
- `backend/package.json`: Windows 전용 `set` 명령어를 `cross-env`로 교체
- 모든 플랫폼에서 동일한 환경변수 설정 방식 사용

### 2. 네이티브 바이너리 호환성 개선
- `frontend/.npmrc`, `backend/.npmrc`: 플랫폼별 바이너리 최적화 설정
- WSL 환경에서 발생하는 `oxc-parser` 바이너리 문제 해결

## 실행 확인

### 프론트엔드 (Nuxt 4)
- URL: http://localhost:3000
- 포트: 3000

### 백엔드 (NestJS)
- URL: http://localhost:3020
- Swagger UI: http://localhost:3020/api
- 포트: 3020

## 문제 해결

### 네이티브 바이너리 오류 발생 시
1. 현재 플랫폼에서 의존성 완전 재설치:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. 여전히 문제가 있다면 npm 캐시 정리:
   ```bash
   npm cache clean --force
   npm install
   ```

### WSL 특별 주의사항
- WSL은 Linux 커널을 사용하므로 `linux-x64-gnu` 바이너리가 필요
- Windows와 파일시스템을 공유하므로 때로는 바이너리 충돌 발생 가능
- 의존성 재설치가 가장 확실한 해결책

## 팀 협업 가이드

1. **새로운 팀원 온보딩**: 각자의 플랫폼에서 `npm install` 실행
2. **플랫폼 변경 시**: 의존성 재설치 권장
3. **CI/CD**: 플랫폼별 빌드 환경에서 별도 의존성 설치