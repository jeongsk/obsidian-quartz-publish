import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
		setupFiles: ['./tests/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'src/**/*.test.ts',
				'src/main.ts',
				'src/i18n/**',
			],
		},
	},
	resolve: {
		alias: {
			obsidian: resolve(__dirname, 'tests/mocks/obsidian.ts'),
		},
	},
});
