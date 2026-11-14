export type DigestBlock = { kind: 'heading' | 'item' | 'paragraph'; text: string };

/** Chuyển bản tin dạng Markdown đơn giản từ AI thành nội dung gọn để vẽ bằng giao diện gốc. */
export function digestBlocks(raw: string): DigestBlock[] {
  const blocks: DigestBlock[] = [];
  for (const source of raw.split(/\r?\n/)) {
    const line = source.trim();
    if (!line || /^[\s*_•\-–—]+$/.test(line)) continue;
    const kind: DigestBlock['kind'] = /^\*\*[^*]+\*\*$/.test(line) || /^#{1,3}\s+/.test(line) || /^(?:T[2-7]|CN)\s+\d{1,2}\/\d{1,2}/.test(line)
      ? 'heading'
      : /^[-•*]\s+/.test(line) || /^⚠️/.test(line)
        ? 'item'
        : 'paragraph';
    const plain = line.replace(/^#{1,3}\s+/, '').replace(/\*\*|__/g, '').replace(/^[-•*]\s+/, '').trim();
    // API có thể trả các trường trống bằng nhiều dấu “—”; bỏ các trường trống đó.
    const text = plain.split(/\s*—\s*/).map((part) => part.trim()).filter(Boolean).join(' · ');
    if (text) blocks.push({ kind, text });
  }
  return blocks;
}
