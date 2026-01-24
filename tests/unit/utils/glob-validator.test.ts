import { describe, it, expect } from "vitest";
import {
  validateGlobPattern,
  isValidGlobPattern,
  validateGlobPatterns,
  areAllPatternsValid,
} from "../../../src/shared/lib/glob-validator";

describe("glob-validator", () => {
  describe("validateGlobPattern", () => {
    describe("유효한 패턴", () => {
      it("단순 파일명 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("private/*");
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("재귀 와일드카드 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("**/*.md");
        expect(result.valid).toBe(true);
      });

      it("디렉토리 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("templates/");
        expect(result.valid).toBe(true);
      });

      it("물음표 와일드카드를 통과시킨다", () => {
        const result = validateGlobPattern("file?.txt");
        expect(result.valid).toBe(true);
      });

      it("문자 클래스 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("[a-z]*.md");
        expect(result.valid).toBe(true);
      });

      it("하이픈, 언더스코어를 포함한 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("my-folder_name/*.txt");
        expect(result.valid).toBe(true);
      });

      it("점으로 시작하는 패턴을 통과시킨다", () => {
        const result = validateGlobPattern(".obsidian/**");
        expect(result.valid).toBe(true);
      });
    });

    describe("유효하지 않은 패턴", () => {
      it("빈 문자열을 거부한다", () => {
        const result = validateGlobPattern("");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("패턴은 비어있을 수 없습니다");
      });

      it("공백만 있는 문자열을 거부한다", () => {
        const result = validateGlobPattern("   ");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("패턴은 비어있을 수 없습니다");
      });

      it("절대 경로를 거부한다", () => {
        const result = validateGlobPattern("/absolute/path");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("절대 경로는 허용되지 않습니다");
      });

      it("제어 문자를 거부한다", () => {
        const result = validateGlobPattern("test\x00file");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("제어 문자는 허용되지 않습니다");
      });

      it("탭 문자를 거부한다", () => {
        const result = validateGlobPattern("test\tfile");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("제어 문자는 허용되지 않습니다");
      });

      it("연속된 와일드카드(***)를 거부한다", () => {
        const result = validateGlobPattern("***/*.md");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("연속된 와일드카드(***)는 허용되지 않습니다");
      });

      it("4개 이상의 연속 와일드카드를 거부한다", () => {
        const result = validateGlobPattern("****");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("연속된 와일드카드(***)는 허용되지 않습니다");
      });

      it("256자를 초과하는 패턴을 거부한다", () => {
        const longPattern = "a".repeat(257);
        const result = validateGlobPattern(longPattern);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("패턴은 256자를 초과할 수 없습니다");
      });
    });

    describe("경계 조건", () => {
      it("정확히 256자 패턴을 통과시킨다", () => {
        const maxPattern = "a".repeat(256);
        const result = validateGlobPattern(maxPattern);
        expect(result.valid).toBe(true);
      });

      it("단일 문자 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("*");
        expect(result.valid).toBe(true);
      });

      it("** 패턴을 통과시킨다", () => {
        const result = validateGlobPattern("**");
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("isValidGlobPattern", () => {
    it("유효한 패턴에 대해 true를 반환한다", () => {
      expect(isValidGlobPattern("private/*")).toBe(true);
      expect(isValidGlobPattern("**/*.md")).toBe(true);
      expect(isValidGlobPattern("templates/**")).toBe(true);
    });

    it("유효하지 않은 패턴에 대해 false를 반환한다", () => {
      expect(isValidGlobPattern("")).toBe(false);
      expect(isValidGlobPattern("/absolute")).toBe(false);
      expect(isValidGlobPattern("***")).toBe(false);
    });
  });

  describe("validateGlobPatterns", () => {
    it("여러 패턴을 한 번에 검사한다", () => {
      const patterns = ["private/*", "/absolute", "ok/**"];
      const results = validateGlobPatterns(patterns);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });

    it("빈 배열에 대해 빈 결과를 반환한다", () => {
      const results = validateGlobPatterns([]);
      expect(results).toHaveLength(0);
    });
  });

  describe("areAllPatternsValid", () => {
    it("모든 패턴이 유효하면 true를 반환한다", () => {
      const patterns = ["private/*", "**/*.md", "templates/**"];
      expect(areAllPatternsValid(patterns)).toBe(true);
    });

    it("하나라도 유효하지 않으면 false를 반환한다", () => {
      const patterns = ["private/*", "/absolute", "ok/**"];
      expect(areAllPatternsValid(patterns)).toBe(false);
    });

    it("빈 배열에 대해 true를 반환한다", () => {
      expect(areAllPatternsValid([])).toBe(true);
    });
  });
});
