import type Plugin from "obsidian";
import type { TokenStorageService } from "./types";

/**
 * 토큰을 저장하는 서비스
 *
 * Obsidian의 saveData/loadData를 활용하여 토큰을 저장합니다.
 * Base64 인코딩을 사용하여 토큰을 인코딩합니다 (암호화가 아님).
 * Obsidian의 플러그인 데이터는 이미 앱 보안으로 보호됩니다.
 */
export class TokenStorageServiceImpl implements TokenStorageService {
  private readonly STORAGE_KEY = "githubToken";

  constructor(private plugin: Plugin) {}

  async saveToken(token: string): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    data[this.STORAGE_KEY] = btoa(token);
    await this.plugin.saveData(data);
  }

  async getToken(): Promise<string | null> {
    const data = (await this.plugin.loadData()) || {};
    const encrypted = data[this.STORAGE_KEY];
    if (!encrypted) return null;
    try {
      return atob(encrypted);
    } catch {
      return null;
    }
  }

  async clearToken(): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    delete data[this.STORAGE_KEY];
    await this.plugin.saveData(data);
  }
}

// Factory function for dependency injection
export function createTokenStorageService(plugin: Plugin): TokenStorageService {
  return new TokenStorageServiceImpl(plugin);
}
