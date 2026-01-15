# Quartz Publish - 제품 요구사항 정의서

Obsidian 노트를 Quartz 정적 사이트로 발행하는 플러그인입니다.

## 대상 사용자

- Obsidian을 사용하여 노트를 작성하는 사용자
- GitHub/터미널 작업 없이 블로그를 운영하고 싶은 사용자
- Quartz로 디지털 가든을 구축하려는 사용자

---

## 기능 요구사항

### Phase 1: MVP (핵심 기능)

#### 1.1 GitHub 연동
- GitHub Personal Access Token 입력
  - 토큰 발급 방법 안내 링크 제공
  - 토큰 유효성 검증
- Repository 설정
  - 기존 Quartz 리포지토리 URL 입력
  - Quartz 배포 가능 여부 검증 (quartz.config.ts 존재 확인)

#### 1.2 단일 노트 발행
- 발행 방식: 커맨드 팔레트 + 파일 컨텍스트 메뉴
- 프론트매터 속성:
  - `publish: true` - 발행 대상 표시
  - `draft: true` - 초안 상태 (Quartz RemoveDrafts 플러그인 활용)
- 발행 시 처리:
  - 내부 링크 → Quartz 호환 형식으로 변환
  - 이미지/첨부파일 → 함께 업로드
- 발행 결과 알림 (성공/실패 Notice)

---

### Phase 2: 노트 관리

#### 2.1 발행 상태 대시보드 (모달 UI)
- 발행이 필요한 노트 (신규)
- 업데이트가 필요한 노트 (로컬 수정됨)
- 삭제가 필요한 노트 (로컬에서 삭제됨)
- 최신 상태인 노트

#### 2.2 일괄 동기화
- 선택한 노트들 일괄 발행
- 전체 동기화 (발행/업데이트/삭제 한 번에 처리)

---

### Phase 3: Quartz 설정 관리

#### 3.1 플러그인 설정에서 Quartz 옵션 변경
변경 시 quartz.config.ts 파일을 자동으로 수정하여 GitHub에 커밋

| 설정 | 설명 | Quartz 설정 위치 |
|------|------|------------------|
| 일부만 공개 | ExplicitPublish() 플러그인 활성화/비활성화 | plugins.filters |
| 제외 패턴 | 특정 폴더/파일 제외 | ignorePatterns |
| URL 규칙 | shortestPaths / absolutePaths | urlStrategy |

#### 3.2 Quartz 업그레이드
- 설정 화면 진입 시 최신 버전 자동 체크
- 업그레이드 버튼으로 원클릭 업데이트
- 사용자 설정 보존

---

### Phase 4: 초보자 지원 (선택)

#### 4.1 자동 리포지토리 생성
- Quartz 리포지토리가 없는 사용자를 위해
- jackyzha0/quartz 템플릿으로 자동 생성
- GitHub Pages 또는 Vercel 배포 가이드 제공

---

## 기술 요구사항

### 프론트매터 스펙
```yaml
---
publish: true        # 발행 대상 여부 (필수)
draft: false         # 초안 여부 (선택, 기본값: false)
---
```

### 동기화 규칙
- 충돌 발생 시: 로컬 우선 (사용자에게 확인 후 덮어쓰기)
- 삭제 시: 확인 모달 표시 후 진행

---

## 비기능 요구사항

- 오프라인 시 발행 불가 안내
- 대용량 파일(10MB 초과) 업로드 제한 경고
- 발행 진행 상황 프로그레스 표시

---

## 구현 현황

> 마지막 업데이트: 2026-01-14

### 전체 진행률

| Phase | 설명 | 진행률 | 상태 |
|-------|------|--------|------|
| Phase 1 | MVP (핵심 기능) | 100% | ✅ 완료 |
| Phase 2 | 노트 관리 | 100% | ✅ 완료 |
| Phase 3 | Quartz 설정 관리 | 100% | ✅ 완료 |
| Phase 4 | 초보자 지원 | 0% | ❌ 미착수 |
| 비기능 | 비기능 요구사항 | 100% | ✅ 완료 |

### Phase 1: MVP 상세 현황 ✅

#### 1.1 GitHub 연동
- [x] GitHub PAT 입력 (`src/ui/settings-tab.ts`)
- [x] 토큰 발급 안내 링크 제공
- [x] 토큰 유효성 검증 (`src/services/github.ts:validateToken()`)
- [x] Repository URL 입력
- [x] Quartz 배포 검증 (`src/services/github.ts:verifyQuartzRepository()`)

#### 1.2 단일 노트 발행
- [x] 커맨드 팔레트 발행 (`src/main.ts`)
- [x] 파일 컨텍스트 메뉴 발행 (`src/main.ts`)
- [x] `publish: true` 자동 추가 (`src/services/transformer.ts`)
- [x] `draft: true` 보존
- [x] 내부 링크 변환 (`src/services/transformer.ts:transformWikiLinks()`)
- [x] 이미지/첨부파일 업로드 (`src/services/publish.ts`)
- [x] 성공/실패 Notice 표시

### Phase 2: 노트 관리 상세 현황 ✅

#### 2.1 발행 상태 대시보드
- [x] 신규 노트 목록 (`src/services/status.ts`)
- [x] 수정된 노트 목록 (`src/services/status.ts`)
- [x] 삭제 필요 노트 목록 (`src/services/status.ts`)
- [x] 최신 상태 노트 목록 (`src/services/status.ts`)
- [x] 대시보드 모달 UI (`src/ui/dashboard-modal.ts`)

#### 2.2 일괄 동기화
- [x] `publishNotes()` 메서드
- [x] 선택 노트 일괄 발행 UI
- [x] 선택 노트 일괄 삭제 UI
- [x] 전체 동기화 기능

### Phase 3: Quartz 설정 관리 상세 현황 ✅

- [x] ExplicitPublish 토글 (`src/ui/settings-tab.ts`)
- [x] 제외 패턴 설정 (`src/services/quartz-config.ts`)
- [x] URL 전략 변경 (`src/services/quartz-config.ts`)
- [x] Quartz 업그레이드 기능 (`src/services/quartz-upgrade.ts`)
- [x] 브랜치 자동 감지 (Test Connection 시)
- [x] 상세 에러 메시지 표시

### Phase 4: 초보자 지원 상세 현황 ❌

- [ ] 자동 리포지토리 생성
- [ ] 배포 가이드 제공

### 비기능 요구사항 상세 현황 ✅

- [x] 오프라인 시 발행 불가 안내 (`src/services/network.ts`, `src/ui/dashboard-modal.ts`)
- [x] 대용량 파일 제한 상수 정의 (`MAX_FILE_SIZE`)
- [x] 대용량 파일 경고 UI (`src/ui/large-file-warning-modal.ts`)
- [x] 발행 진행 프로그레스 표시 (`src/ui/dashboard-modal.ts`)
- [x] 에러 처리 개선 (네트워크 오류, Rate Limit 안내)
- [x] 접근성 개선 (키보드 네비게이션, ARIA 레이블)

### 구현된 파일 목록

```
src/
├── main.ts                    # 플러그인 메인 클래스
├── types.ts                   # 타입 정의
├── services/
│   ├── github.ts              # GitHub API 서비스
│   ├── transformer.ts         # 콘텐츠 변환 서비스
│   ├── publish.ts             # 발행 서비스
│   ├── status.ts              # 발행 상태 계산 서비스
│   ├── quartz-config.ts       # Quartz 설정 파싱/수정 서비스
│   ├── quartz-upgrade.ts      # Quartz 업그레이드 서비스
│   ├── network.ts             # 네트워크 상태 감지 서비스
│   └── file-validator.ts      # 파일 크기 검증 서비스
├── utils/
│   └── glob-validator.ts      # glob 패턴 유효성 검사
├── ui/
│   ├── settings-tab.ts        # 설정 탭 UI
│   ├── dashboard-modal.ts     # 발행 대시보드 모달
│   └── large-file-warning-modal.ts  # 대용량 파일 경고 모달
└── styles/
    └── main.css               # TailwindCSS 스타일

tests/
├── mocks/
│   └── obsidian.ts            # Obsidian API 모킹
├── setup.ts                   # 테스트 설정
└── unit/
    ├── services/
    │   ├── status.test.ts           # StatusService 테스트
    │   ├── quartz-config.test.ts    # QuartzConfigService 테스트
    │   └── quartz-upgrade.test.ts   # QuartzUpgradeService 테스트
    ├── utils/
    │   └── glob-validator.test.ts   # glob-validator 테스트
    └── ui/
        └── dashboard-modal.test.ts  # DashboardModal 테스트
```
