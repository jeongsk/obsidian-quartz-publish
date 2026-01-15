# Quickstart: GitHub 리포지토리 설정 가이드

**Feature**: 011-github-guide
**Date**: 2026-01-15

## 개요

초보자를 위한 GitHub 리포지토리 설정 가이드를 Obsidian 플러그인 내에 구현합니다.

## 핵심 컴포넌트

### 1. GitHubGuideModal

스텝 위자드 형식의 가이드 모달.

**파일 위치**: `src/ui/github-guide-modal.ts`

**주요 기능**:
- 4단계 가이드 표시 (GitHub 계정 → Fork → PAT → 연결)
- 진행바 및 이전/다음 네비게이션
- 스크린샷 이미지 표시
- 외부 링크 버튼
- 완료 상태 자동 감지

### 2. GuideStepData

가이드 단계 데이터 상수.

**파일 위치**: `src/constants/guide-steps.ts`

**포함 내용**:
- 각 단계별 제목, 설명
- Base64 인코딩 스크린샷
- 외부 URL
- 문제 해결 팁

### 3. SetupStatusService

설정 진행 상태 관리 서비스.

**파일 위치**: `src/services/setup-status.ts`

**주요 기능**:
- 현재 설정 상태 확인
- 완료 단계 수 계산
- 자동 완료 체크

## 구현 순서

### Step 1: 타입 정의

`src/types.ts`에 `GuideStep`, `SetupStatus`, `TroubleshootingItem` 인터페이스 추가.

### Step 2: 가이드 데이터 생성

`src/constants/guide-steps.ts` 파일 생성:
- 4개 단계 정의
- 스크린샷 이미지 (별도 준비 후 Base64 변환)
- 문제 해결 항목

### Step 3: 상태 서비스 구현

`src/services/setup-status.ts` 파일 생성:
- 플러그인 설정 기반 상태 계산
- GitHub 연결 검증 호출

### Step 4: 모달 컴포넌트 구현

`src/ui/github-guide-modal.ts` 파일 생성:
- `DeployGuideModal` 패턴 참조
- 스텝 위자드 UI
- 진행 상황 표시
- 문제 해결 섹션

### Step 5: 설정 탭 통합

`src/ui/settings-tab.ts` 수정:
- "GitHub 설정 가이드" 버튼 추가
- 미설정 시 자동 모달 표시 로직

### Step 6: 스크린샷 이미지 준비

GitHub UI 스크린샷 캡처 및 최적화:
- Fork 버튼 위치
- PAT 생성 페이지
- 권한 체크박스

## 테스트 포인트

1. **가이드 버튼**: 설정 탭에서 버튼 클릭 시 모달 표시
2. **자동 표시**: 미설정 상태에서 설정 탭 진입 시 자동 표시
3. **네비게이션**: 이전/다음 버튼 동작
4. **외부 링크**: 브라우저에서 올바른 URL 열림
5. **진행 상태**: 설정 완료 시 체크 표시
6. **오프라인**: 네트워크 없이 가이드 표시

## 예상 작업 시간

| 작업 | 예상 시간 |
|------|-----------|
| 타입 정의 | 30분 |
| 가이드 데이터 | 1시간 |
| 상태 서비스 | 1시간 |
| 모달 컴포넌트 | 2시간 |
| 설정 탭 통합 | 30분 |
| 스크린샷 준비 | 1시간 |
| 테스트 | 1시간 |
| **총계** | **약 7시간** |

## 의존성

- 기존 `GitHubService` (토큰 검증)
- 기존 `PluginSettings` (설정 상태 확인)
- TailwindCSS (`qp:` prefix 사용)
