/**
 * 共用格式化工具
 */

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * 將位元組數格式化為人類可讀的檔案大小
 *
 * @example formatFileSize(1536) // '1.5 KB'
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const k = 1024;
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    FILE_SIZE_UNITS.length - 1
  );

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(1))} ${FILE_SIZE_UNITS[index]}`;
};
