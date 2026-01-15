/**
 * Vitest Setup
 *
 * 테스트 환경 설정 파일입니다.
 */

import { vi } from 'vitest';

// DOM 환경 초기화
beforeEach(() => {
	// DOM 정리
	document.body.innerHTML = '';
});

// 모든 테스트 후 정리
afterEach(() => {
	vi.clearAllMocks();
});

// 전역 모의 설정
vi.stubGlobal('crypto', {
	subtle: {
		digest: vi.fn().mockImplementation(async (algorithm: string, data: ArrayBuffer) => {
			// 간단한 해시 모의 구현
			const view = new Uint8Array(data);
			let hash = 0;
			for (let i = 0; i < view.length; i++) {
				hash = ((hash << 5) - hash + view[i]) | 0;
			}
			const buffer = new ArrayBuffer(32);
			const hashView = new Uint32Array(buffer);
			hashView[0] = hash;
			return buffer;
		}),
	},
	getRandomValues: vi.fn().mockImplementation((buffer: Uint8Array) => {
		for (let i = 0; i < buffer.length; i++) {
			buffer[i] = Math.floor(Math.random() * 256);
		}
		return buffer;
	}),
});
