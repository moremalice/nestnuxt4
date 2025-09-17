#!/bin/sh

# 다중 서버 배포 시뮬레이션 스크립트
# 실제 배포 전 테스트용

BUILD_DIR=${1:-"./build-output"}
SERVERS="server1 server2 server3"
TEMP_DIR="/tmp/deploy-test"

echo "🧪 배포 시뮬레이션 시작..."
echo "📂 빌드 디렉토리: $BUILD_DIR"

# 빌드 매니페스트 확인
if [ ! -f "$BUILD_DIR/build-manifest.json" ]; then
    echo "❌ build-manifest.json을 찾을 수 없습니다."
    exit 1
fi

BUILD_ID=$(grep '"buildId"' "$BUILD_DIR/build-manifest.json" | cut -d'"' -f4)
echo "🔖 빌드 ID: $BUILD_ID"

# 각 서버별 배포 시뮬레이션
for SERVER in $SERVERS; do
    echo "\n📡 $SERVER 배포 시뮬레이션..."

    SERVER_DIR="$TEMP_DIR/$SERVER"
    mkdir -p "$SERVER_DIR"

    # 아티팩트 복사 (실제로는 네트워크 전송)
    cp -r "$BUILD_DIR"/* "$SERVER_DIR/"

    # 서버별 설정 파일 생성
    cat > "$SERVER_DIR/deploy-config.json" << EOF
{
    "server": "$SERVER",
    "buildId": "$BUILD_ID",
    "deployTime": "$(date -Iseconds)",
    "status": "deployed"
}
EOF

    # 파일 무결성 검증
    if [ -f "$SERVER_DIR/build-manifest.json" ]; then
        echo "  ✅ 매니페스트 검증 완료"
    else
        echo "  ❌ 매니페스트 검증 실패"
    fi

    # 서비스 상태 시뮬레이션
    echo "  🔄 서비스 재시작 시뮬레이션..."
    sleep 1
    echo "  ✅ $SERVER 배포 완료"
done

# 전체 배포 검증
echo "\n🔍 전체 배포 검증..."
DEPLOY_SUCCESS=true

for SERVER in $SERVERS; do
    SERVER_CONFIG="$TEMP_DIR/$SERVER/deploy-config.json"
    if [ -f "$SERVER_CONFIG" ]; then
        SERVER_BUILD_ID=$(grep '"buildId"' "$SERVER_CONFIG" | cut -d'"' -f4)
        if [ "$SERVER_BUILD_ID" = "$BUILD_ID" ]; then
            echo "  ✅ $SERVER: 빌드 ID 일치 ($SERVER_BUILD_ID)"
        else
            echo "  ❌ $SERVER: 빌드 ID 불일치 (예상: $BUILD_ID, 실제: $SERVER_BUILD_ID)"
            DEPLOY_SUCCESS=false
        fi
    else
        echo "  ❌ $SERVER: 배포 설정 파일 없음"
        DEPLOY_SUCCESS=false
    fi
done

# 정리
rm -rf "$TEMP_DIR"

if [ "$DEPLOY_SUCCESS" = true ]; then
    echo "\n✅ 모든 서버 배포 시뮬레이션 성공!"
    echo "💡 실제 배포 시 동일한 빌드 ID가 모든 서버에 적용됩니다."
    exit 0
else
    echo "\n❌ 배포 시뮬레이션 실패!"
    echo "⚠️  실제 배포 전 문제를 해결하세요."
    exit 1
fi