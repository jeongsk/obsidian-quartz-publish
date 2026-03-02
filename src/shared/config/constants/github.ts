/**
 * GitHub API related constants
 */

export const GITHUB_API_BASE_URL = "https://api.github.com" as const;

// Rate limiting
export const GITHUB_API_DELAY_MS = 500;
export const GITHUB_RATE_LIMIT_THRESHOLD = 10;

// File size limits (GitHub limit is 100MB, we use 50MB for safety)
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 50;
