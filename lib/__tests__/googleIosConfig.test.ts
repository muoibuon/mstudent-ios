/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { googleIosSetupError } from '../googleIosConfig';

const clientId = '123-example.apps.googleusercontent.com';
const scheme = 'com.googleusercontent.apps.123-example';

test('Google iOS: đúng scheme mới mở luồng native', () => {
  assert.equal(googleIosSetupError(clientId, scheme), null);
  assert.match(googleIosSetupError(clientId, undefined) ?? '', /cài bản MStudent mới nhất/);
  assert.match(googleIosSetupError(clientId, 'com.googleusercontent.apps.other') ?? '', /cài bản MStudent mới nhất/);
  assert.match(googleIosSetupError('', scheme) ?? '', /Máy chủ chưa cấu hình Google iOS/);
});
