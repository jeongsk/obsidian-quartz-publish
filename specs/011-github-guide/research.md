# Research: GitHub 리포지토리 설정 가이드

**Feature**: 011-github-guide
**Date**: 2026-01-15

## 기존 코드베이스 분석

### Decision: 기존 스텝 위자드 모달 패턴 재사용

**Rationale**: `DeployGuideModal` 클래스가 이미 스텝 위자드 패턴을 구현하고 있음. 동일한 패턴을 확장하여 일관된 UX 제공.

**Alternatives considered**:
- 새로운 모달 패턴 구현 → 기존 패턴이 이미 검증됨, 불필요한 중복
- 외부 라이브러리 사용 → Obsidian 의존성 최소화 원칙 위반

### Decision: 이미지 자산 위치

**Rationale**: Obsidian 플러그인은 빌드 시 `main.js`에 모든 코드가 번들링됨. 이미지는 Base64로 인코딩하여 TypeScript 파일에 포함하거나, 별도의 assets 폴더에 저장 후 플러그인 폴더에서 로드.

**선택**: Base64 인코딩으로 TypeScript 상수에 포함
- 오프라인 지원 보장
- 별도 파일 관리 불필요
- 이미지 크기가 크지 않음 (스크린샷 약 5-10개, 압축 시 각 50-100KB)

**Alternatives considered**:
- 외부 URL에서 로드 → 오프라인 미지원 (요구사항 위반)
- assets 폴더 사용 → manifest.json 수정 필요, 복잡도 증가

### Decision: 가이드 데이터 구조

**Rationale**: 기존 `DeployGuideStep` 타입을 확장하여 스크린샷과 완료 조건 추가

**확장 필드**:
- `screenshot?: string` - Base64 인코딩된 이미지
- `completionCheck?: () => boolean` - 자동 완료 체크 함수
- `troubleshootingTips?: string[]` - 단계별 문제 해결 팁

## 기술 스택 결정

### Decision: TypeScript + Obsidian API

**Rationale**: 기존 프로젝트 스택 유지. 추가 의존성 없음.

**사용 기술**:
- TypeScript 5.9+
- Obsidian API (Modal, App)
- TailwindCSS v4 (`qp:` prefix)

## 성능 고려사항

### Decision: 이미지 lazy loading 불필요

**Rationale**:
- 가이드 모달은 한 번에 하나의 이미지만 표시
- 이미지가 번들에 포함되어 이미 메모리에 로드됨
- SC-005 요구사항 (1초 이내 표시) 충족 가능

## 진행 상황 체크 로직

### Decision: 플러그인 설정 기반 자동 감지

**Rationale**: 기존 `PluginSettings` 인터페이스의 값을 확인하여 완료 상태 결정

**완료 조건**:
1. GitHub 계정: 항상 "수동 확인" (플러그인에서 확인 불가)
2. Fork: `repoUrl` 설정 여부
3. PAT: `githubToken` 설정 여부
4. 연결 확인: `GitHubService.validateToken()` 성공 여부

## 가이드 단계 설계

### 단계 구성 (총 4단계)

1. **GitHub 계정 확인**
   - 계정이 없으면 가입 링크 제공
   - 외부 링크: https://github.com/signup

2. **Quartz 템플릿 Fork**
   - Fork 버튼 위치 안내 (스크린샷)
   - 리포지토리 이름 설정 팁
   - 외부 링크: https://github.com/jackyzha0/quartz/fork

3. **Personal Access Token 생성**
   - 토큰 생성 페이지 링크
   - 필요 권한 (repo) 체크박스 안내 (스크린샷)
   - 토큰 복사 및 저장 주의사항
   - 외부 링크: https://github.com/settings/tokens/new

4. **플러그인 설정 연결**
   - 리포지토리 URL 입력
   - 토큰 입력
   - 연결 테스트 버튼

## 문제 해결 항목

### 일반적인 오류 목록

1. **401 Unauthorized**
   - 원인: 토큰이 잘못되었거나 만료됨
   - 해결: 새 토큰 생성

2. **404 Not Found**
   - 원인: 리포지토리 URL이 잘못됨 또는 비공개 저장소
   - 해결: URL 확인, 토큰 권한 확인

3. **403 Forbidden**
   - 원인: 토큰에 repo 권한 없음
   - 해결: 토큰 권한 수정 또는 재생성

4. **Network Error**
   - 원인: 인터넷 연결 문제
   - 해결: 네트워크 확인 후 재시도

## 결론

모든 기술적 결정이 완료되었으며, NEEDS CLARIFICATION 항목 없음.
Phase 1 진행 준비 완료.
