#!/usr/bin/env node

/**
 * 빌드 아티팩트 검증 스크립트
 * 다중 서버 배포 전 일관성 확인
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const buildDir = process.argv[2] || './build-output';

console.log('🔍 빌드 아티팩트 검증 시작...\n');

// 1. 빌드 정보 확인
const buildInfoPath = path.join(buildDir, 'build-info.json');
if (!fs.existsSync(buildInfoPath)) {
    console.error('❌ build-info.json을 찾을 수 없습니다.');
    process.exit(1);
}

const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
console.log('📋 빌드 정보:');
console.log(`  - Build ID: ${buildInfo.buildId}`);
console.log(`  - 타임스탬프: ${buildInfo.timestamp}`);
console.log(`  - Node 버전: ${buildInfo.nodeVersion || 'N/A'}`);
console.log();

// 2. 핵심 파일 존재 확인
const requiredFiles = [
    'backend/dist/main.js',
    'backend/package.json',
    'frontend/.output/nitro.json',
    'frontend/.output/server/index.mjs'
];

console.log('📁 필수 파일 확인:');
let missingFiles = [];
for (const file of requiredFiles) {
    const filePath = path.join(buildDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} (누락)`);
        missingFiles.push(file);
    }
}

if (missingFiles.length > 0) {
    console.error(`\n❌ ${missingFiles.length}개 파일이 누락되었습니다.`);
    process.exit(1);
}

// 3. 파일 해시 계산 (일관성 검증용)
console.log('\n🔐 파일 해시 계산:');
const hashManifest = {};

function calculateHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function processDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(prefix, item);

        if (fs.statSync(fullPath).isDirectory()) {
            // node_modules는 제외
            if (item !== 'node_modules') {
                processDirectory(fullPath, relativePath);
            }
        } else if (path.extname(item) === '.js' || path.extname(item) === '.mjs') {
            const hash = calculateHash(fullPath);
            hashManifest[relativePath] = hash;
            console.log(`  ${hash} ${relativePath}`);
        }
    }
}

processDirectory(buildDir);

// 4. 해시 매니페스트 저장
const manifestPath = path.join(buildDir, 'build-manifest.json');
const manifest = {
    buildId: buildInfo.buildId,
    timestamp: buildInfo.timestamp,
    files: hashManifest,
    totalFiles: Object.keys(hashManifest).length
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`\n📋 매니페스트 생성: build-manifest.json`);
console.log(`📊 총 ${manifest.totalFiles}개 파일 검증 완료`);

// 5. 배포 준비 상태 확인
const frontendOutput = path.join(buildDir, 'frontend', '.output');
const backendDist = path.join(buildDir, 'backend', 'dist');

if (fs.existsSync(frontendOutput) && fs.existsSync(backendDist)) {
    console.log('\n✅ 빌드 검증 완료 - 배포 준비됨');
    console.log(`💡 빌드 ID: ${buildInfo.buildId}`);
    console.log(`💡 매니페스트: ${manifestPath}`);
    process.exit(0);
} else {
    console.error('\n❌ 빌드 검증 실패 - 핵심 디렉토리 누락');
    process.exit(1);
}