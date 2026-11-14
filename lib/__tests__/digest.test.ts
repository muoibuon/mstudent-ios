/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { digestBlocks } from '../digest';

test('digestBlocks: bỏ Markdown thô và trường trống, giữ cấu trúc bản tin', () => {
  const blocks = digestBlocks(`Có **1 việc ưu tiên cao** đã quá hạn.

**Đã quá hạn — 5/11**
- 23:59 — Nộp học phí ⚠️
— — — —
**Chưa có ngày hạn**
- — Xem xét quyền Claude — — — liên kết GitHub

**Ưu tiên hôm nay:** kiểm tra học phí.`);
  assert.deepEqual(blocks, [
    { kind: 'paragraph', text: 'Có 1 việc ưu tiên cao đã quá hạn.' },
    { kind: 'heading', text: 'Đã quá hạn · 5/11' },
    { kind: 'item', text: '23:59 · Nộp học phí ⚠️' },
    { kind: 'heading', text: 'Chưa có ngày hạn' },
    { kind: 'item', text: 'Xem xét quyền Claude · liên kết GitHub' },
    { kind: 'paragraph', text: 'Ưu tiên hôm nay: kiểm tra học phí.' },
  ]);
  assert.deepEqual(digestBlocks('## Sắp tới\n* Nộp bài\n---'), [
    { kind: 'heading', text: 'Sắp tới' },
    { kind: 'item', text: 'Nộp bài' },
  ]);
});
