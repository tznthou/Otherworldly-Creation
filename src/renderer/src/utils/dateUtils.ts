/**
 * 日期格式化工具函數
 */

/**
 * 安全地解析日期字串
 * @param dateInput - 日期輸入，可能是字串、Date 物件或時間戳
 * @returns 有效的 Date 物件，如果解析失敗則返回當前日期
 */
export function safeParseDate(dateInput: string | Date | number | undefined | null): Date {
  if (!dateInput) {
    return new Date();
  }

  // 如果已經是 Date 物件
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  }

  // 如果是數字（時間戳）
  if (typeof dateInput === 'number') {
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // 如果是字串
  if (typeof dateInput === 'string') {
    // 處理 ISO 8601 格式（Rust/Tauri 常用格式）
    // 例如: "2024-01-15T10:30:00.000Z" 或 "2024-01-15T10:30:00"
    let date = new Date(dateInput);
    
    // 如果直接解析失敗，嘗試其他格式
    if (isNaN(date.getTime())) {
      // 嘗試替換 T 為空格（某些資料庫格式）
      const normalizedDate = dateInput.replace('T', ' ').replace(/\.\d{3}Z?$/, '');
      date = new Date(normalizedDate);
    }

    // 如果還是失敗，返回當前日期
    return isNaN(date.getTime()) ? new Date() : date;
  }

  return new Date();
}

/**
 * 格式化日期為本地化字串
 * @param dateInput - 日期輸入
 * @param options - Intl.DateTimeFormatOptions 選項
 * @returns 格式化的日期字串
 */
export function formatDate(
  dateInput: string | Date | number | undefined | null,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = safeParseDate(dateInput);
  
  try {
    return date.toLocaleDateString('zh-TW', options);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '無效日期';
  }
}

/**
 * 格式化日期時間為本地化字串
 * @param dateInput - 日期輸入
 * @param options - Intl.DateTimeFormatOptions 選項
 * @returns 格式化的日期時間字串
 */
export function formatDateTime(
  dateInput: string | Date | number | undefined | null,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = safeParseDate(dateInput);
  
  try {
    return date.toLocaleString('zh-TW', options);
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return '無效日期時間';
  }
}

/**
 * 計算相對時間（例如：3天前）
 * @param dateInput - 日期輸入
 * @returns 相對時間字串
 */
export function getRelativeTime(dateInput: string | Date | number | undefined | null): string {
  const date = safeParseDate(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes === 0) {
        return '剛剛';
      }
      return `${diffMinutes}分鐘前`;
    }
    return `${diffHours}小時前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}週前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}個月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
}

/**
 * 檢查日期是否最近（預設3天內）
 * @param dateInput - 日期輸入
 * @param days - 天數閾值
 * @returns 是否為最近的日期
 */
export function isRecentDate(
  dateInput: string | Date | number | undefined | null,
  days: number = 3
): boolean {
  const date = safeParseDate(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays < days;
}