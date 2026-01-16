# Research: 발행 대시보드 새로고침 버튼 개선

**Feature**: 001-refresh-button
**Date**: 2026-01-16

## 1. Obsidian 아이콘 버튼 패턴

### Decision
Obsidian `setIcon()` API와 `clickable-icon` 클래스를 사용하여 아이콘 버튼을 구현합니다.

### Rationale
- Obsidian 플러그인에서 표준화된 방식
- 테마 호환성 자동 보장
- 접근성(a11y) 표준 준수

### Alternatives Considered
- **SVG 직접 삽입**: 테마 호환성 문제, 관리 복잡성 증가
- **이미지 사용**: 해상도 문제, 다크 모드 대응 어려움

### Implementation Reference

```typescript
import { setIcon, setTooltip } from 'obsidian';

const refreshBtn = container.createDiv({
    cls: 'clickable-icon',
    attr: { 'aria-label': '새로고침' }
});
setIcon(refreshBtn, 'refresh-cw');
setTooltip(refreshBtn, '발행 목록 새로고침');
```

## 2. Obsidian CSS 변수 및 아이콘 크기

### Decision
`clickable-icon` 클래스를 사용하여 Obsidian 표준 아이콘 크기(18px)를 자동 적용합니다.

### Rationale
- Obsidian UI 일관성 유지
- 테마별 크기 조정 자동 대응
- 별도 크기 지정 불필요

### CSS Reference

```css
/* Obsidian 기본 스타일 */
.clickable-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: var(--clickable-icon-radius);
    padding: var(--size-2-2);
}

.clickable-icon svg {
    width: var(--icon-size);  /* 기본 18px */
    height: var(--icon-size);
}
```

## 3. 로딩 상태 애니메이션

### Decision
TailwindCSS `animate-spin` 클래스를 사용하여 로딩 중 아이콘 회전 효과를 적용합니다.

### Rationale
- 프로젝트에서 이미 TailwindCSS v4 사용 중
- 추가 CSS 작성 불필요
- 부드러운 애니메이션 제공

### Implementation Reference

```typescript
// 로딩 시작
refreshBtn.addClass('animate-spin');
refreshBtn.setAttribute('disabled', 'true');

// 로딩 완료
refreshBtn.removeClass('animate-spin');
refreshBtn.removeAttribute('disabled');
```

## 4. 버튼 위치 결정

### Decision
새로고침 버튼을 제목 텍스트 바로 오른쪽에 배치하고, 오프라인 표시기 앞에 위치시킵니다.

### Rationale
- 닫기(x) 버튼과 최대 거리 확보 (Modal 우상단에 위치)
- 제목과 함께 논리적 그룹 형성
- 사용자가 새로고침 버튼을 쉽게 찾을 수 있음

### Layout

```
[제목] [새로고침 아이콘] [오프라인 표시기]        [x 닫기]
```

## 5. Lucide 아이콘 이름

### Decision
`refresh-cw` 아이콘을 사용합니다.

### Rationale
- Obsidian에서 사용하는 Lucide 아이콘 세트에 포함
- 회전 화살표 형태로 새로고침 의미 직관적
- 다른 플러그인에서 일반적으로 사용하는 패턴

### Available Alternatives
- `rotate-cw`: 시계 방향 회전 (덜 직관적)
- `refresh-ccw`: 반시계 방향 (혼란 가능)

## Summary

| 항목 | 결정 |
|------|------|
| 아이콘 API | `setIcon()` |
| 아이콘 이름 | `refresh-cw` |
| 버튼 클래스 | `clickable-icon` |
| 툴팁 API | `setTooltip()` |
| 로딩 애니메이션 | `animate-spin` (TailwindCSS) |
| 버튼 위치 | 제목 오른쪽 |
