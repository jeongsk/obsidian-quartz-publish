import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/main.ts",
        "src/app/main.ts",
        "src/i18n/**",
        // UI 레이어: Obsidian Modal/DOM 의존으로 단위 테스트 불가
        "src/features/**/ui/**",
        "src/widgets/**/ui/**",
        "src/shared/ui/**",
        // 상수/데이터 파일: 로직 없음
        "src/shared/config/constants/**",
        "src/shared/config/constants/*.ts",
        // i18n 로케일 파일 (런타임 데이터)
        "src/shared/lib/i18n/locales/en.ts",
        "src/shared/lib/i18n/locales/ko.ts",
      ],
    },
  },
  resolve: {
    alias: {
      obsidian: resolve(__dirname, "tests/mocks/obsidian.ts"),
    },
  },
});
