/**
 * GoogleFontsService Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GoogleFontsService } from "../../../src/shared/lib/google-fonts";

describe("GoogleFontsService", () => {
  let service: GoogleFontsService;

  beforeEach(() => {
    service = new GoogleFontsService();
  });

  // ============================================================================
  // getFonts
  // ============================================================================

  describe("getFonts", () => {
    it("폰트 목록을 반환한다", () => {
      const fonts = service.getFonts();
      expect(fonts.length).toBeGreaterThan(0);
    });

    it("폰트 목록이 알파벳순으로 정렬된다", () => {
      const fonts = service.getFonts();
      for (let i = 0; i < fonts.length - 1; i++) {
        expect(fonts[i].family.localeCompare(fonts[i + 1].family)).toBeLessThanOrEqual(0);
      }
    });

    it("각 폰트에 family와 category 필드가 있다", () => {
      const fonts = service.getFonts();
      for (const font of fonts) {
        expect(typeof font.family).toBe("string");
        expect(typeof font.category).toBe("string");
        expect(font.family.length).toBeGreaterThan(0);
      }
    });

    it("Roboto 폰트가 포함된다", () => {
      const fonts = service.getFonts();
      const roboto = fonts.find((f) => f.family === "Roboto");
      expect(roboto).toBeDefined();
      expect(roboto?.category).toBe("sans-serif");
    });

    it("한국어 폰트가 포함된다", () => {
      const fonts = service.getFonts();
      const hasKorean = fonts.some((f) =>
        ["Noto Sans KR", "Nanum Gothic", "Gowun Dodum"].includes(f.family)
      );
      expect(hasKorean).toBe(true);
    });
  });

  // ============================================================================
  // getCssUrl
  // ============================================================================

  describe("getCssUrl", () => {
    it("폰트 이름으로 CSS URL을 생성한다", () => {
      const url = service.getCssUrl("Roboto");
      expect(url).toContain("fonts.googleapis.com");
      expect(url).toContain("Roboto");
    });

    it("공백이 포함된 폰트 이름은 +로 변환된다", () => {
      const url = service.getCssUrl("Open Sans");
      expect(url).toContain("Open+Sans");
      expect(url).not.toContain(" ");
    });

    it("여러 공백이 포함된 폰트 이름도 처리한다", () => {
      const url = service.getCssUrl("Noto Sans KR");
      expect(url).toContain("Noto+Sans+KR");
    });

    it("weight 파라미터가 포함된다", () => {
      const url = service.getCssUrl("Roboto");
      expect(url).toContain("wght@400;700");
    });

    it("display=swap 파라미터가 포함된다", () => {
      const url = service.getCssUrl("Roboto");
      expect(url).toContain("display=swap");
    });
  });

  // ============================================================================
  // loadFont
  // ============================================================================

  describe("loadFont", () => {
    it("폰트를 로드한다 (link 엘리먼트 추가)", () => {
      service.loadFont("Roboto");
      const link = document.getElementById("google-font-roboto");
      expect(link).not.toBeNull();
    });

    it("같은 폰트를 두 번 로드해도 link가 하나만 생성된다", () => {
      service.loadFont("Open Sans");
      service.loadFont("Open Sans");
      const links = document.querySelectorAll("[id='google-font-open-sans']");
      expect(links.length).toBe(1);
    });

    it("다른 폰트는 별도의 link로 로드된다", () => {
      service.loadFont("Lato");
      service.loadFont("Merriweather");
      expect(document.getElementById("google-font-lato")).not.toBeNull();
      expect(document.getElementById("google-font-merriweather")).not.toBeNull();
    });
  });
});
