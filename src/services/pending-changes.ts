/**
 * Pending Changes Manager
 *
 * 설정 변경사항을 추적하고 관리하는 서비스
 */

import type { QuartzSiteConfig } from '../types';

/**
 * 변경사항 관리자 클래스 (T021)
 */
export class PendingChangesManager {
	/** 원본 설정 (로드 시점 스냅샷) */
	private original: QuartzSiteConfig | null = null;

	/** 현재 설정 (사용자 편집 반영) */
	private current: QuartzSiteConfig | null = null;

	/** 변경된 필드 키 집합 */
	private changedFields: Set<keyof QuartzSiteConfig> = new Set();

	/** 원본 파일 SHA (충돌 감지용) */
	private originalSha: string = '';

	/**
	 * 원본 설정으로 초기화 (T022)
	 */
	initialize(config: QuartzSiteConfig, sha: string): void {
		// 깊은 복사로 원본 저장
		this.original = this.deepClone(config);
		this.current = this.deepClone(config);
		this.changedFields = new Set();
		this.originalSha = sha;
	}

	/**
	 * 특정 필드 값 업데이트 (T023)
	 */
	updateField<K extends keyof QuartzSiteConfig>(
		field: K,
		value: QuartzSiteConfig[K]
	): void {
		if (!this.current || !this.original) {
			throw new Error('PendingChangesManager가 초기화되지 않았습니다');
		}

		// 현재 값 업데이트
		this.current[field] = value;

		// 변경사항 추적
		if (this.isFieldChanged(field)) {
			this.changedFields.add(field);
		} else {
			this.changedFields.delete(field);
		}
	}

	/**
	 * 필드가 원본과 다른지 확인
	 */
	private isFieldChanged<K extends keyof QuartzSiteConfig>(field: K): boolean {
		if (!this.current || !this.original) return false;

		const currentValue = this.current[field];
		const originalValue = this.original[field];

		// 객체 비교 (analytics 등)
		if (typeof currentValue === 'object' && typeof originalValue === 'object') {
			return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
		}

		// 배열 비교 (ignorePatterns)
		if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
			return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
		}

		return currentValue !== originalValue;
	}

	/**
	 * 현재 설정 반환
	 */
	getCurrentConfig(): QuartzSiteConfig {
		if (!this.current) {
			throw new Error('PendingChangesManager가 초기화되지 않았습니다');
		}
		return this.deepClone(this.current);
	}

	/**
	 * 원본 설정 반환
	 */
	getOriginalConfig(): QuartzSiteConfig {
		if (!this.original) {
			throw new Error('PendingChangesManager가 초기화되지 않았습니다');
		}
		return this.deepClone(this.original);
	}

	/**
	 * 원본 SHA 반환
	 */
	getOriginalSha(): string {
		return this.originalSha;
	}

	/**
	 * 변경사항 존재 여부 (T024)
	 */
	isDirty(): boolean {
		return this.changedFields.size > 0;
	}

	/**
	 * 변경된 필드 목록 반환 (T024)
	 */
	getChangedFields(): Set<keyof QuartzSiteConfig> {
		return new Set(this.changedFields);
	}

	/**
	 * 변경사항 요약 문자열 생성
	 */
	getChangeSummary(): string {
		return Array.from(this.changedFields).join(', ');
	}

	/**
	 * 커밋 메시지 생성 (T025)
	 */
	generateCommitMessage(): string {
		if (!this.isDirty() || !this.original || !this.current) {
			return '';
		}

		const changedFieldsList = Array.from(this.changedFields);

		// 제목 생성
		const title = `Update Quartz config: ${changedFieldsList.join(', ')}`;

		// 상세 변경 내용 생성
		const changes: string[] = [];
		for (const field of changedFieldsList) {
			const oldValue = this.formatValue(this.original[field]);
			const newValue = this.formatValue(this.current[field]);
			changes.push(`- ${field}: ${oldValue} → ${newValue}`);
		}

		// 전체 메시지 조합
		return `${title}\n\nChanged:\n${changes.join('\n')}`;
	}

	/**
	 * 값을 표시용 문자열로 변환
	 */
	private formatValue(value: unknown): string {
		if (value === null || value === undefined) {
			return 'null';
		}

		if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		}

		if (typeof value === 'string') {
			// 긴 문자열 줄임
			if (value.length > 30) {
				return `"${value.substring(0, 27)}..."`;
			}
			return `"${value}"`;
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return '[]';
			}
			if (value.length <= 3) {
				return `[${value.map((v) => `"${v}"`).join(', ')}]`;
			}
			return `[${value.length} items]`;
		}

		if (typeof value === 'object') {
			// analytics 객체 처리
			const obj = value as Record<string, unknown>;
			if ('provider' in obj) {
				return `{provider: "${obj.provider}"}`;
			}
			return JSON.stringify(value);
		}

		return String(value);
	}

	/**
	 * 변경사항 취소 (원본으로 리셋) (T026)
	 */
	reset(): void {
		if (this.original) {
			this.current = this.deepClone(this.original);
			this.changedFields.clear();
		}
	}

	/**
	 * 새 원본으로 업데이트 (저장 성공 후) (T026)
	 */
	markAsSaved(config: QuartzSiteConfig, sha: string): void {
		this.original = this.deepClone(config);
		this.current = this.deepClone(config);
		this.changedFields.clear();
		this.originalSha = sha;
	}

	/**
	 * 초기화 여부 확인
	 */
	isInitialized(): boolean {
		return this.original !== null && this.current !== null;
	}

	/**
	 * 깊은 복사 헬퍼
	 */
	private deepClone<T>(obj: T): T {
		return JSON.parse(JSON.stringify(obj));
	}
}
