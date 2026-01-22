/**
 * File Validator Service
 *
 * 파일 크기 검증 및 대용량 파일 감지를 담당합니다.
 */

import type { TFile } from "obsidian";
import type { LargeFileInfo, FileValidationResult } from "../types";
import { MAX_FILE_SIZE } from "../types";

/**
 * 파일 검증 서비스 클래스
 */
export class FileValidatorService {
  private maxFileSize: number;

  constructor(maxFileSize: number = MAX_FILE_SIZE) {
    this.maxFileSize = maxFileSize;
  }

  /**
   * 바이트 크기를 읽기 쉬운 형식으로 변환
   * @param bytes 바이트 크기
   * @returns 포맷된 문자열 (예: "12.5 MB")
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    if (i === 0) {
      return `${bytes} B`;
    }

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }

  /**
   * 대용량 파일 목록 찾기
   * @param files 검사할 파일 목록
   * @returns 대용량 파일 정보 배열
   */
  findLargeFiles(files: TFile[]): LargeFileInfo[] {
    const largeFiles: LargeFileInfo[] = [];

    for (const file of files) {
      if (file.stat.size > this.maxFileSize) {
        largeFiles.push({
          file,
          size: file.stat.size,
          formattedSize: FileValidatorService.formatFileSize(file.stat.size),
        });
      }
    }

    return largeFiles;
  }

  /**
   * 파일 목록 검증
   * @param files 검사할 파일 목록
   * @returns 검증 결과
   */
  validateFiles(files: TFile[]): FileValidationResult {
    const largeFiles = this.findLargeFiles(files);

    return {
      isValid: largeFiles.length === 0,
      largeFiles,
      count: largeFiles.length,
    };
  }

  /**
   * 단일 파일이 대용량인지 확인
   * @param file 검사할 파일
   * @returns true if file exceeds max size
   */
  isLargeFile(file: TFile): boolean {
    return file.stat.size > this.maxFileSize;
  }

  /**
   * 최대 파일 크기 반환
   * @returns 최대 파일 크기 (bytes)
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  /**
   * 최대 파일 크기를 읽기 쉬운 형식으로 반환
   * @returns 포맷된 최대 파일 크기
   */
  getMaxFileSizeFormatted(): string {
    return FileValidatorService.formatFileSize(this.maxFileSize);
  }
}
