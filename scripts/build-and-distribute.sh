#!/bin/bash

# 중앙화된 빌드 및 배포 스크립트
# 단일 빌드 환경에서 아티팩트 생성 후 여러 서버에 배포

set -e

# 설정
BUILD_DIR="./dist"
ARCHIVE_NAME="build-$(date +%Y%m%d-%H%M%S).tar.gz"
SERVERS=("server1.example.com" "server2.example.com" "server3.example.com")
DEPLOY_USER="deploy"
DEPLOY_PATH="/var/www/app"

echo "🏗️  중앙화된 빌드 시작..."

# 1. 클린 빌드 환경 준비
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# 2. Backend 빌드 (NestJS)
echo "📦 Backend 빌드 중..."
cd backend
npm ci --only=production
npm run build
cp -r dist node_modules package.json ../dist/backend/
cd ..

# 3. Frontend 빌드 (Nuxt 4)
echo "🎨 Frontend 빌드 중..."
cd frontend
npm ci --only=production

# 재현 가능한 빌드를 위한 환경 설정
export NODE_ENV=production
export NUXT_BUILD_TIMESTAMP=$(date +%s)
export NUXT_BUILD_ID="${GITHUB_SHA:-$(git rev-parse HEAD)}"

npm run build
cp -r .output static ../dist/frontend/
cd ..

# 4. 빌드 메타데이터 생성
cat > $BUILD_DIR/build-info.json << EOF
{
  "buildId": "$NUXT_BUILD_ID",
  "timestamp": "$NUXT_BUILD_TIMESTAMP",
  "version": "$(git describe --tags --always)",
  "branch": "$(git branch --show-current)",
  "commit": "$(git rev-parse HEAD)"
}
EOF

# 5. 아티팩트 아카이브 생성
echo "📦 아티팩트 패키징 중..."
tar -czf $ARCHIVE_NAME -C $BUILD_DIR .

# 6. 여러 서버에 동시 배포
echo "🚀 다중 서버 배포 시작..."
for SERVER in "${SERVERS[@]}"; do
  echo "  → $SERVER 배포 중..."

  # 병렬 배포
  (
    # 아티팩트 업로드
    scp $ARCHIVE_NAME $DEPLOY_USER@$SERVER:/tmp/

    # 서버에서 배포 실행
    ssh $DEPLOY_USER@$SERVER << 'ENDSSH'
      cd /tmp
      sudo systemctl stop app-backend app-frontend

      # 백업 생성
      sudo cp -r /var/www/app /var/www/app.backup.$(date +%s)

      # 새 아티팩트 배포
      sudo rm -rf /var/www/app/*
      sudo tar -xzf /tmp/build-*.tar.gz -C /var/www/app/
      sudo chown -R app:app /var/www/app

      # 서비스 재시작
      sudo systemctl start app-backend app-frontend
      sudo systemctl status app-backend app-frontend

      # 정리
      rm /tmp/build-*.tar.gz
ENDSSH
  ) &
done

# 모든 배포 완료 대기
wait

echo "✅ 모든 서버 배포 완료!"
echo "📄 빌드 정보: $BUILD_DIR/build-info.json"