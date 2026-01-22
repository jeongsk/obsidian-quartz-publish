/**
 * Network Service
 *
 * 네트워크 연결 상태를 감지하고 상태 변경 이벤트를 제공합니다.
 */

import type { NetworkStatus, NetworkStatusCallback } from "../types";

/**
 * 네트워크 서비스 클래스
 */
export class NetworkService {
  private callbacks: Set<NetworkStatusCallback> = new Set();
  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    this.onlineHandler = () => this.notifyCallbacks("online");
    this.offlineHandler = () => this.notifyCallbacks("offline");

    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);
  }

  /**
   * 현재 네트워크 연결 상태 확인
   * @returns true if online, false if offline
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * 현재 네트워크 상태 반환
   * @returns 'online' | 'offline' | 'unknown'
   */
  getStatus(): NetworkStatus {
    if (typeof navigator === "undefined" || typeof navigator.onLine === "undefined") {
      return "unknown";
    }
    return navigator.onLine ? "online" : "offline";
  }

  /**
   * 네트워크 상태 변경 리스너 등록
   * @param callback 상태 변경 시 호출될 콜백
   * @returns 리스너 해제 함수
   */
  onStatusChange(callback: NetworkStatusCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 모든 이벤트 리스너 정리
   */
  destroy(): void {
    window.removeEventListener("online", this.onlineHandler);
    window.removeEventListener("offline", this.offlineHandler);
    this.callbacks.clear();
  }

  /**
   * 등록된 모든 콜백에 상태 변경 알림
   */
  private notifyCallbacks(status: NetworkStatus): void {
    for (const callback of this.callbacks) {
      try {
        callback(status);
      } catch (error) {
        console.error("[QuartzPublish] Network status callback error:", error);
      }
    }
  }
}
