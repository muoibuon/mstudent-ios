// Bản tin sáng do AI viết có thể kèm markdown (**đậm**, ---, # tiêu đề) hoặc "— — —" thay cho trường trống.
// App hiển thị chữ thuần → dọn các ký hiệu đó để dễ đọc. Logic thuần, có test.

export function cleanDigest(text: string): string {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    let line = raw.trim();
    if (/^([-—–_*=•·]\s*){3,}$/.test(line)) continue; // đường kẻ ngang
    line = line.replace(/\*\*|__/g, '').replace(/^#{1,6}\s+/, '').replace(/`/g, '');
    line = line.replace(/(\s*[—–]\s*){2,}/g, ' · '); // "— — —" thay cho trường trống
    line = line.replace(/^[-*•]\s*([—–]\s*)?/, '• '); // gạch đầu dòng (kể cả "- — ")
    line = line.replace(/\s+·\s*$/, '').replace(/^•\s*$/, '').trim();
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
