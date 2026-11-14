import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_CHAT_FILE_BYTES, validateChatFile } from '../chatFile';

test('chỉ nhận tài liệu hỗ trợ trong giới hạn 5 MB', () => {
  assert.equal(validateChatFile({ name: 'lich-thi.PDF', size: MAX_CHAT_FILE_BYTES }), null);
  assert.match(validateChatFile({ name: 'anh.png', size: 100 }) ?? '', /Chỉ nhận/);
  assert.match(validateChatFile({ name: 'lich-thi.pdf', size: MAX_CHAT_FILE_BYTES + 1 }) ?? '', /5 MB/);
});
