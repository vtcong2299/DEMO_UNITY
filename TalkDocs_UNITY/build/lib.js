// Hàm dựng khối nội dung cho tài liệu Word (dùng thư viện docx).
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, ImageRun, AlignmentType, TableLayoutType,
} = require('docx');

const IMG = path.join(__dirname, '..', 'img');
const CW = 9638;
const FONT = 'Calibri', MONO = 'Consolas';
const COL = { ink: '1F2937', ink2: '4B5563', muted: '6B7280', cs: '2F6FDB', accent: 'C2410C', okBg: 'E6F4EA', ok: '1E7B3C', midBg: 'FFF4D6', mid: '8A6100', hiBg: 'FDE7E7', hi: 'B42318', codeBg: 'F6F8FA', line: 'D1D5DB' };
const REPO = 'https://github.com/vtcong2299/DEMO_UNITY';
const LEVEL = {
  co_ban: { label: 'CƠ BẢN', bg: COL.okBg, fg: COL.ok },
  trung_binh: { label: 'TRUNG BÌNH', bg: COL.midBg, fg: COL.mid },
  nang_cao: { label: 'NÂNG CAO', bg: COL.hiBg, fg: COL.hi },
};

function runs(str, base = {}) {
  const out = [];
  for (const part of String(str).split(/(\*\*`[^`]+`\*\*|\*\*[^*]+\*\*|`[^`]+`)/g)) {
    if (!part) continue;
    if (part.startsWith('**`')) { out.push(new TextRun({ text: part.slice(3, -3), font: MONO, bold: true, size: (base.size || 22) - 2, color: COL.accent })); continue; }
    if (part.startsWith('**')) out.push(new TextRun({ text: part.slice(2, -2), bold: true, ...base }));
    else if (part.startsWith('`')) out.push(new TextRun({ text: part.slice(1, -1), font: MONO, size: (base.size || 22) - 2, color: COL.accent, ...(base.bold ? { bold: true } : {}) }));
    else out.push(new TextRun({ text: part, ...base }));
  }
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: runs(s, o.run), spacing: { after: 120, line: 300 }, alignment: o.align, ...(o.p || {}) });
const H1 = s => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s)], pageBreakBefore: true });
const H2 = s => new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(s, { size: 30, bold: true, color: COL.cs }) });
function H3(s, level) {
  const ch = runs(s, { size: 26, bold: true });
  if (level) { const L = LEVEL[level]; ch.push(new TextRun({ text: '  ' }), new TextRun({ text: ` ${L.label} `, bold: true, size: 18, color: L.fg, shading: { type: ShadingType.CLEAR, fill: L.bg, color: 'auto' } })); }
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: ch });
}
const label = s => new Paragraph({ children: [new TextRun({ text: s, bold: true, color: COL.ink2, size: 20 })], spacing: { before: 140, after: 60 }, keepNext: true });
const bullets = arr => arr.map(s => new Paragraph({ children: runs(s), numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 290 } }));
let numInst = 0;
const steps = arr => { numInst++; return arr.map(s => new Paragraph({ children: runs(s), numbering: { reference: 'num', level: 0, instance: numInst }, spacing: { after: 60, line: 290 } })); };

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
function boxed(children, { fill, border, borderSize = 24 }) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA }, children,
      shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
      margins: { top: 100, bottom: 100, left: 180, right: 140 },
      borders: { top: noBorder, bottom: noBorder, right: noBorder, left: { style: BorderStyle.SINGLE, size: borderSize, color: border } },
    })] })],
  });
}
const gap = () => new Paragraph({ children: [], spacing: { after: 80 } });

function code(src, kind = 'neutral') {
  const border = kind === 'bad' ? 'D64545' : kind === 'good' ? '1E8E4E' : '9CA3AF';
  const tag = kind === 'bad' ? 'Thường viết' : kind === 'good' ? 'Nên viết' : null;
  const paras = [];
  if (tag) paras.push(new Paragraph({ children: [new TextRun({ text: tag.toUpperCase(), bold: true, size: 16, color: border, font: FONT })], spacing: { after: 40 } }));
  for (const line of src.replace(/^\n|\n\s*$/g, '').split('\n')) {
    const i = line.indexOf('//');
    const ch = [];
    const pre = i >= 0 ? line.slice(0, i) : line;
    if (pre) ch.push(new TextRun({ text: pre, font: MONO, size: 18, color: '24292F' }));
    if (i >= 0) ch.push(new TextRun({ text: line.slice(i), font: MONO, size: 18, color: '1A7F37', italics: true }));
    if (!ch.length) ch.push(new TextRun({ text: ' ', font: MONO, size: 18 }));
    paras.push(new Paragraph({ children: ch, spacing: { after: 0, line: 260 } }));
  }
  return [boxed(paras, { fill: COL.codeBg, border, borderSize: 18 }), gap()];
}
function callout(title, body, kind = 'info') {
  const map = { info: ['EEF4FF', '2F6FDB'], warn: ['FFF6DD', 'B7791F'], key: ['FDF0E6', 'C2410C'], ok: ['E6F4EA', '1E8E4E'] };
  const [fill, border] = map[kind];
  const ch = [];
  if (title) ch.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, color: border })], spacing: { after: 60 } }));
  (Array.isArray(body) ? body : [body]).forEach(b => ch.push(new Paragraph({ children: runs(b), spacing: { after: 60, line: 290 } })));
  return [boxed(ch, { fill, border }), gap()];
}
function image(name, w, caption) {
  const buf = fs.readFileSync(path.join(IMG, name + '.png'));
  const pw = buf.readUInt32BE(16), ph = buf.readUInt32BE(20);
  const width = w || 620, height = Math.round(width * ph / pw);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width, height }, altText: { title: caption, description: caption, name } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: caption, italics: true, size: 19, color: COL.muted })] }),
  ];
}
function table(headers, rows, widths, headFill = '1F2937') {
  const total = widths.reduce((a, b) => a + b, 0);
  const W = widths.map(w => Math.round(w / total * CW));
  W[W.length - 1] = CW - W.slice(0, -1).reduce((a, b) => a + b, 0);
  const b = { style: BorderStyle.SINGLE, size: 4, color: COL.line };
  const cell = (txt, i, head) => new TableCell({
    width: { size: W[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: headFill, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    borders: { top: b, bottom: b, left: b, right: b },
    children: String(txt).split('\n').map(t => new Paragraph({ children: runs(t, head ? { bold: true, color: 'FFFFFF', size: 20 } : { size: 20 }), spacing: { after: 30, line: 270 } })),
  });
  return [new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: W, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }), ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))],
  }), gap()];
}

// Mọi hàm được giải thích trong các mục, gom lại cho bảng tra cứu cuối tài liệu.
const apiIndex = new Map();
let currentSection = '';
const setSection = s => { currentSection = s; };

// Một mục kiến thức: tình huống → thường viết → các hàm → Unity làm gì → hậu quả → nên viết → so sánh → ghi nhớ.
function item({ title, level, situation, bad, api, truth, effect, good, compare, notes = [], extra = [], remember }) {
  const out = [H3(title, level)];
  const number = title.split(' ')[0];
  if (situation) out.push(P('**Tình huống:** ' + situation));
  if (bad) out.push(...code(bad, 'bad'));
  if (api) {
    out.push(label('Các hàm và cú pháp trong ví dụ'));
    out.push(...table(['Hàm / cú pháp', 'Dùng để làm gì', 'Lưu ý khi dùng'], api, [26, 44, 30], '374151'));
    api.forEach(([name, what]) => { if (!apiIndex.has(name)) apiIndex.set(name, [what, number]); });
  }
  if (truth) { out.push(label('Thật ra Unity làm gì')); (Array.isArray(truth) ? truth : [truth]).forEach(t => out.push(...(Array.isArray(t) ? bullets(t) : [P(t)]))); }
  if (effect) { out.push(label('Hậu quả')); out.push(...(Array.isArray(effect) ? bullets(effect) : [P(effect)])); }
  if (good) out.push(...code(good, 'good'));
  out.push(...extra);
  if (compare) {
    out.push(label('So sánh các cách'));
    out.push(...table(['Cách', 'Ưu điểm', 'Nhược điểm', 'Khi nào dùng'], compare, [22, 27, 27, 24], '1E3A5F'));
  }
  notes.forEach(n => out.push(...callout(n[0], n[1], n[2] || 'warn')));
  if (remember) out.push(...callout('Ghi nhớ', remember, 'ok'));
  return out;
}

// Một demo: nơi mở, cách tự test, bảng bước kèm kết quả đúng.
function demo({ title, scene, slide, script, goal, prepare = [], steps: rows, after = [] }) {
  const out = [H3('Demo: ' + title)];
  out.push(...callout('▶ CHUYỂN SANG UNITY', [
    `**Scene:** \`Assets/_Talk/Scenes/${scene}.unity\``,
    slide ? `**Slide:** số ${slide} (slide màu cam có nhãn DEMO)` : `**Slide:** không trình bày trên slide, tự test theo bảng dưới`,
    `**Script chính:** \`Assets/_Talk/Scripts/${script}\``,
    `**Tự test:** tải project ở ${REPO}, mở scene trên bằng Unity 6.4, Game view 16:9 (1920×1080), bấm Play rồi làm theo bảng dưới. Trên màn hình demo: bên trái là các bước, bên phải là bảng Kết quả (chấm xanh = cách đúng, chấm đỏ = bẫy), ô xanh lá cuối cột trái là Ghi nhớ.`,
  ], 'key'));
  out.push(P('**Mục tiêu:** ' + goal));
  if (prepare.length) { out.push(label('Chuẩn bị')); out.push(...bullets(prepare)); }
  out.push(label('Các bước test và kết quả đúng'));
  out.push(...table(['Bước', 'Làm gì (nút trên màn hình)', 'Kết quả đúng (bảng Kết quả bên phải)', 'Ý nghĩa'], rows.map((r, i) => [String(i + 1), ...r]), [7, 31, 34, 28], 'C2410C'));
  after.forEach(a => out.push(...callout(a[0], a[1], a[2] || 'info')));
  return out;
}
function deep(title, paras) {
  const out = [H3(title, 'nang_cao')];
  paras.forEach(p => out.push(...(Array.isArray(p) ? bullets(p) : [P(p)])));
  return out;
}
function seeAlso(title, rows) {
  return [H3(title), ...table(['Ở đâu trong Unity', 'Chuyện gì xảy ra bên dưới', 'Nên làm'], rows, [30, 40, 30])];
}
function summary(part, rows) {
  return [
    H2(`Tổng kết Phần ${part}: nên viết thế nào`),
    ...table(['Tình huống', 'Nên viết', 'Tránh'], rows, [28, 40, 32], '1E7B3C'),
  ];
}

module.exports = {
  COL, MONO, REPO, LEVEL, runs, P, H1, H2, H3, label, bullets, steps, callout, code, image, table,
  item, demo, deep, seeAlso, summary, apiIndex, setSection, gap,
};
