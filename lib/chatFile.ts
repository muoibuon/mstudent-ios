import type { ChatFile } from './types';

export const MAX_CHAT_FILE_BYTES = 5 * 1024 * 1024;
const SUPPORTED = /\.(pdf|docx|xlsx|csv|txt)$/i;

export function validateChatFile(file: Pick<ChatFile, 'name' | 'size'>): string | null {
  if (!SUPPORTED.test(file.name)) return 'Chỉ nhận PDF, DOCX, XLSX, CSV hoặc TXT.';
  if (file.size !== undefined && file.size > MAX_CHAT_FILE_BYTES) return 'Tệp quá lớn (tối đa 5 MB).';
  return null;
}
