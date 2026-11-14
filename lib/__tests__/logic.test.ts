/// <reference types="node" />
// Chạy: npm test  (node:test + tsx, không cần simulator)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bucketOf, dayDiff, dayKey, fmtDue, moveToDay, relativeDay, startOfDay } from '../dates';
import { MAX_SCHEDULED, planReminders, signature } from '../reminders';
import type { Task } from '../types';

const NOW = new Date('2026-11-11T08:00:00+07:00'); // Thứ 4

function task(id: number, due: string | null, reminders: string[] = [], extra: Partial<Task> = {}): Task {
  return {
    id, title: `Việc ${id}`, course: null, category: 'deadline', due_at: due, location: null, action: null,
    priority: 'medium', source: 'zalo', message_id: `m${id}`, status: 'open', reminders, updated_from: [], sources: [], note: null, ...extra,
  };
}

test('dayKey theo giờ VN, không phụ thuộc múi giờ máy', () => {
  assert.equal(dayKey('2026-11-11T23:30:00+07:00'), '2026-11-11');
  assert.equal(dayKey('2026-11-11T17:30:00Z'), '2026-11-12'); // 00:30 ngày 12 giờ VN
  assert.equal(startOfDay(NOW).toISOString(), '2026-11-10T17:00:00.000Z');
});

test('fmtDue / relativeDay / dayDiff', () => {
  assert.equal(fmtDue('2026-11-13T23:59:00+07:00'), '23:59 T6 13/11');
  assert.equal(fmtDue(null), 'Không có hạn');
  assert.equal(relativeDay('2026-11-11T23:59:00+07:00', NOW), 'hôm nay');
  assert.equal(relativeDay('2026-11-12T07:00:00+07:00', NOW), 'ngày mai');
  assert.equal(relativeDay('2026-11-15T07:00:00+07:00', NOW), 'còn 4 ngày');
  assert.equal(relativeDay('2026-11-09T07:00:00+07:00', NOW), 'quá hạn 2 ngày');
  assert.equal(dayDiff(NOW, '2026-11-18T00:10:00+07:00'), 7);
});

test('bucketOf', () => {
  assert.equal(bucketOf(null, NOW), 'Không có hạn');
  assert.equal(bucketOf('2026-11-11T07:00:00+07:00', NOW), 'Quá hạn');
  assert.equal(bucketOf('2026-11-11T20:00:00+07:00', NOW), 'Hôm nay');
  assert.equal(bucketOf('2026-11-12T20:00:00+07:00', NOW), 'Ngày mai');
  assert.equal(bucketOf('2026-11-17T20:00:00+07:00', NOW), 'Tuần này');
  assert.equal(bucketOf('2026-11-18T20:00:00+07:00', NOW), 'Sau đó');
});

test('moveToDay giữ nguyên giờ và múi giờ', () => {
  assert.equal(moveToDay('2026-11-13T23:59:00+07:00', '2026-11-20'), '2026-11-20T23:59:00+07:00');
});

test('planReminders: chỉ mốc tương lai, thêm mốc đúng hạn, sắp xếp, bỏ việc đã xong', () => {
  const tasks = [
    task(1, '2026-11-13T23:59:00+07:00', ['2026-11-10T23:59:00+07:00', '2026-11-12T23:59:00+07:00', '2026-11-13T21:59:00+07:00']),
    task(2, '2026-11-12T08:00:00+07:00', [], { status: 'done' }),
    task(3, null),
    task(4, '2026-11-11T10:00:00+07:00', ['2026-11-11T08:00:00+07:00']), // mốc nhắc = now → bỏ
  ];
  const plan = planReminders(tasks, NOW);
  assert.deepEqual(
    plan.map((r) => `${r.taskId}@${dayKey(r.date)}`),
    ['4@2026-11-11', '1@2026-11-12', '1@2026-11-13', '1@2026-11-13'],
  );
  assert.match(plan[0].title, /^⏰ Đến hạn/);
  assert.match(plan[1].body, /^còn 1 ngày · 23:59 T6 13\/11/);
  assert.match(plan[2].body, /^còn 2 giờ/);
});

test('planReminders giới hạn số thông báo (iOS tối đa 64) và chữ ký ổn định', () => {
  const many = [...Array(100)].map((_, i) => task(i + 1, new Date(NOW.getTime() + (i + 1) * 3600e3).toISOString()));
  const plan = planReminders(many, NOW);
  assert.equal(plan.length, MAX_SCHEDULED);
  assert.equal(plan[0].taskId, 1);
  assert.equal(signature(plan), signature(planReminders(many, NOW)));
});

test('normalizeUrl: thêm http:// cho địa chỉ LAN, giữ https, bỏ / cuối', async () => {
  const { normalizeUrl } = await import('../url');
  assert.equal(normalizeUrl(' 192.168.1.5:8000/ '), 'http://192.168.1.5:8000');
  assert.equal(normalizeUrl('https://abc.trycloudflare.com//'), 'https://abc.trycloudflare.com');
  assert.equal(normalizeUrl('HTTP://10.0.2.2:8000'), 'HTTP://10.0.2.2:8000');
  assert.equal(normalizeUrl('   '), '');
});

test('normalizeUrl: chỉ cho http với địa chỉ mạng nội bộ, còn lại luôn https', async () => {
  const { normalizeUrl, isPrivateHost } = await import('../url');
  assert.equal(normalizeUrl('http://192.168.1.5:8000'), 'http://192.168.1.5:8000');
  assert.equal(normalizeUrl('http://10.0.0.2'), 'http://10.0.0.2');
  assert.equal(normalizeUrl('http://localhost:8000'), 'http://localhost:8000');
  assert.equal(normalizeUrl('172.20.1.1:8000'), 'http://172.20.1.1:8000');
  assert.equal(normalizeUrl('http://example.com'), 'https://example.com');
  assert.equal(normalizeUrl('HTTP://mst.tail1234.ts.net/'), 'https://mst.tail1234.ts.net');
  assert.equal(normalizeUrl('mst.tail1234.ts.net'), 'https://mst.tail1234.ts.net');
  assert.equal(normalizeUrl('http://8.8.8.8:8000/api'), 'https://8.8.8.8:8000/api');
  assert.equal(normalizeUrl('http://172.32.0.1'), 'https://172.32.0.1');
  // host giả dạng địa chỉ nội bộ không được coi là nội bộ
  assert.equal(normalizeUrl('http://192.168.1.5.evil.com'), 'https://192.168.1.5.evil.com');
  assert.equal(normalizeUrl('http://localhost.evil.com'), 'https://localhost.evil.com');
  assert.equal(isPrivateHost('192.168.0.1'), true);
  assert.equal(isPrivateHost('192.169.0.1'), false);
});

test('normalizeUrl: phần user@ không được dùng để lách http (host thật nằm sau @)', async () => {
  const { normalizeUrl } = await import('../url');
  assert.equal(normalizeUrl('http://localhost:x@evil.com/api'), 'https://evil.com/api');
  assert.equal(normalizeUrl('http://10.0.0.1:1@203.0.113.9:8000'), 'https://203.0.113.9:8000');
  assert.equal(normalizeUrl('http://[::1]@evil.com'), 'https://evil.com');
  assert.equal(normalizeUrl('localhost:pw@evil.com'), 'https://evil.com');
  assert.equal(normalizeUrl('http://user@192.168.1.5:8000'), 'http://192.168.1.5:8000');
  // "\\" được trình duyệt/fetch coi như "/", nên host vẫn là localhost
  assert.equal(normalizeUrl('http://localhost\\@evil.com'), 'http://localhost\\@evil.com');
  for (const u of ['http://localhost:x@evil.com/api', 'localhost:pw@evil.com', 'http://[::1]@evil.com']) {
    const out = new URL(normalizeUrl(u));
    assert.equal(out.protocol, 'https:');
    assert.equal(out.username + out.password, '');
  }
});

test('gmailGrantErrorMessage: Google từ chối → câu báo thử nghiệm; lỗi khác giữ nguyên', async () => {
  const { gmailGrantErrorMessage, GMAIL_TESTING_MESSAGE } = await import('../errors');
  assert.equal(gmailGrantErrorMessage(new Error('access_denied: app is being tested')), GMAIL_TESTING_MESSAGE);
  assert.equal(gmailGrantErrorMessage({ code: 'x', message: 'Access blocked: app has not completed the Google verification process' }), GMAIL_TESTING_MESSAGE);
  // lỗi cấu hình của nhà phát triển phải giữ nguyên để còn sửa được
  assert.equal(gmailGrantErrorMessage({ code: '10', message: 'DEVELOPER_ERROR' }), 'DEVELOPER_ERROR');
  assert.equal(gmailGrantErrorMessage(new Error('Mất mạng')), 'Mất mạng');
  assert.equal(gmailGrantErrorMessage(null), 'Không cấp được quyền Gmail');
});

test('parseShareLink: deep link từ Phím tắt iOS chỉ điền sẵn nội dung hợp lệ', async () => {
  const { parseShareLink, MAX_SHARED_CHARS } = await import('../sharelink');
  assert.deepEqual(parseShareLink({ text: '  Nộp Lab 4 trước 23h59 thứ 6\r\n ', source: 'zalo' }), {
    text: 'Nộp Lab 4 trước 23h59 thứ 6',
    source: 'zalo',
  });
  assert.deepEqual(parseShareLink({ text: ['a', 'b'], source: 'EMAIL' }), { text: 'a', source: 'email' });
  assert.equal(parseShareLink({ text: '   ' }), null);
  assert.equal(parseShareLink({}), null);
  assert.equal(parseShareLink({ text: 'x', source: 'evil' })?.source, 'zalo');
  assert.equal(parseShareLink({ text: 'y'.repeat(MAX_SHARED_CHARS + 50) })?.text.length, MAX_SHARED_CHARS);
});

test('sources: thời gian tương đối giờ VN, trạng thái, nhãn nguồn của việc', async () => {
  const { relativeTime, statusOf, statusText, taskSourcesLabel } = await import('../sources');
  const now = new Date('2026-11-13T10:00:00+07:00');
  assert.equal(relativeTime('2026-11-13T09:59:30+07:00', now), 'vừa xong');
  assert.equal(relativeTime('2026-11-13T09:55:00+07:00', now), '5 phút trước');
  assert.equal(relativeTime('2026-11-13T07:00:00+07:00', now), '3 giờ trước');
  assert.equal(relativeTime('2026-11-12T14:30:00Z', now), 'hôm qua 21:30');
  assert.equal(relativeTime('2026-11-10T14:30:00Z', now), '10/11 21:30');
  assert.equal(relativeTime(null, now), 'chưa có');
  const base = { id: 1, kind: 'sheet' as const, label: 'K70', created_at: '', last_run_at: null, last: null };
  assert.equal(statusOf({ ...base, enabled: true, last_error: null, last_ok_at: null }), 'pending');
  assert.equal(statusOf({ ...base, enabled: false, last_error: 'Cần kết nối lại Google', last_ok_at: null }), 'error');
  assert.equal(statusOf({ ...base, enabled: false, last_error: null, last_ok_at: null }), 'off');
  const ok = { ...base, enabled: true, last_error: null, last_ok_at: '2026-11-13T02:55:00Z',
    last: { created: 3, updated: 1, skipped: 0, mode: 'structured' } };
  assert.equal(statusText(ok, now), 'Đồng bộ 5 phút trước · +3 việc, 1 cập nhật');
  assert.equal(taskSourcesLabel(['email', 'sheet', 'email'], 'email'), 'Email + Bảng lớp');
  assert.equal(taskSourcesLabel([], 'classroom'), 'Classroom');
});

test('sync: so ảnh chụp việc → việc mới / đổi hạn, lần đầu không báo', async () => {
  const { diffTasks, snapshotOf, summaryOf } = await import('../sync');
  const a = task(1, '2026-11-20T23:59:00+07:00');
  const b = task(2, null);
  const prev = snapshotOf([a, b, task(9, null, [], { status: 'done' })]);
  assert.deepEqual(prev, { '1': '2026-11-20T23:59:00+07:00', '2': '' });
  assert.deepEqual(diffTasks(null, [a]), { added: [], moved: [] });
  const moved = { ...a, due_at: '2026-11-22T23:59:00+07:00' };
  const c = task(3, '2026-11-21T17:00:00+07:00');
  const d = diffTasks(prev, [moved, b, c, task(4, null, [], { status: 'done' })]);
  assert.deepEqual(d.added.map((t) => t.id), [3]);
  assert.deepEqual(d.moved.map((t) => t.id), [1]);
  const fmt = (due: string | null) => (due ? due.slice(0, 10) : 'không có hạn');
  assert.deepEqual(summaryOf(d.added, d.moved, fmt), { title: 'MStudent: việc mới', body: 'Việc 3 · 2026-11-21' });
  assert.deepEqual(summaryOf([], d.moved, fmt)?.title, 'MStudent: cập nhật hạn');
  assert.equal(summaryOf([], [], fmt), null);
  assert.equal(summaryOf([c, a], [], fmt)?.body, 'Sớm nhất: Việc 1 · 2026-11-20');
});

test('zaloFilter: chỉ gói Zalo + nhóm đã chọn, chống lặp 10 phút, cắt độ dài', async () => {
  const { ZaloFilter, ZALO_PACKAGE, MAX_CHARS } = await import('../zaloFilter');
  const f = new ZaloFilter(['Lớp K70 CNTT', '  ']);
  const base = { packageName: ZALO_PACKAGE, title: 'Lớp  K70 cntt', text: 'Mai kiểm tra 15 phút', postedAt: 0 };
  assert.deepEqual(f.accept(base), { group: 'Lớp  K70 cntt', body: 'Mai kiểm tra 15 phút' });
  assert.equal(f.accept({ ...base, postedAt: 60_000 }), null); // lặp trong 10 phút
  assert.notEqual(f.accept({ ...base, postedAt: 11 * 60_000 }), null); // quá 10 phút → tin mới
  assert.equal(f.accept({ ...base, title: 'Mẹ' }), null); // chat riêng / nhóm không chọn
  assert.equal(f.accept({ ...base, packageName: 'com.facebook.orca' }), null);
  assert.equal(f.accept({ ...base, text: '   ' }), null);
  assert.equal(f.accept({ ...base, text: 'x'.repeat(MAX_CHARS + 10), postedAt: 99e6 })?.body.length, MAX_CHARS);
  assert.equal(new ZaloFilter([]).accept(base), null); // chưa chọn nhóm → không gửi gì
});

test('catalog: tìm trường theo viết tắt / tên không dấu, ngành theo bậc', async () => {
  const { searchSchools, majorsFor, fold } = await import('../catalog');
  const schools = [
    { name: 'Đại học Bách khoa Hà Nội', abbr: 'HUST', en: '', group: '', place: '' },
    { name: 'Trường Đại học Việt Nhật, ĐHQGHN', abbr: 'VNU-VJU', en: 'VNU Vietnam Japan University', group: '', place: '' },
    { name: 'Trường Công nghệ Thông tin và Truyền thông, Đại học Bách khoa Hà Nội', abbr: 'SoICT', en: '', group: '', place: '' },
    { name: 'Trường Đại học Kinh tế Quốc dân', abbr: 'NEU', en: '', group: '', place: '' },
  ];
  assert.equal(searchSchools(schools, 'vju')[0].abbr, 'VNU-VJU');
  assert.equal(searchSchools(schools, 'hust')[0].abbr, 'HUST');
  assert.equal(searchSchools(schools, 'bach khoa')[0].abbr, 'HUST'); // tên ngắn hơn lên trước
  assert.equal(searchSchools(schools, 'viet nhat')[0].abbr, 'VNU-VJU');
  assert.deepEqual(searchSchools(schools, '  '), []);
  assert.equal(fold('Đại Học'), 'dai hoc');
  const cat = {
    schools,
    majors: {
      dai_hoc: [{ code: '7480101', name: 'Khoa học máy tính' }, { code: '7220209', name: 'Ngôn ngữ Nhật' }, { code: '7310613', name: 'Nhật Bản học' }],
      thac_si: [{ code: '8480101', name: 'Khoa học máy tính' }],
      tien_si: [],
    },
    programs: { 'VNU-VJU': { dai_hoc: [{ code: 'BJS', name: 'Nhật Bản học' }] } },
    sources: {},
  };
  const vju = majorsFor(cat, 'VNU-VJU', 'dai_hoc', '');
  assert.deepEqual(vju.own.map((m) => m.code), ['BJS']);
  assert.ok(!vju.national.some((m) => m.name === 'Nhật Bản học')); // không lặp với chương trình của trường
  assert.deepEqual(majorsFor(cat, 'HUST', 'dai_hoc', 'may tinh').national.map((m) => m.code), ['7480101']);
  assert.deepEqual(majorsFor(cat, 'HUST', 'dai_hoc', '7220').national.map((m) => m.code), ['7220209']);
  assert.deepEqual(majorsFor(cat, 'HUST', 'thac_si', '').national.length, 1);
});

// ---- 003: lời mời sự kiện ----

import { inviteNotice, newInvites, openableUrl, sortInvites } from '../events';
import { prefillCount, prefillUrl } from '../prefill';
import type { FormMeta } from '../types';

const FORM: FormMeta = {
  form_id: '1FAIpQLSc' + 'a'.repeat(47),
  fields: [
    { entry: '111', role: 'name' },
    { entry: '222', role: 'student_id' },
    { entry: '333', role: 'email' },
    { entry: '444', role: 'class_name' },
    { entry: '555', role: 'phone' },
  ],
};

test('prefillUrl: chỉ điền câu có dữ liệu, mã hoá URL, luôn trỏ docs.google.com', () => {
  const url = prefillUrl(FORM, { name: 'Trần Văn Đạt & bạn', student_id: '21020001', email: 'a+b@vju.ac.vn', class_name: ' ', phone: '' })!;
  assert.equal(
    url,
    `https://docs.google.com/forms/d/e/${FORM.form_id}/viewform?usp=pp_url&entry.111=${encodeURIComponent('Trần Văn Đạt & bạn')}&entry.222=21020001&entry.333=a%2Bb%40vju.ac.vn`,
  );
  assert.equal(new URL(url).searchParams.get('entry.111'), 'Trần Văn Đạt & bạn');
  assert.equal(prefillCount(FORM, { name: 'A', student_id: '1' }), 2);
  assert.equal(prefillUrl(FORM, {}), null); // không có gì để điền → dùng link gốc
  assert.equal(prefillUrl(null, { name: 'A' }), null);
});

test('prefillUrl: form_meta lạ / bị chèn không tạo được link sang nơi khác', () => {
  assert.equal(prefillUrl({ form_id: 'x/../../evil.vn?', fields: FORM.fields }, { name: 'A' }), null);
  assert.equal(prefillUrl({ form_id: FORM.form_id, fields: [{ entry: '1&redirect=//evil.vn', role: 'name' }] }, { name: 'A' }), null);
  assert.equal(prefillUrl({ form_id: FORM.form_id, fields: 'rác' } as unknown as FormMeta, { name: 'A' }), null);
  const long = prefillUrl(FORM, { name: 'x'.repeat(1000) })!;
  assert.ok(long.length < 400); // giá trị bị cắt 200 ký tự
});

test('sortInvites: hợp ngành trước, rồi theo giờ; ẩn sự kiện đã qua', () => {
  const inv = (id: number, due: string | null, fit: Task['fit_level'], extra: Partial<Task> = {}) =>
    task(id, due, [], { category: 'event', rsvp: 'pending', fit_level: fit, ...extra });
  const list = [
    inv(1, '2026-11-20T14:00:00+07:00', 'low'),
    inv(2, '2026-11-25T09:00:00+07:00', 'high'),
    inv(3, '2026-11-12T09:00:00+07:00', 'high'),
    inv(4, '2026-11-10T09:00:00+07:00', 'high'), // đã qua
    inv(5, null, 'medium'),
    inv(6, '2026-11-13T09:00:00+07:00', null),
    inv(7, '2026-11-11T07:00:00+07:00', 'medium', { event_end: '2026-11-11T10:00:00+07:00' }), // đang diễn ra
  ];
  assert.deepEqual(sortInvites(list, NOW).map((t) => t.id), [3, 2, 7, 5, 1, 6]);
});

test('openableUrl chỉ nhận http(s)', () => {
  assert.equal(openableUrl(' https://vju.ac.vn/su-kien?x=1 '), 'https://vju.ac.vn/su-kien?x=1');
  for (const bad of ['javascript:alert(1)', 'intent://x#Intent;end', 'file:///etc/passwd', 'https://', 'ftp://a.vn', '', null, 'https://user@evil.vn/x', 'https://a.vn b'])
    assert.equal(openableUrl(bad), null);
});

test('newInvites / inviteNotice', () => {
  const a = task(1, '2026-11-20T14:00:00+07:00', [], { title: 'Seminar AI', fit_level: 'high' });
  const b = task(2, null, [], { title: 'Talkshow' });
  assert.deepEqual(newInvites(null, [a, b]), []); // lần đầu không báo
  assert.deepEqual(newInvites([1], [a, b]).map((t) => t.id), [2]);
  assert.deepEqual(inviteNotice(a, 'T6 20/11 14:00'), { title: 'Sự kiện mới: Seminar AI', body: 'Rất hợp ngành · T6 20/11 14:00 · Tham gia không?' });
  assert.equal(inviteNotice(b, '').body, 'chưa rõ giờ · Tham gia không?');
});

// ---- Bản tin sáng: dọn markdown ----
import { cleanDigest } from '../digest';

test('cleanDigest bỏ **, đường kẻ, "— — —", gạch đầu dòng lạ', () => {
  const raw = [
    'Có **1 việc ưu tiên cao đã quá hạn**; không có hạn mới.',
    '',
    '**Đã quá hạn — 5/11**',
    '- 23:59 — Nộp học phí và BHYT 2027 ⚠️',
    '———',
    '',
    '',
    '**Chưa có ngày hạn**',
    '- — Xem xét quyền cập nhật Claude — — — liên kết GitHub',
    '- — Gemini 4 NYC Hackathon — — — New York City',
    '## Ưu tiên hôm nay',
    '**Ưu tiên hôm nay:** kiểm tra khoản học phí',
  ].join('\n');
  assert.equal(
    cleanDigest(raw),
    [
      'Có 1 việc ưu tiên cao đã quá hạn; không có hạn mới.',
      '',
      'Đã quá hạn — 5/11',
      '• 23:59 — Nộp học phí và BHYT 2027 ⚠️',
      '',
      'Chưa có ngày hạn',
      '• Xem xét quyền cập nhật Claude · liên kết GitHub',
      '• Gemini 4 NYC Hackathon · New York City',
      'Ưu tiên hôm nay',
      'Ưu tiên hôm nay: kiểm tra khoản học phí',
    ].join('\n'),
  );
  assert.equal(cleanDigest('Tuần này chưa có việc nào có hạn. 🎉'), 'Tuần này chưa có việc nào có hạn. 🎉');
  assert.equal(cleanDigest(''), '');
});
