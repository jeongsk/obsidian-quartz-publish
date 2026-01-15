/**
 * Quartz Config Service
 *
 * quartz.config.ts 파일을 파싱하고 수정하는 서비스
 */

import type { GitHubService } from './github';
import type { QuartzConfigFile } from '../types';

/**
 * 파싱된 Quartz 설정
 */
export interface ParsedQuartzConfig {
	/** ExplicitPublish 필터 활성화 여부 */
	explicitPublish: boolean;
	/** 제외 패턴 목록 */
	ignorePatterns: string[];
	/** URL 생성 전략 */
	urlStrategy: 'shortest' | 'absolute';
	/** 원본 파일 내용 */
	rawContent: string;
}

/**
 * 설정 변경 결과
 */
export interface ConfigChangeResult {
	success: boolean;
	newContent?: string;
	error?: string;
}

/**
 * Quartz 설정 서비스 클래스
 */
export class QuartzConfigService {
	private github: GitHubService;
	private cachedConfig: QuartzConfigFile | null = null;

	constructor(github: GitHubService) {
		this.github = github;
	}

	/**
	 * quartz.config.ts 파일 내용을 파싱
	 *
	 * @param content 파일 내용
	 * @returns 파싱된 설정 또는 null (파싱 실패 시)
	 */
	parseConfig(content: string): ParsedQuartzConfig | null {
		try {
			// ExplicitPublish 확인 (filters 배열 내 Plugin.ExplicitPublish() 존재 여부)
			const hasExplicitPublish = /Plugin\.ExplicitPublish\(\)/.test(content);

			// ignorePatterns 추출
			const ignorePatterns = this.parseIgnorePatterns(content);

			// urlStrategy 추출 (기본값: shortest)
			const urlStrategy = this.parseUrlStrategy(content);

			return {
				explicitPublish: hasExplicitPublish,
				ignorePatterns,
				urlStrategy,
				rawContent: content,
			};
		} catch {
			return null;
		}
	}

	/**
	 * ignorePatterns 배열 추출
	 */
	private parseIgnorePatterns(content: string): string[] {
		// ignorePatterns: ["pattern1", "pattern2"] 형식 매칭
		const match = content.match(/ignorePatterns\s*[:=]\s*\[([^\]]*)\]/);
		if (!match) {
			return [];
		}
		return this.parseStringArray(match[1]);
	}

	/**
	 * urlStrategy 값 추출
	 */
	private parseUrlStrategy(content: string): 'shortest' | 'absolute' {
		// urlStrategy: "absolute" 또는 urlStrategy: "shortest" 형식 매칭
		const match = content.match(/urlStrategy\s*:\s*["'](\w+)["']/);
		if (match?.[1] === 'absolute') {
			return 'absolute';
		}
		return 'shortest';
	}

	/**
	 * 문자열 배열 파싱 헬퍼
	 * 예: '"pattern1", "pattern2"' -> ['pattern1', 'pattern2']
	 */
	parseStringArray(arrayContent: string): string[] {
		const patterns: string[] = [];

		// 문자열 리터럴 매칭 (쌍따옴표 또는 홑따옴표)
		const stringPattern = /["']([^"']+)["']/g;
		let match;
		while ((match = stringPattern.exec(arrayContent)) !== null) {
			patterns.push(match[1]);
		}

		return patterns;
	}

	/**
	 * ExplicitPublish 설정 변경
	 *
	 * @param content 현재 파일 내용
	 * @param enabled 활성화 여부
	 * @returns 변경 결과
	 */
	setExplicitPublish(content: string, enabled: boolean): ConfigChangeResult {
		// filters 배열 찾기
		const filterPattern = /filters\s*:\s*\[([^\]]*)\]/;
		const match = content.match(filterPattern);

		if (!match) {
			return { success: false, error: 'filters 배열을 찾을 수 없습니다' };
		}

		const currentFilters = match[1];
		const newFilter = enabled ? 'Plugin.ExplicitPublish()' : 'Plugin.RemoveDrafts()';
		const oldFilter = enabled ? 'Plugin.RemoveDrafts()' : 'Plugin.ExplicitPublish()';

		let newFilters: string;

		// 기존 필터가 있으면 교체
		if (currentFilters.includes(oldFilter)) {
			newFilters = currentFilters.replace(oldFilter, newFilter);
		} else if (currentFilters.includes(newFilter)) {
			// 이미 원하는 필터가 있으면 변경 없음
			return { success: true, newContent: content };
		} else {
			// 둘 다 없으면 필터 추가
			const trimmed = currentFilters.trim();
			newFilters = trimmed ? `${trimmed}, ${newFilter}` : newFilter;
		}

		const newContent = content.replace(filterPattern, `filters: [${newFilters}]`);

		return { success: true, newContent };
	}

	/**
	 * ignorePatterns 설정 변경
	 *
	 * @param content 현재 파일 내용
	 * @param patterns 새 패턴 배열
	 * @returns 변경 결과
	 */
	setIgnorePatterns(content: string, patterns: string[]): ConfigChangeResult {
		// 패턴 배열을 문자열로 변환
		const patternsStr = patterns.map((p) => `"${p}"`).join(', ');
		const newIgnorePatterns = `ignorePatterns: [${patternsStr}]`;

		// 기존 ignorePatterns 찾기
		const ignorePattern = /ignorePatterns\s*[:=]\s*\[[^\]]*\]/;
		const match = content.match(ignorePattern);

		if (match) {
			// 기존 패턴 교체
			const newContent = content.replace(ignorePattern, newIgnorePatterns);
			return { success: true, newContent };
		}

		// ignorePatterns가 없는 경우 - configuration 블록에 추가
		// configuration: { ... } 블록 찾기
		const configBlockPattern = /(configuration\s*:\s*\{)([^}]*?)(\})/;
		const configMatch = content.match(configBlockPattern);

		if (configMatch) {
			const existingContent = configMatch[2].trim();
			const newConfigContent = existingContent
				? `${existingContent},\n    ${newIgnorePatterns}`
				: `\n    ${newIgnorePatterns}\n  `;
			const newContent = content.replace(
				configBlockPattern,
				`$1${newConfigContent}$3`
			);
			return { success: true, newContent };
		}

		return { success: false, error: 'configuration 블록을 찾을 수 없습니다' };
	}

	/**
	 * URL 전략 설정 변경
	 *
	 * @param content 현재 파일 내용
	 * @param strategy URL 전략
	 * @returns 변경 결과
	 */
	setUrlStrategy(
		content: string,
		strategy: 'shortest' | 'absolute'
	): ConfigChangeResult {
		const newUrlStrategy = `urlStrategy: "${strategy}"`;

		// 기존 urlStrategy 찾기
		const urlStrategyPattern = /urlStrategy\s*:\s*["']\w+["']/;
		const match = content.match(urlStrategyPattern);

		if (match) {
			// 기존 설정 교체
			const newContent = content.replace(urlStrategyPattern, newUrlStrategy);
			return { success: true, newContent };
		}

		// urlStrategy가 없는 경우 - configuration 블록에 추가
		const configBlockPattern = /(configuration\s*:\s*\{)([^}]*?)(\})/;
		const configMatch = content.match(configBlockPattern);

		if (configMatch) {
			const existingContent = configMatch[2].trim();
			const newConfigContent = existingContent
				? `${existingContent},\n    ${newUrlStrategy}`
				: `\n    ${newUrlStrategy}\n  `;
			const newContent = content.replace(
				configBlockPattern,
				`$1${newConfigContent}$3`
			);
			return { success: true, newContent };
		}

		return { success: false, error: 'configuration 블록을 찾을 수 없습니다' };
	}

	/**
	 * GitHub에서 quartz.config.ts 파일 조회
	 *
	 * @param forceRefresh 캐시 무시 여부
	 * @returns 설정 파일 정보 또는 null
	 */
	async fetchQuartzConfig(forceRefresh = false): Promise<QuartzConfigFile | null> {
		// 캐시가 있고 강제 새로고침이 아니면 캐시 반환
		if (this.cachedConfig && !forceRefresh) {
			return this.cachedConfig;
		}

		const file = await this.github.getFile('quartz.config.ts');
		if (!file) {
			return null;
		}

		this.cachedConfig = {
			path: 'quartz.config.ts',
			sha: file.sha,
			content: file.content,
			lastFetched: Date.now(),
		};

		return this.cachedConfig;
	}

	/**
	 * 설정 변경 사항을 GitHub에 커밋
	 *
	 * @param newContent 새 파일 내용
	 * @param message 커밋 메시지
	 * @returns 커밋 결과
	 */
	async commitConfigChange(
		newContent: string,
		message: string
	): Promise<{ success: boolean; error?: string }> {
		// 현재 파일의 SHA 필요
		const config = await this.fetchQuartzConfig(true);
		if (!config) {
			return { success: false, error: 'quartz.config.ts 파일을 찾을 수 없습니다' };
		}

		const result = await this.github.createOrUpdateFile(
			'quartz.config.ts',
			newContent,
			message,
			config.sha
		);

		if (result.success) {
			// 캐시 업데이트
			this.cachedConfig = {
				path: 'quartz.config.ts',
				sha: result.sha!,
				content: newContent,
				lastFetched: Date.now(),
			};
		}

		return result;
	}

	/**
	 * 캐시 무효화
	 */
	invalidateCache(): void {
		this.cachedConfig = null;
	}
}
