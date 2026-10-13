const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, ImageRun, AlignmentType, Footer, Header, PageNumber, LevelFormat, PageBreak, TableLayoutType,
} = require('docx');

const OUT = process.argv[2] || path.join(__dirname, 'UnityDuoiMuiXe.docx');
const IMG = path.join(__dirname, '..', 'img');
const CW = 9638; // A4, lề 2 cm
const FONT = 'Calibri', MONO = 'Consolas';
const COL = { ink: '1F2937', ink2: '4B5563', muted: '6B7280', cs: '2F6FDB', accent: 'C2410C', okBg: 'E6F4EA', ok: '1E7B3C', midBg: 'FFF4D6', mid: '8A6100', hiBg: 'FDE7E7', hi: 'B42318', codeBg: 'F6F8FA', line: 'D1D5DB' };

const LEVEL = {
  co_ban: { label: 'CƠ BẢN', bg: COL.okBg, fg: COL.ok },
  trung_binh: { label: 'TRUNG BÌNH', bg: COL.midBg, fg: COL.mid },
  nang_cao: { label: 'NÂNG CAO', bg: COL.hiBg, fg: COL.hi },
};

// ---------- inline markup: **bold**, `code` ----------
function runs(str, base = {}) {
  const out = [];
  for (const part of String(str).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push(new TextRun({ text: part.slice(2, -2), bold: true, ...base }));
    else if (part.startsWith('`')) out.push(new TextRun({ text: part.slice(1, -1), font: MONO, size: (base.size || 22) - 2, color: COL.accent, ...(base.bold ? { bold: true } : {}) }));
    else out.push(new TextRun({ text: part, ...base }));
  }
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: runs(s, o.run), spacing: { after: 120, line: 300 }, alignment: o.align, ...(o.p || {}) });
const H1 = s => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s)], pageBreakBefore: true });
const H2 = s => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(s)] });
function H3(s, level) {
  const ch = runs(s, { size: 26, bold: true });
  if (level) { const L = LEVEL[level]; ch.push(new TextRun({ text: '  ' }), new TextRun({ text: ` ${L.label} `, bold: true, size: 18, color: L.fg, shading: { type: ShadingType.CLEAR, fill: L.bg, color: 'auto' } })); }
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: ch });
}
const label = s => new Paragraph({ children: [new TextRun({ text: s, bold: true, color: COL.ink2, size: 20 })], spacing: { before: 120, after: 60 } });
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
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const W = widths.map(w => Math.round(w / total * CW));
  W[W.length - 1] = CW - W.slice(0, -1).reduce((a, b) => a + b, 0);
  const b = { style: BorderStyle.SINGLE, size: 4, color: COL.line };
  const cell = (txt, i, head) => new TableCell({
    width: { size: W[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: '1F2937', color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    borders: { top: b, bottom: b, left: b, right: b },
    children: String(txt).split('\n').map(t => new Paragraph({ children: runs(t, head ? { bold: true, color: 'FFFFFF', size: 20 } : { size: 20 }), spacing: { after: 30, line: 270 } })),
  });
  return [new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: W, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }), ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, i, false)) }))],
  }), gap()];
}

// item: một mục kiến thức theo khung 4 bước
function item({ title, level, bad, truth, effect, good, notes = [], extra = [] }) {
  const out = [H3(title, level)];
  if (bad) out.push(...code(bad, 'bad'));
  if (truth) { out.push(label('Thật ra Unity làm gì')); (Array.isArray(truth) ? truth : [truth]).forEach(t => out.push(P(t))); }
  if (effect) { out.push(label('Hậu quả')); out.push(...(Array.isArray(effect) ? bullets(effect) : [P(effect)])); }
  if (good) out.push(...code(good, 'good'));
  out.push(...extra);
  notes.forEach(n => out.push(...callout(n[0], n[1], n[2] || 'warn')));
  return out;
}
function demo({ title, scene, slide, script, goal, steps: stepList, expect }) {
  const out = [H3('Demo: ' + title)];
  out.push(...callout('▶ CHUYỂN SANG UNITY', [
    `**Scene:** \`Assets/_Talk/Scenes/${scene}.unity\` (project DEMO_UNITY)`,
    `**Slide:** số ${slide}, slide có nhãn DEMO màu cam`,
    `**Script chính:** \`${script}\``,
  ], 'key'));
  out.push(P('**Mục tiêu:** ' + goal));
  out.push(label('Các bước trình diễn'));
  out.push(...steps(stepList));
  if (expect) out.push(...callout('Kết quả mong đợi', expect, 'ok'));
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
const qa = pairs => pairs.flatMap(([q, a]) => [P('**Hỏi:** ' + q, { p: { spacing: { after: 40 } } }), P('**Đáp:** ' + a, { run: { color: COL.ink2 } })]);

// ================= NỘI DUNG =================
const C = [];

// ---- Trang bìa ----
C.push(new Paragraph({ spacing: { before: 2400, after: 120 }, children: [new TextRun({ text: 'BUỔI CHIA SẺ KIẾN THỨC DEV', bold: true, size: 22, color: COL.accent, characterSpacing: 40 })] }));
C.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Unity dưới mui xe', bold: true, size: 72, color: COL.ink })] }));
C.push(new Paragraph({ spacing: { after: 480 }, children: [new TextRun({ text: 'Những dòng code dùng mỗi ngày nhưng chưa chắc đã hiểu', size: 32, color: COL.ink2 })] }));
C.push(...table(['Thông tin', ''], [
  ['Người trình bày', '……………………'],
  ['Thời lượng', 'Khoảng 55 phút trình bày và 5–10 phút hỏi đáp'],
  ['Phiên bản Unity', 'Unity 2022.3 LTS và Unity 6 (ghi chú riêng ở chỗ hai bản khác nhau)'],
  ['Đối tượng', 'Dev Unity mọi cấp độ, nội dung chia 3 mức: Cơ bản, Trung bình, Nâng cao'],
  ['Nối tiếp', 'Buổi “Các phương pháp Debug trong C# và Unity” (tìm lỗi) và buổi “Agentic Coding với Claude”'],
], [30, 70]));

// ---- Mục lục ----
C.push(H1('Mục lục'));
[
  'Hướng dẫn sử dụng tài liệu',
  'Mở đầu: Quiz “Đúng hay sai?”',
  'Phần 1. Hai thế giới: C# và C++',
  'Phần 2. Một frame trong Unity chạy những gì (Player Loop)',
  'Phần 3. Serialization: Unity lưu dữ liệu thế nào',
  'Phần 4. Bộ nhớ và Garbage Collector',
  'Phần 5. Rendering: những dòng code “vô hại”',
  'Phần 6. Editor khác bản build',
  'Kết: Cheat sheet và đáp án quiz',
  'Phụ lục A. Chuẩn bị project demo',
  'Phụ lục B. Câu hỏi có thể gặp và gợi ý trả lời',
  'Phụ lục C. Tài liệu tham khảo',
].forEach((t, i) => C.push(new Paragraph({ children: [new TextRun({ text: `${String(i + 1).padStart(2, '0')}   `, color: COL.muted, font: MONO }), new TextRun({ text: t, size: 24 })], spacing: { after: 100 } })));
C.push(P('Mẹo: bật **View → Navigation Pane** trong Word để nhảy nhanh giữa các phần.', { run: { color: COL.muted, size: 20 } }));

// ---- Hướng dẫn sử dụng ----
C.push(H1('Hướng dẫn sử dụng tài liệu'));
C.push(H2('Tài liệu này dùng để làm gì'));
C.push(...bullets([
  '**Kịch bản cho người trình bày:** mỗi mục có đủ ví dụ code, giải thích và demo để nói theo.',
  '**Tài liệu phát cho team sau buổi họp:** người nghe đọc lại phần mình quan tâm, nhất là cheat sheet ở cuối.',
  '**Tài liệu tra cứu:** mỗi mục độc lập, có thể đọc riêng.',
]));
C.push(H2('Cách đọc nhãn độ khó'));
C.push(...table(['Nhãn', 'Ý nghĩa', 'Cách nói trong buổi họp'], [
  ['CƠ BẢN', 'Phần lớn dev đã biết, nhưng có thể chưa biết vì sao', 'Nói lướt 30–60 giây, chủ yếu để mọi người có điểm chung'],
  ['TRUNG BÌNH', 'Dev đã dùng nhưng hay hiểu sai hoặc chưa để ý', 'Giải thích kỹ, có hình minh hoạ'],
  ['NÂNG CAO', 'Phần đa số chưa biết, nằm sâu trong engine', 'Dành nhiều thời gian nhất, nên có demo chứng minh'],
], [18, 42, 40]));
C.push(H2('Mỗi mục trình bày theo 4 bước'));
C.push(...steps([
  '**Thường viết:** đoạn code quen thuộc (khung viền đỏ).',
  '**Thật ra Unity làm gì:** nguyên lý bên dưới.',
  '**Hậu quả:** chậm ở đâu, lỗi ở đâu.',
  '**Nên viết:** cách dùng đúng (khung viền xanh).',
]));
C.push(H2('Kế hoạch thời gian'));
C.push(...table(['Phần', 'Nội dung', 'Thời lượng', 'Slide', 'Demo (scene)'], [
  ['Mở đầu', 'Giới thiệu, cách đọc bài, quiz “Đúng hay sai?”', '5 phút', '1–4', '-'],
  ['1', 'Hai thế giới: C# và C++', '10 phút', '5–12', '`01_FakeNull` (slide 10), `02_NativeCost` (slide 12)'],
  ['2', 'Player Loop, coroutine, async', '12 phút', '13–20', '`03_PlayerLoop` (slide 18), `04_Lifetime` (slide 20)'],
  ['3', 'Serialization', '9 phút', '21–25', '`05_Serialization` (slide 25)'],
  ['4', 'Bộ nhớ và GC', '8 phút', '26–29', '`06_GarbageCollector` (slide 29)'],
  ['5', 'Rendering', '8 phút', '30–34', '`07_Rendering` (slide 34)'],
  ['6', 'Editor khác bản build', '6 phút', '35–38', '`08_EnterPlayMode` (slide 38)'],
  ['Kết', 'Đáp án quiz, cheat sheet, hỏi đáp', '4 phút', '39–41', '-'],
  ['', '**Tổng**', '**≈ 62 phút**', '', ''],
], [9, 30, 12, 10, 39]));
C.push(H2('Bản đồ demo: lúc nào chuyển sang Unity'));
C.push(P('Slide có nhãn **DEMO** màu cam là lúc chuyển sang Unity. Mỗi demo là một scene riêng trong project `D:\\_PROJECT\\DEMO_UNITY`, trong thư mục `Assets/_Talk/Scenes`. Dưới mỗi scene có thanh **Scene trước / Scene sau** để chuyển nhanh khi đang Play.'));
C.push(...table(['Slide', 'Scene', 'Chứng minh điều gì', 'Mục trong tài liệu'], [
  ['10', '`01_FakeNull`', '`==` và `?.` cho kết quả khác nhau sau Destroy', '1.5, 1.6'],
  ['12', '`02_NativeCost`', 'Chi phí GetComponent, position, tag, Find, Update rỗng', '1.1–1.4, 1.7'],
  ['18', '`03_PlayerLoop`', 'FixedUpdate 0..n lần, input bị mất, timeScale', '2.4–2.6'],
  ['20', '`04_Lifetime`', 'Coroutine và async sống tới khi nào', '2.3, 2.7'],
  ['25', '`05_Serialization`', 'Inspector thắng code, ScriptableObject, SerializeReference, GUID', '3.1–3.6'],
  ['29', '`06_GarbageCollector`', '15 mẫu code tạo / không tạo rác, heap không co lại', '4.1–4.3'],
  ['34', '`07_Rendering`', 'Bản sao material, SRP Batcher và MaterialPropertyBlock', '5.1, 5.3'],
  ['38', '`08_EnterPlayMode`', 'Thời gian vào Play, static và event không reset', '6.3'],
], [8, 22, 50, 20]));
C.push(...callout('Nếu buổi họp chỉ có 40–45 phút', [
  'Bỏ Phần 6, hoặc gộp Phần 4 và Phần 5 thành một phần “Hiệu năng” 10 phút.',
  'Các mục CƠ BẢN chỉ đọc tiêu đề và đoạn “Nên viết”, không giải thích.',
], 'info'));
C.push(...callout('Nguyên tắc an toàn khi trình bày', [
  'Tự chạy lại **mọi mục NÂNG CAO** trên đúng phiên bản Unity của team trước buổi họp. Một mục nâng cao có demo chứng minh thì không ai bắt bẻ được.',
  'Quay video dự phòng cho từng demo, phòng khi Editor hoặc máy chiếu có vấn đề.',
], 'key'));

// ---- Mở đầu: Quiz ----
C.push(H1('Mở đầu: Quiz “Đúng hay sai?”'));
C.push(P('Chiếu từng câu, cho cả phòng giơ tay **Đúng** hoặc **Sai**, chưa công bố đáp án. Đáp án được giải thích dần trong từng phần và tổng kết ở cuối bài.'));
C.push(...table(['#', 'Câu hỏi', 'Mức', 'Giải ở'], [
  ['1', 'Gọi `enabled = false` thì coroutine của script đó dừng lại.', 'CƠ BẢN', 'Phần 2'],
  ['2', 'Đặt `Time.timeScale = 0` thì `Update` ngừng chạy.', 'CƠ BẢN', 'Phần 2'],
  ['3', 'Sau `Destroy(obj)`, ngay dòng tiếp theo `obj == null` là true.', 'TRUNG BÌNH', 'Phần 1'],
  ['4', 'Sửa giá trị mặc định của field trong code thì prefab có sẵn cũng đổi theo.', 'CƠ BẢN', 'Phần 3'],
  ['5', '`FixedUpdate` luôn chạy đúng 1 lần mỗi frame.', 'TRUNG BÌNH', 'Phần 2'],
  ['6', '`target?.Attack()` an toàn với object đã bị Destroy.', 'NÂNG CAO', 'Phần 1'],
  ['7', '`async void` tự dừng khi object bị Destroy.', 'NÂNG CAO', 'Phần 2'],
  ['8', 'Code chạy tốt trong Editor thì chắc chắn chạy tốt trên điện thoại.', 'NÂNG CAO', 'Phần 6'],
], [6, 64, 15, 15]));
C.push(...callout('Câu dẫn vào bài', 'Ai trả lời đúng cả 8 câu thì có thể về sớm. Còn lại, mình cùng xem bên dưới Unity đang làm gì.', 'key'));

// ---- Phần 1 ----
C.push(H1('Phần 1. Hai thế giới: C# và C++'));
C.push(...callout('Ý chính của phần', 'Code của mình viết bằng C#, nhưng engine Unity viết bằng C++. Mỗi `GameObject`, `Component`, `Material`… mình cầm trong tay chỉ là **vỏ C#** trỏ sang object thật bên C++. Hiểu điều này sẽ giải thích được rất nhiều hiện tượng “lạ” ở các phần sau.', 'key'));
C.push(...image('two_worlds', 620, 'Hình 1. Mỗi UnityEngine.Object gồm vỏ C# và object thật bên C++'));

C.push(...item({
  title: '1.1 Lưu lại kết quả GetComponent', level: 'co_ban',
  bad: `void Update()
{
    GetComponent<Rigidbody>().AddForce(Vector3.up); // tìm lại mỗi frame
}`,
  truth: '`GetComponent` duyệt danh sách component trên GameObject và phải đi từ C# sang C++ rồi quay về. Gọi một lần thì rất rẻ, nhưng gọi trong `Update` của hàng trăm object thì chi phí cộng dồn.',
  effect: 'Tốn CPU vô ích mỗi frame. Code cũng khó đọc vì phụ thuộc ẩn được lặp lại khắp nơi.',
  good: `Rigidbody _rb;

void Awake() => _rb = GetComponent<Rigidbody>();

void FixedUpdate() => _rb.AddForce(Vector3.up); // lực vật lý nên đặt ở FixedUpdate`,
}));
C.push(...item({
  title: '1.2 So sánh tag bằng CompareTag', level: 'co_ban',
  bad: `if (other.tag == "Enemy") { ... }`,
  truth: 'Mỗi lần đọc thuộc tính `.tag`, Unity lấy chuỗi từ C++ và tạo **một string mới** bên C#.',
  effect: 'Tạo rác bộ nhớ trong mỗi lần va chạm. Gọi nhiều thì Garbage Collector phải chạy thường xuyên hơn (xem Phần 4).',
  good: `if (other.CompareTag("Enemy")) { ... } // so sánh bên C++, không tạo string`,
}));
C.push(...item({
  title: '1.3 Mỗi lần gọi API là một lần qua ranh giới C# ⇄ C++', level: 'trung_binh',
  bad: `transform.position = new Vector3(transform.position.x + 1, transform.position.y, transform.position.z);`,
  truth: [
    'Mỗi `UnityEngine.Object` bên C# chứa một con trỏ (`m_CachedPtr`) tới object thật bên C++. `transform.position` không phải field mà là **property**: mỗi lần đọc hay ghi là một lần gọi xuống engine.',
    'Dòng trên đọc `transform.position` **3 lần** và ghi 1 lần, tức 4 lần qua ranh giới.',
  ],
  effect: 'Trong vòng lặp lớn (hàng trăm object, mỗi frame), chi phí này đáng kể hơn nhiều người nghĩ.',
  good: `var pos = transform.position;     // đọc 1 lần
pos.x += 1;
transform.position = pos;         // ghi 1 lần

// Đặt cả vị trí và góc quay: dùng 1 lệnh thay vì 2
transform.SetPositionAndRotation(pos, rot);`,
}));
C.push(...item({
  title: '1.4 Họ hàm Find và Camera.main', level: 'trung_binh',
  bad: `void Update()
{
    var player = FindObjectOfType<Player>();         // duyệt toàn bộ scene
    var cam = Camera.main;
    var hpBar = GetComponentInChildren<HpBar>();     // duyệt cả cây con
}`,
  truth: [
    '`GetComponentInChildren` duyệt toàn bộ cây con. `FindObjectOfType` và `GameObject.Find` duyệt **toàn bộ scene**. Thời gian tăng theo số object.',
    '`Camera.main` ở các bản Unity cũ mỗi lần gọi là một lần tìm object có tag “MainCamera”. **Từ Unity 2020.2**, Unity đã tự lưu sẵn kết quả, nên gọi thoải mái hơn.',
  ],
  effect: 'Gọi trong `Update` làm game chậm dần khi scene có nhiều object. Đây là lỗi hay gặp ở các project lớn dần theo thời gian.',
  good: `[SerializeField] Player player;   // kéo thả trong Inspector, hoặc
Player _player;

void Awake() => _player = FindAnyObjectByType<Player>(); // tìm 1 lần`,
  notes: [['Ghi chú phiên bản', [
    '`FindObjectOfType` bị đánh dấu obsolete từ Unity 2023.1 (tức là cả Unity 6). Dùng `FindFirstObjectByType` (cần đúng object đầu tiên) hoặc `FindAnyObjectByType` (nhanh hơn, lấy bất kỳ). Hai hàm này đã có từ Unity 2022.2 nên dùng được trên 2022.3.',
    'Bài học rộng hơn: **lời khuyên tối ưu có “hạn sử dụng”**. Hiểu nguyên lý thì mới biết khi nào một lời khuyên cũ (như “đừng gọi Camera.main”) đã hết đúng.',
  ]]],
}));
C.push(...item({
  title: '1.5 Fake null: vì sao `?.` không an toàn với object Unity', level: 'nang_cao',
  bad: `Destroy(enemy.gameObject);
// ... ở frame sau
enemy?.Attack();                 // VẪN GỌI → MissingReferenceException
var target = enemy ?? backup;    // trả về enemy đã chết, không phải backup
if (enemy is null) { ... }       // false, dù enemy đã bị Destroy`,
  truth: [
    '`Destroy` chỉ giải phóng **object bên C++**. Vỏ C# vẫn còn đó cho tới khi không còn ai giữ tham chiếu và GC dọn đi.',
    'Unity **định nghĩa lại** toán tử `==`, `!=` và phép ép sang `bool` cho `UnityEngine.Object`. Các toán tử này kiểm tra cả phía C++, nên object đã Destroy được coi là null. Hiện tượng này gọi là “fake null”.',
    'Nhưng `?.`, `??`, `??=` và `is null` là **cú pháp của ngôn ngữ C#**, không thể bị định nghĩa lại. Chúng chỉ kiểm tra vỏ C#, và vỏ C# vẫn còn.',
  ],
  effect: [
    'Lỗi `MissingReferenceException` xuất hiện ở chỗ tưởng đã kiểm tra null cẩn thận.',
    'Ngược lại, `Destroy` cũng **không có hiệu lực ngay**: object chỉ bị xoá ở cuối frame. Trong cùng frame, `obj == null` vẫn là false và `transform.childCount` vẫn đếm object đó.',
  ],
  good: `if (enemy != null) enemy.Attack();   // dùng != của Unity
if (enemy) enemy.Attack();           // hoặc ép sang bool

// Với class C# thường (không kế thừa UnityEngine.Object) thì ?. vẫn dùng bình thường`,
  notes: [['Mẹo với Rider', 'Rider (plugin Unity) cảnh báo sẵn lỗi này: “Possible unintended bypass of lifetime check of underlying Unity engine object”. Đừng tắt cảnh báo đó.', 'info']],
}));
C.push(...item({
  title: '1.6 GetComponent “không tìm thấy” vẫn tạo rác trong Editor', level: 'nang_cao',
  bad: `var shield = GetComponent<Shield>();  // nhiều object không có Shield
if (shield != null) shield.Block();`,
  truth: 'Trong Editor, khi `GetComponent` không tìm thấy, Unity không trả về `null` thật mà trả về một object “giả null” chứa thông tin để báo lỗi dễ hiểu hơn nếu bạn lỡ dùng nó. Tạo object đó tức là **tạo rác bộ nhớ**. Bản build không làm việc này.',
  effect: 'Profiler trong Editor hiện GC Alloc ở những chỗ mà bản build không hề có. Dễ tối ưu nhầm chỗ, hoặc ngược lại, bỏ sót chỗ thật.',
  good: `if (TryGetComponent(out Shield shield))   // không tạo rác, kể cả trong Editor
    shield.Block();`,
}));
C.push(...item({
  title: '1.7 Hàm Update rỗng vẫn tốn chi phí', level: 'nang_cao',
  bad: `public class Coin : MonoBehaviour
{
    void Start() { }
    void Update() { }   // Unity tạo sẵn khi tạo script, chưa xoá
}`,
  truth: [
    '`Update`, `Start`… không phải hàm ảo (`virtual`). Khi load script, Unity dùng reflection tìm xem class có hàm tên `Update` hay không, rồi đưa component vào danh sách cần gọi.',
    'Mỗi frame, engine C++ duyệt danh sách đó và **gọi sang C# từng hàm một**. Hàm rỗng vẫn tốn chi phí của lần gọi qua ranh giới.',
  ],
  effect: 'Một nghìn đồng xu, mỗi cái có `Update` rỗng, vẫn tạo ra một nghìn lần gọi C++ → C# mỗi frame mà không làm gì cả.',
  good: `// 1. Xoá Update/Start rỗng.
// 2. Với hàng nghìn object giống nhau: 1 manager gọi vòng lặp C# thuần.
public class CoinManager : MonoBehaviour
{
    readonly List<Coin> _coins = new();
    public void Register(Coin c) => _coins.Add(c);
    public void Unregister(Coin c) => _coins.Remove(c);

    void Update()
    {
        float dt = Time.deltaTime;
        for (int i = 0; i < _coins.Count; i++) _coins[i].Tick(dt); // gọi C# → C#, rẻ
    }
}`,
}));
C.push(...deep('1.8 Phân tích sâu: Unity kiểm tra “còn sống” thế nào', [
  'Bên trong, `UnityEngine.Object` giữ một con trỏ `m_CachedPtr` tới object C++. Toán tử `==` của Unity gọi một hàm so sánh: nếu một bên là `null` thì nó kiểm tra con trỏ đó còn trỏ tới object sống hay không. Đây là lý do mỗi lần so sánh `== null` với object Unity tốn hơn so sánh tham chiếu thường một chút.',
  'Khi `Destroy` chạy ở cuối frame, engine giải phóng object C++ và đặt con trỏ về 0. Vỏ C# chỉ biến mất khi **không còn ai giữ tham chiếu** tới nó. Những chỗ hay vô tình giữ lại:',
  [
    'Một `static` field hoặc một Singleton trỏ tới object của scene cũ: chuyển scene xong vẫn giữ vỏ C# và **mọi thứ vỏ đó tham chiếu** (list, texture, data…), GC không dọn được. Đây là một dạng rò rỉ bộ nhớ.',
    'Event C# không huỷ đăng ký: delegate giữ tham chiếu tới object đã Destroy (xem demo 08).',
    'Cache lười bằng `??=`: `_rb ??= GetComponent<Rigidbody>();` không bao giờ lấy lại khi `_rb` đã thành fake null.',
  ],
  'Fake null không chỉ xảy ra khi Destroy: **unload scene**, `AssetBundle.Unload(true)`, `Resources.UnloadUnusedAssets` cũng biến các tham chiếu cũ thành fake null.',
]));
C.push(...seeAlso('1.9 Cùng cơ chế C# ⇄ C++ ở những chỗ khác trong Unity', [
  ['`mesh.vertices`, `mesh.triangles`, `mesh.uv`', 'Mỗi lần đọc: copy **toàn bộ** mảng từ C++ sang một mảng C# mới. Viết `mesh.vertices[i]` trong vòng lặp là copy N lần.', 'Đọc 1 lần vào biến, hoặc `mesh.GetVertices(list)`'],
  ['`renderer.materials`', 'Trả về mảng mới và **nhân bản mọi material** của renderer.', '`sharedMaterials` hoặc `GetSharedMaterials(list)`'],
  ['`Input.touches`', 'Tạo mảng `Touch[]` mới mỗi lần đọc.', '`Input.touchCount` + `Input.GetTouch(i)`'],
  ['`GetComponentsInChildren<T>()`', 'Duyệt cả cây con và tạo mảng mới.', 'Overload nhận `List<T>` dùng lại; hoặc kéo thả reference'],
  ['`gameObject.name`, `.tag`', 'Mỗi lần đọc tạo một string mới từ dữ liệu C++.', 'Đọc 1 lần nếu dùng nhiều; `CompareTag` để so tag'],
  ['`Camera.main`', 'Trước 2020.2: tìm theo tag mỗi lần. Từ 2020.2: Unity tự cache.', 'Bản mới gọi thoải mái; bản cũ thì lưu lại'],
  ['`transform.position` trên object có nhiều cha', 'Vị trí thế giới được tính từ chuỗi cha. Ghi vào nó cũng đánh dấu cả cây con là đã đổi.', '`localPosition` khi đủ dùng; giữ hierarchy nông cho object di chuyển nhiều'],
]));
C.push(...demo({
  title: 'Fake null và Destroy có hiệu lực trễ', scene: '01_FakeNull', slide: 10, script: 'Scripts/01_FakeNull/FakeNullDemo.cs',
  goal: 'cho cả phòng thấy tận mắt `==` và `?.` cho kết quả khác nhau trên cùng một object.',
  steps: [
    'Mở scene, bấm Play. Bên phải có khối đỏ (Enemy) và khối xanh (Backup).',
    'Hỏi khán giả: “Sau khi Destroy, `enemy is null` là True hay False?”. Sau đó bấm **1. Destroy Enemy rồi kiểm tra bằng 5 cách**.',
    'Đọc log từng dòng: cùng frame `== null` vẫn False và số con vẫn còn; frame sau `==` là True nhưng `is null` và `ReferenceEquals` là False; `enemy?.Attack()` vẫn chạy và ném `MissingReferenceException`; `??` trả về enemy đã chết.',
    'Bấm **2. GetComponent trên object không có component**: trong Editor `is null` ra False (object giả null), `TryGetComponent` thì không.',
    'Bấm **Tạo lại Enemy** nếu muốn chạy lại.',
  ],
  expect: ['Một object, năm cách kiểm tra, hai kết quả khác nhau. Chốt câu: “Với object Unity, chỉ tin `==` và `if (obj)`.”'],
}));
C.push(...demo({
  title: 'Đo chi phí qua ranh giới C# ⇄ C++', scene: '02_NativeCost', slide: 12, script: 'Scripts/02_NativeCost/NativeCostDemo.cs',
  goal: 'cho số liệu thật (ms và KB) của các cặp code quen thuộc, và chi phí của 10.000 hàm `Update` rỗng.',
  steps: [
    'Bấm Play. Mục **A**: bấm lần lượt 3 nút so sánh. Mỗi nút chạy 100.000 lần cho cả hai cách và ghi kết quả vào bảng.',
    'Chỉ vào cặp `tag ==` và `CompareTag`: thời gian chênh ít, nhưng `tag ==` tạo hàng MB rác.',
    'Mục **B**: bấm **GameObject.Find vs FindAnyObjectByType**, rồi **+5.000 object vào scene**, bấm lại: thời gian Find tăng theo số object.',
    'Mục **C**: chọn **Update rỗng** (10.000 object) rồi **1 Manager gọi Tick()**, so sánh Frame time và Main Thread. Có thể mở Profiler, tìm `BehaviourUpdate`.',
  ],
  expect: ['GetComponent và đọc position nhiều lần chậm hơn rõ rệt. `tag ==` tạo rác, `CompareTag` không. Update rỗng tốn thời gian thật, manager rẻ hơn.', 'Số liệu tuyệt đối khác nhau giữa các máy; điều cần nói là **tỉ lệ**.'],
}));

// ---- Phần 2 ----
C.push(H1('Phần 2. Một frame trong Unity chạy những gì (Player Loop)'));
C.push(...callout('Ý chính của phần', 'Unity không “gọi Update rồi vẽ”. Mỗi frame là một chuỗi bước cố định gọi là **Player Loop**. Biết code của mình (Update, coroutine, await, vật lý) chạy ở bước nào thì sẽ giải thích được phần lớn lỗi về thứ tự và thời gian.', 'key'));
C.push(...image('player_loop', 620, 'Hình 2. Các bước chính trong một frame và chỗ coroutine được chạy tiếp'));

C.push(...item({
  title: '2.1 Thứ tự vòng đời: Awake, OnEnable, Start', level: 'co_ban',
  extra: [...table(['Hàm', 'Khi nào chạy', 'Chạy lại?', 'Điều kiện'], [
    ['`Awake`', 'Khi object được tạo / scene load', 'Không, 1 lần duy nhất', 'GameObject đang bật. **Chạy cả khi component bị tắt**'],
    ['`OnEnable`', 'Ngay sau Awake, và mỗi lần được bật lại', '**Có**, mỗi lần SetActive(true) / enabled = true', 'Cả GameObject và component đều bật'],
    ['`Start`', 'Trước Update đầu tiên của component', 'Không', 'Component phải đang bật'],
    ['`OnDisable`', 'Mỗi lần bị tắt, và trước OnDestroy', 'Có', '-'],
    ['`OnDestroy`', 'Khi bị Destroy hoặc scene bị unload', 'Không', 'Chỉ khi object từng được bật (đã chạy Awake)'],
  ], [16, 30, 26, 28])],
  good: `void OnEnable()  => GameEvents.CoinChanged += Refresh;   // đăng ký khi bật
void OnDisable() => GameEvents.CoinChanged -= Refresh;   // huỷ khi tắt → không bị đăng ký trùng`,
  notes: [['Lỗi hay gặp', 'Đăng ký event trong `OnEnable` nhưng huỷ trong `OnDestroy`. Panel bật/tắt 3 lần → hàm `Refresh` bị gọi 3 lần cho mỗi sự kiện.']],
}));
C.push(...item({
  title: '2.2 Thứ tự Awake giữa các script không được đảm bảo', level: 'co_ban',
  bad: `// GameManager.cs
void Awake() => Instance = this;

// Hud.cs
void Awake() => GameManager.Instance.OnScore += Show; // đôi khi Instance còn null`,
  truth: 'Unity không hứa script nào chạy `Awake` trước script nào, nếu không được cấu hình. Thứ tự có thể khác giữa các máy, giữa Editor và bản build, hoặc đổi sau khi thêm object mới vào scene.',
  effect: 'Lỗi kiểu “máy tôi chạy được, máy bạn lỗi”, hoặc chỉ lỗi trên bản build.',
  good: `// Cách 1: chỉ khởi tạo bản thân trong Awake, lấy object khác trong Start
void Start() => GameManager.Instance.OnScore += Show;

// Cách 2: chỉ định thứ tự rõ ràng
[DefaultExecutionOrder(-100)]
public class GameManager : MonoBehaviour { ... }

// Cách 3 (tốt nhất cho hệ thống lớn): một chỗ gọi Initialize() theo thứ tự mong muốn`,
}));
C.push(...item({
  title: '2.3 Coroutine dừng khi nào', level: 'trung_binh',
  extra: [...table(['Hành động', 'Coroutine', 'Ghi chú'], [
    ['`enabled = false` (tắt script)', '**Vẫn chạy tiếp**', 'Chỉ Update/LateUpdate… ngừng được gọi'],
    ['`gameObject.SetActive(false)`', 'Dừng hẳn', 'Bật lại **không** tự chạy tiếp, phải Start lại'],
    ['`Destroy(gameObject)`', 'Dừng', '-'],
    ['`StopCoroutine` / `StopAllCoroutines`', 'Dừng', 'Chỉ dừng coroutine do chính MonoBehaviour đó chạy'],
  ], [36, 22, 42])],
  truth: 'Coroutine thuộc về **MonoBehaviour đã gọi** `StartCoroutine`, không thuộc về object chứa hàm `IEnumerator`. Ví dụ `GameManager.Instance.StartCoroutine(panel.Fade())` sẽ tiếp tục chạy kể cả khi panel đã bị tắt.',
  bad: `IEnumerator Blink()
{
    while (true)
    {
        Toggle();
        yield return new WaitForSeconds(0.5f);   // tạo object mới mỗi vòng lặp
    }
}`,
  good: `static readonly WaitForSeconds HalfSecond = new(0.5f);   // tạo 1 lần, dùng lại

IEnumerator Blink()
{
    while (true)
    {
        Toggle();
        yield return HalfSecond;
    }
}`,
}));
C.push(...item({
  title: '2.4 Time.timeScale = 0 thì cái gì dừng, cái gì không', level: 'trung_binh',
  extra: [...table(['Thứ', 'Khi timeScale = 0', 'Cách cho chạy trong lúc pause'], [
    ['`Update`, `LateUpdate`', '**Vẫn được gọi**, nhưng `Time.deltaTime` = 0', 'Dùng `Time.unscaledDeltaTime`'],
    ['`FixedUpdate` và vật lý', 'Ngừng hẳn', '-'],
    ['`WaitForSeconds`', 'Đứng yên mãi', 'Dùng `WaitForSecondsRealtime`'],
    ['Animator', 'Đứng yên', 'Đặt Update Mode = **Unscaled Time**'],
    ['DOTween', 'Đứng yên', '`.SetUpdate(true)` trên tween'],
    ['`Task.Delay`', 'Vẫn chạy (theo thời gian thật)', 'Cẩn thận khi dùng cho logic game'],
  ], [26, 38, 36])],
  effect: 'Lỗi “menu pause bị đơ”: popup pause dùng `WaitForSeconds` hoặc Animator mặc định nên không chạy được animation mở, nút không phản hồi.',
}));
C.push(...item({
  title: '2.5 FixedUpdate có thể chạy 0 lần hoặc nhiều lần mỗi frame', level: 'trung_binh',
  extra: image('fixed_update', 620, 'Hình 3. Với fixedDeltaTime = 0.02 s, số lần FixedUpdate trong mỗi frame thay đổi theo tốc độ frame'),
  bad: `void FixedUpdate()
{
    if (Input.GetKeyDown(KeyCode.Space)) Jump();   // có lúc bấm mà không nhảy
}`,
  truth: '`GetKeyDown` chỉ đúng trong **đúng frame** phím được bấm. Nếu frame đó không có lần `FixedUpdate` nào (frame nhanh, như F1 và F3 trong hình), lần bấm bị mất.',
  good: `bool _jumpRequested;

void Update()
{
    if (Input.GetKeyDown(KeyCode.Space)) _jumpRequested = true;   // đọc input ở Update
}

void FixedUpdate()
{
    if (_jumpRequested) { Jump(); _jumpRequested = false; }      // xử lý vật lý ở FixedUpdate
}`,
}));
C.push(...item({
  title: '2.6 Vòng xoáy khi máy chậm và Maximum Allowed Timestep', level: 'nang_cao',
  truth: [
    'Khi một frame chậm, Unity chạy **bù** nhiều lần `FixedUpdate` để vật lý theo kịp thời gian. Nhưng chạy bù lại làm frame đó càng chậm, frame sau phải bù nhiều hơn nữa. Đây là vòng xoáy làm game “đơ hẳn” trên máy yếu.',
    'Unity chặn vòng xoáy bằng **Maximum Allowed Timestep** (Project Settings → Time, mặc định khoảng 0.33 giây): mỗi frame không xử lý quá lượng thời gian vật lý này. Phần vượt quá bị bỏ, game “chậm lại” thay vì đứng hẳn.',
  ],
  effect: 'Code đặt logic nặng trong `FixedUpdate` (tìm đường, xử lý nhiều object) dễ kích hoạt vòng xoáy trên máy yếu.',
  good: `// Giữ FixedUpdate thật nhẹ: chỉ việc liên quan vật lý (lực, vận tốc, raycast cần thiết).
// Logic nặng chuyển sang Update, hoặc chia nhỏ qua nhiều frame.`,
}));
C.push(...item({
  title: '2.7 async/await: vẫn chạy sau khi object đã bị Destroy', level: 'nang_cao',
  bad: `async void Start()
{
    await Task.Delay(3000);
    transform.position = Vector3.zero;   // object có thể đã bị Destroy, hoặc đã thoát Play mode
}`,
  truth: [
    'Unity cài `UnitySynchronizationContext`, nên phần code sau `await` được đưa về chạy tiếp trên **main thread**. Đây là lý do có thể gọi API Unity sau `await`.',
    'Nhưng `Task` **không biết gì về vòng đời GameObject**. Object bị Destroy, scene đổi, thậm chí **thoát Play mode trong Editor**, Task vẫn chạy tiếp tới cuối.',
  ],
  effect: [
    '`MissingReferenceException` ngẫu nhiên khi chuyển scene.',
    'Trong Editor: log và logic vẫn chạy sau khi đã bấm Stop, có thể sửa cả asset.',
    'Lỗi trong `async void` không được bắt ở đâu cả, rất khó lần ra.',
  ],
  good: `// Unity 2022.2+ (dùng được trên 2022.3): huỷ Task theo vòng đời object
async void Start()
{
    try
    {
        await Task.Delay(3000, destroyCancellationToken);
        transform.position = Vector3.zero;
    }
    catch (OperationCanceledException) { }   // object bị Destroy → Task bị huỷ, không lỗi
}

// Unity 6: Awaitable chạy trên main thread, tái sử dụng bộ nhớ, tôn trọng vòng đời
async Awaitable Start()
{
    await Awaitable.WaitForSecondsAsync(3f, destroyCancellationToken);
    transform.position = Vector3.zero;
}`,
  notes: [['Ghi chú phiên bản', [
    '`destroyCancellationToken`: có từ Unity 2022.2.',
    '`Awaitable`: có từ Unity 2023.1, tức là dùng được trên Unity 6 nhưng **không có trên 2022.3**. Trên 2022.3 có thể dùng thư viện **UniTask**.',
  ]]],
}));
C.push(...item({
  title: '2.8 Tự chèn bước vào Player Loop', level: 'nang_cao',
  truth: 'Player Loop không phải hộp đen: có thể đọc và sửa bằng API `UnityEngine.LowLevel.PlayerLoop`. Thư viện **UniTask** chính là chèn các bước riêng vào Player Loop để chạy `await` không cần MonoBehaviour.',
  good: `using System.Collections.Generic;
using UnityEngine;
using UnityEngine.LowLevel;
using UnityEngine.PlayerLoop;

static class GameTick
{
    struct GameTickStep { }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    static void Install()
    {
        var root = PlayerLoop.GetCurrentPlayerLoop();
        for (int i = 0; i < root.subSystemList.Length; i++)
        {
            if (root.subSystemList[i].type != typeof(Update)) continue;
            var list = new List<PlayerLoopSystem>(root.subSystemList[i].subSystemList);
            list.Insert(0, new PlayerLoopSystem { type = typeof(GameTickStep), updateDelegate = Tick });
            root.subSystemList[i].subSystemList = list.ToArray();
        }
        PlayerLoop.SetPlayerLoop(root);
    }

    static void Tick() { /* chạy mỗi frame, trước Update của mọi MonoBehaviour */ }
}`,
  notes: [['Khi nào nên dùng', 'Hiếm khi cần trong game thường. Mục này chủ yếu để hiểu UniTask và các thư viện tương tự hoạt động thế nào. Nếu dùng thật, cần xử lý trường hợp tắt Domain Reload (Phần 6) để không bị chèn trùng.', 'info']],
}));
C.push(...deep('2.9 Phân tích sâu: thứ tự đầy đủ trong một frame', [
  'Bản rút gọn từ trang “Order of execution for event functions” của Unity:',
  [
    '**Đầu frame:** cập nhật thời gian, xử lý sự kiện input từ hệ điều hành.',
    '**Vòng vật lý (0..n lần):** `FixedUpdate` → cập nhật animation (Animator ở chế độ Animate Physics) → mô phỏng vật lý → `OnTriggerXXX` / `OnCollisionXXX` → coroutine `yield WaitForFixedUpdate`.',
    '**Logic game:** sự kiện chuột (`OnMouseXXX`) → `Update` → coroutine `yield null`, `WaitForSeconds` chạy tiếp → cập nhật Animator (chế độ Normal) → `LateUpdate`.',
    '**Vẽ:** culling, render camera, `OnGUI` (có thể gọi nhiều lần mỗi frame).',
    '**Cuối frame:** `yield WaitForEndOfFrame`, các object bị `Destroy` được xoá thật.',
  ],
  'Hệ quả thực tế: **camera đi theo nhân vật bị giật** thường do nhân vật di chuyển bằng vật lý (50 lần/giây) còn camera cập nhật theo frame. Cách sửa: bật **Interpolate** trên Rigidbody, hoặc cho camera đi theo trong `LateUpdate`.',
  'Bên trong `FixedUpdate`, `Time.deltaTime` tự trả về giá trị của `fixedDeltaTime`, nên cùng một hàm di chuyển dùng được ở cả hai nơi.',
]));
C.push(...seeAlso('2.10 Thứ gì chạy theo thời gian nào trong Unity', [
  ['Animator', 'Update Mode = Normal: theo `deltaTime`; Animate Physics: theo bước vật lý; Unscaled Time: bỏ qua timeScale.', 'UI animation trong menu pause: Unscaled Time'],
  ['ParticleSystem', 'Mặc định theo timeScale.', 'Hiệu ứng UI lúc pause: bật `useUnscaledTime` trong module Main'],
  ['AudioSource', '**Không** bị timeScale ảnh hưởng: pause game nhạc vẫn chạy.', 'Tự pause bằng `AudioListener.pause` hoặc `AudioSource.Pause`'],
  ['`Invoke` / `InvokeRepeating`', 'Đếm theo thời gian có scale, gọi hàm bằng **tên chuỗi** (reflection).', 'Coroutine/async có huỷ rõ ràng; tránh chuỗi tên hàm'],
  ['Rigidbody', 'Chỉ di chuyển trong bước vật lý.', 'Bật Interpolate cho object camera bám theo'],
  ['DOTween / tween library', 'Mặc định theo timeScale.', '`.SetUpdate(true)` cho tween UI lúc pause'],
]));
C.push(...demo({
  title: 'FixedUpdate, input bị mất và timeScale', scene: '03_PlayerLoop', slide: 18, script: 'Scripts/03_PlayerLoop/PlayerLoopDemo.cs',
  goal: 'cho thấy FixedUpdate chạy 0 hoặc nhiều lần mỗi frame, hệ quả với input, và cái gì dừng khi timeScale = 0.',
  steps: [
    'Bấm Play, chọn Target FPS **Không giới hạn**. Chỉ vào dòng “Số frame có 0 lần”: con số tăng rất nhanh.',
    'Bấm **Frame chậm 100 ms**: log ghi frame sau chạy khoảng 5 lần FixedUpdate. Bấm **Frame chậm 1000 ms**: chỉ khoảng 17 lần, không phải 50, vì Maximum Allowed Timestep chặn lại.',
    'Mục **B**: bấm **Tự bấm 50 lần**. So sánh tỉ lệ bắt được nút giữa “Đọc trong FixedUpdate” và “Đọc ở Update”. Đổi Target FPS sang 30 rồi thử lại: tỉ lệ sai gần 100% đúng.',
    'Mục **C**: bật **Pause game**. Update/giây vẫn còn, FixedUpdate/giây về 0, `WaitForSeconds` đứng, `WaitForSecondsRealtime` vẫn đếm. Khối đỏ dừng xoay, khối xanh vẫn xoay.',
  ],
  expect: ['Mọi người thấy FixedUpdate không gắn với frame, và lỗi “bấm mà không nhảy” chỉ xuất hiện khi FPS cao, nên rất khó tái hiện nếu không hiểu nguyên lý.'],
}));
C.push(...demo({
  title: 'Coroutine và async sống tới khi nào', scene: '04_Lifetime', slide: 20, script: 'Scripts/04_Lifetime/LifetimeWorker.cs',
  goal: 'cho thấy tắt script không dừng coroutine, Task không biết vòng đời object, và cách sửa bằng `destroyCancellationToken`.',
  steps: [
    'Bấm Play. Bốn dòng trạng thái đều ▲ đang chạy, trừ “Coroutine do object KHÁC chạy” (chưa bắt đầu).',
    'Bấm **Tắt script**: coroutine của Worker **vẫn chạy**. Bấm **Bật script** lại.',
    'Bấm **Object khác chạy coroutine của Worker**, rồi **Tắt GameObject**: coroutine của Worker dừng, coroutine do Demo chạy vẫn tiếp tục. Bấm **Bật GameObject**: coroutine của Worker **không tự chạy lại**.',
    'Bấm **Destroy Worker**: Task (async void) vẫn đếm; Awaitable dừng nhờ `destroyCancellationToken`. Lưu ý: vẫn đọc được số đếm vì vỏ C# còn (nối lại demo 01).',
    'Bấm Stop để thoát Play mode, mở Console: dòng “[Task] Vẫn chạy sau khi đã thoát Play mode” tiếp tục xuất hiện.',
  ],
  expect: ['Chốt: với async trong Unity luôn truyền `destroyCancellationToken` (hoặc dùng Awaitable / UniTask).'],
}));

// ---- Phần 3 ----
C.push(H1('Phần 3. Serialization: Unity lưu dữ liệu thế nào'));
C.push(...callout('Ý chính của phần', 'Mọi thứ trong Inspector, prefab, scene, ScriptableObject đều được Unity **serialize** (chuyển thành văn bản YAML) để lưu xuống file. Hiểu luật serialize sẽ giải thích lỗi mất dữ liệu, mất reference và “sửa code mà game không đổi”.', 'key'));

C.push(...item({
  title: '3.1 Giá trị trong Inspector luôn thắng giá trị trong code', level: 'co_ban',
  bad: `public class Player : MonoBehaviour
{
    public float speed = 5f;   // sửa thành 10f, lưu lại... nhân vật vẫn chạy tốc độ 5
}`,
  truth: [
    'Thứ tự khi load: Unity tạo object (lúc này `speed` = giá trị trong code), **sau đó ghi đè** bằng giá trị đã lưu trong prefab/scene.',
    'Giá trị trong code chỉ được dùng khi component **mới được thêm vào**, hoặc khi bấm **Reset** trong menu ba chấm của component.',
  ],
  effect: 'Đổi giá trị cân bằng game trong code nhưng prefab cũ vẫn giữ số cũ. Rất dễ tưởng code bị lỗi.',
  good: `// Đổi giá trị trong Inspector của prefab, hoặc
// đưa số liệu cân bằng ra ScriptableObject config dùng chung cho mọi prefab.`,
}));
C.push(...item({
  title: '3.2 Đổi tên field là mất dữ liệu', level: 'co_ban',
  bad: `public float spd;      // đổi tên thành moveSpeed → mọi giá trị đã gán trong Inspector về 0`,
  truth: 'File YAML lưu theo **tên field** (`spd: 7.5`). Đổi tên thì Unity không tìm thấy khoá cũ, field mới nhận giá trị mặc định.',
  good: `using UnityEngine.Serialization;

[FormerlySerializedAs("spd")]
public float moveSpeed;   // Unity đọc giá trị cũ từ khoá "spd"`,
  notes: [['Lưu ý', 'Giữ thuộc tính `FormerlySerializedAs` cho tới khi chắc chắn mọi prefab/scene đã được lưu lại với tên mới (mở và lưu lại, hoặc dùng menu Force Reserialize Assets).', 'info']],
}));
C.push(...item({
  title: '3.3 public, [SerializeField], [HideInInspector] và [NonSerialized]', level: 'trung_binh',
  extra: [...table(['Khai báo', 'Hiện trong Inspector', 'Được lưu xuống file', 'Code khác truy cập'], [
    ['`public int a;`', 'Có', 'Có', 'Có'],
    ['`[SerializeField] private int a;`', 'Có', 'Có', '**Không** (đóng gói tốt hơn)'],
    ['`[HideInInspector] public int a;`', 'Không', '**Vẫn có**', 'Có'],
    ['`[NonSerialized] public int a;`', 'Không', 'Không', 'Có'],
    ['`private int a;`', 'Không', 'Không', 'Không'],
    ['`public int A { get; set; }`', 'Không', 'Không (property không được serialize)', 'Có'],
  ], [34, 18, 26, 22])],
  notes: [['Bẫy thường gặp', '`[HideInInspector]` chỉ **ẩn** khỏi Inspector, giá trị vẫn được lưu. Sửa giá trị mặc định trong code sẽ không có tác dụng với object có sẵn (quay lại mục 3.1), và không có cách nào thấy được giá trị đó trong Inspector. Muốn không lưu thì dùng `[NonSerialized]`.']],
}));
C.push(...item({
  title: '3.4 Reference là GUID + fileID: vì sao bị “Missing”', level: 'trung_binh',
  extra: image('guid', 620, 'Hình 4. Prefab lưu reference bằng GUID của asset (nằm trong file .meta) và fileID của object bên trong asset'),
  truth: [
    'Mỗi asset có một file `.meta` chứa **GUID** (mã định danh duy nhất). Prefab/scene trỏ tới asset khác bằng cặp `guid` + `fileID`, **không** bằng đường dẫn hay tên file.',
    'Vì vậy đổi tên hoặc chuyển thư mục **bên trong Unity** thì không sao (file `.meta` đi theo). Còn chuyển file bằng Explorer mà quên `.meta`, hoặc quên commit `.meta` lên Git, thì Unity tạo GUID mới, và mọi reference cũ thành **Missing**.',
  ],
  good: `// Quy tắc:
// 1. Luôn di chuyển / đổi tên asset bên trong Unity (cửa sổ Project).
// 2. Luôn commit file .meta cùng với file asset.
// 3. Project Settings → Editor → Asset Serialization = Force Text (để đọc và merge được).`,
}));
C.push(...item({
  title: '3.5 Những thứ Unity serializer không làm được', level: 'nang_cao',
  bad: `[Serializable] public class Skill { public string name; }
[Serializable] public class FireSkill : Skill { public int damage; }

public class Hero : MonoBehaviour
{
    public List<Skill> skills = new() { new FireSkill { name = "Fire", damage = 10 } };
    // Sau khi lưu và load lại: phần tử thành Skill thường, mất damage
}`,
  truth: [
    '**Không lưu đa hình:** field kiểu `Skill` chỉ lưu đúng các field của `Skill`. Object kiểu con bị “cắt” thành kiểu cha.',
    '**Không lưu null cho class thường:** field kiểu class `[Serializable]` đang null, sau khi load lại thành **object rỗng**. Kiểm tra `if (data == null)` sẽ không bao giờ đúng.',
    '**Không lưu:** `Dictionary`, property, field `static`, `readonly`, interface, mảng nhiều chiều. Lồng nhau tối đa khoảng 10 cấp, nên cấu trúc vòng (A chứa B chứa A) không lưu được.',
  ],
  good: `// Đa hình và null: dùng [SerializeReference]
[SerializeReference] public List<Skill> skills = new();

// Dictionary: tự chuyển sang 2 list khi lưu
public class PriceTable : MonoBehaviour, ISerializationCallbackReceiver
{
    [SerializeField] List<string> keys = new();
    [SerializeField] List<int> values = new();
    public Dictionary<string, int> Prices = new();

    public void OnBeforeSerialize()
    {
        keys.Clear(); values.Clear();
        foreach (var kv in Prices) { keys.Add(kv.Key); values.Add(kv.Value); }
    }

    public void OnAfterDeserialize()
    {
        Prices = new Dictionary<string, int>();
        for (int i = 0; i < Mathf.Min(keys.Count, values.Count); i++) Prices[keys[i]] = values[i];
    }
}`,
  notes: [['Lưu ý', 'Inspector mặc định chưa có nút chọn kiểu con cho `[SerializeReference]`. Cần gán bằng code, viết custom drawer, hoặc dùng Odin Inspector.', 'info']],
}));
C.push(...item({
  title: '3.6 Sửa ScriptableObject khi đang Play là sửa luôn file asset', level: 'nang_cao',
  bad: `[CreateAssetMenu] public class PlayerConfig : ScriptableObject { public int startCoins = 100; }

public class Wallet : MonoBehaviour
{
    [SerializeField] PlayerConfig config;
    public void Earn(int v) => config.startCoins += v;   // dùng config như biến runtime
}`,
  truth: [
    'ScriptableObject là **asset**. Trong Editor, code đang sửa trực tiếp object asset trong bộ nhớ, nên khi thoát Play mode giá trị **không quay về**, và sẽ được ghi xuống file khi project được lưu.',
    'Trên bản build thì ngược lại: asset là chỉ đọc, mỗi lần mở game lại về giá trị gốc.',
  ],
  effect: 'Bug kinh điển “config tự đổi”: test vài lần trong Editor, `startCoins` đã thành 2500 và bị commit lên Git. Trong khi đó bản build lại chạy đúng, nên càng khó hiểu.',
  good: `// Cách 1: tách rõ dữ liệu cấu hình (chỉ đọc) và dữ liệu runtime
int _coins;
void Awake() => _coins = config.startCoins;

// Cách 2: cần sửa cả object config lúc chạy → làm việc trên bản sao
PlayerConfig _runtime;
void Awake() => _runtime = Instantiate(config);`,
}));
C.push(...deep('3.7 Phân tích sâu: prefab chỉ lưu phần khác biệt', [
  'Khi đặt một prefab vào scene, scene **không** lưu lại toàn bộ object. Nó chỉ lưu tham chiếu tới prefab (GUID) và một danh sách **override** (`m_Modifications`): field nào, giá trị nào khác với prefab gốc.',
  'Hệ quả:',
  [
    'Sửa prefab gốc thì mọi instance đổi theo, **trừ** những field đã bị override (Inspector tô đậm và có vạch xanh bên trái).',
    'Override ngoài ý muốn (lỡ kéo một giá trị) làm instance “không ăn” thay đổi của prefab gốc. Chuột phải field → **Revert** để bỏ.',
    'Prefab Variant cũng là một prefab chỉ lưu override so với prefab cha.',
  ],
  'Serializer chỉ lưu field thoả **đồng thời**: `public` hoặc `[SerializeField]`; không `static`, `const`, `readonly`; kiểu được hỗ trợ (kiểu nguyên thuỷ, enum, string, struct Unity như Vector3/Color, `UnityEngine.Object`, class/struct có `[Serializable]`, mảng hoặc `List<T>` của các kiểu trên).',
]));
C.push(...seeAlso('3.8 Những chỗ Unity lưu theo TÊN, đổi tên là hỏng', [
  ['`UnityEvent` (Button.onClick gán trong Inspector)', 'Lưu **tên hàm dạng chuỗi** + object đích. Đổi tên hàm: listener mất âm thầm, không lỗi compile.', 'Gán listener bằng code, hoặc rà lại Inspector sau khi đổi tên'],
  ['`[field: SerializeField]` trên auto-property', 'Tên lưu thật là `<Hp>k__BackingField`.', 'Đổi tên property phải dùng `[FormerlySerializedAs("<Hp>k__BackingField")]`'],
  ['Tham số và state của Animator', 'Code gọi bằng chuỗi; Animator đổi tên thì code vẫn compile.', 'Gom tên vào hằng số + `Animator.StringToHash`'],
  ['`Resources.Load("UI/Popup")`', 'Tìm theo đường dẫn chuỗi lúc chạy.', 'Kéo thả reference hoặc Addressables'],
  ['`SendMessage("Die")`, `Invoke("Spawn", 1f)`', 'Gọi hàm bằng tên qua reflection: chậm và vỡ khi đổi tên.', 'Gọi trực tiếp, event, coroutine'],
  ['`JsonUtility`', 'Dùng **đúng luật** của serializer Unity: không Dictionary, không property, không đa hình (trừ `[SerializeReference]`).', 'Cần linh hoạt hơn: Newtonsoft (xem Phần 6 về stripping)'],
]));
C.push(...demo({
  title: 'Nhìn tận mắt cách Unity lưu dữ liệu', scene: '05_Serialization', slide: 25, script: 'Scripts/05_Serialization/SerializationDemo.cs',
  goal: 'chứng minh Inspector thắng code, ScriptableObject bị ghi đè, serializer cắt kiểu con, và reference là GUID.',
  steps: [
    'Bấm Play. Mục **A**: speed trong code và trong prefab; `[HideInInspector]` vẫn giữ 42, `[NonSerialized]` về 0, dù cả hai đều được gán 42 lúc dựng scene.',
    'Mục **B**: bấm **+100 vào asset (sai)** vài lần, bấm Stop, chọn `Assets/_Talk/Data/PlayerConfig.asset`: giá trị không quay về 100. Play lại, bấm **+100 vào bản sao (đúng)**: asset không đổi. Cuối cùng bấm **Đặt lại asset = 100**.',
    'Mục **C**: `List<Skill>` thường trả về `Skill` (mất damage); `[SerializeReference]` giữ `FireSkill`. Field thường gán null thành object rỗng.',
    'Mục **D**: bấm **Mở Player.prefab dạng text** (mở bằng Rider/VS Code), chỉ dòng `m_Script` và `weapon` có `guid`. Bấm **Mở Sword.prefab.meta**: GUID trùng khớp.',
    'Ngoài Play mode: đổi `speed = 5f` thành `10f` trong `PlayerStats.cs`, quay lại Unity: prefab vẫn 5. Chuột phải component → **Reset**: lên 10.',
  ],
  expect: ['Mọi người thấy “Missing reference” và “sửa code không có tác dụng” đều có nguyên nhân rõ ràng.'],
}));

// ---- Phần 4 ----
C.push(H1('Phần 4. Bộ nhớ và Garbage Collector'));
C.push(...callout('Ý chính của phần', 'FPS trung bình 60 vẫn có thể giật. Thủ phạm thường là **Garbage Collector (GC)**: code tạo rác liên tục, đến lúc GC chạy dọn thì cả game dừng lại một nhịp. Muốn hết giật, phải biết những chỗ nào tạo rác, kể cả những chỗ nhìn code không thấy.', 'key'));

C.push(...item({
  title: '4.1 Ghép chuỗi trong Update', level: 'co_ban',
  bad: `void Update()
{
    scoreText.text = "Score: " + score;   // tạo string mới mỗi frame, kể cả khi điểm không đổi
}`,
  truth: '`string` trong C# là bất biến. Mỗi phép `+` hoặc `$"..."` tạo một string **mới** trên heap. 60 frame/giây × vài chục byte = rác tích tụ liên tục.',
  good: `int _shownScore = -1;

void Update()
{
    if (score == _shownScore) return;               // chỉ cập nhật khi giá trị đổi
    _shownScore = score;
    scoreText.SetText("Score: {0}", score);         // TextMeshPro: định dạng không tạo string
}`,
}));
C.push(...item({
  title: '4.2 Những chỗ tạo rác mà nhìn code không thấy', level: 'trung_binh',
  extra: table(['Đoạn code', 'Tạo rác?', 'Vì sao', 'Thay bằng'], [
    ['`foreach (var e in list)` với `List<T>`', 'Không', 'Enumerator của List là struct', '-'],
    ['`foreach` qua biến kiểu `IEnumerable<T>`', '**Có**', 'Enumerator bị boxing thành object', 'Dùng đúng kiểu `List<T>`, hoặc `for`'],
    ['Lambda dùng biến bên ngoài: `x => x.id == id`', '**Có**', 'Tạo object closure giữ biến `id`', 'Vòng lặp `for` thường'],
    ['Lambda không dùng biến ngoài', 'Không', 'Compiler tạo sẵn và dùng lại', '-'],
    ['LINQ: `.Where().ToList()`', '**Có**', 'Iterator, delegate, list mới', '`for` + list dùng lại'],
    ['`$"HP {hp}"`, `string.Format`', '**Có**', 'String mới, boxing tham số', '`TMP_Text.SetText`, `StringBuilder` dùng lại'],
    ['Hàm có tham số `params`', '**Có**', 'Tạo mảng mới mỗi lần gọi', 'Overload có số tham số cố định'],
    ['`new WaitForSeconds(1)` trong vòng lặp', '**Có**', 'Object mới mỗi lần', 'Tạo 1 lần, dùng lại'],
    ['`GetComponents<T>()`', '**Có**', 'Trả về mảng mới', '`GetComponents(List<T>)` với list dùng lại'],
    ['`Physics.RaycastAll`', '**Có**', 'Trả về mảng mới', '`Physics.RaycastNonAlloc` với mảng có sẵn'],
    ['`Debug.Log` trong bản build', '**Có**', 'String, stack trace', 'Bọc bằng `[Conditional]` (Phần 6)'],
  ], [32, 11, 27, 30]),
  notes: [['Cách tìm chỗ tạo rác', 'Mở Profiler → CPU Usage → bảng Hierarchy → sắp xếp theo cột **GC Alloc**. Bật **Call Stacks** cho GC.Alloc để biết chính xác dòng code nào. Nhớ đo trên **bản build Development** (xem mục 1.6 và Phần 6).', 'info']],
}));
C.push(...item({
  title: '4.3 GC của Unity hoạt động thế nào', level: 'nang_cao',
  extra: image('gc_heap', 620, 'Hình 5. Heap bị phân mảnh: tổng chỗ trống đủ nhưng không lỗ nào đủ lớn, nên heap phải phình ra'),
  truth: [
    'Unity dùng GC **Boehm**, khác với GC của .NET hiện đại:',
    '• **Không chia thế hệ:** mỗi lần dọn phải quét **toàn bộ** heap, không chỉ phần object mới tạo. Heap càng to, mỗi lần khựng càng lâu.',
    '• **Không dồn bộ nhớ:** object còn sống nằm yên tại chỗ, để lại các lỗ trống. Cần một khối lớn mà không lỗ nào vừa thì heap phải phình ra.',
    '• Heap đã phình thì **hiếm khi trả lại** bộ nhớ cho hệ điều hành. Một lần load dữ liệu lớn có thể giữ RAM cao suốt phiên chơi.',
  ],
  effect: 'Trên điện thoại, mỗi lần GC chạy có thể mất vài mili giây đến hàng chục mili giây. Với ngân sách 16,6 ms mỗi frame (60 FPS), chỉ một lần GC là đủ gây khựng thấy rõ.',
  good: `// 1. Giảm rác ở những đoạn chạy mỗi frame (bảng 4.2).
// 2. Bật Incremental GC (Project Settings → Player → Use incremental GC):
//    chia việc quét ra nhiều frame → bớt khựng.
//    Không giảm tổng lượng việc, không cứu được code tạo rác quá nhiều.
// 3. Chủ động dọn ở lúc người chơi không để ý (màn hình loading):
System.GC.Collect();`,
}));
C.push(...deep('4.4 Phân tích sâu: bộ nhớ managed và bộ nhớ native', [
  'Game Unity có hai vùng nhớ khác nhau:',
  [
    '**Managed heap (C#):** object C#, string, list, mảng… do GC quản lý. Đây là nơi rác sinh ra và GC chạy.',
    '**Native memory (C++):** texture, mesh, audio clip, material, dữ liệu của mỗi GameObject. GC **không** quản lý vùng này.',
  ],
  'Hệ quả: `new Texture2D(...)`, `Instantiate(material)`, `new Mesh()` mà không `Destroy` thì **rò rỉ native memory**. Profiler phần GC Alloc không hiện gì, nhưng RAM tăng dần tới khi game bị hệ điều hành tắt. Dùng **Memory Profiler** để thấy hai vùng này tách riêng.',
  'Chi phí thật của GC nằm ở **lúc dọn**, không phải lúc cấp phát. Cấp phát rất nhanh; dọn thì phải dừng game (stop-the-world) và quét toàn heap. Vì vậy mục tiêu là **giảm số lần dọn** bằng cách không tạo rác trong những đoạn chạy mỗi frame, không phải cấm `new` hoàn toàn.',
]));
C.push(...seeAlso('4.5 Những chỗ khác trong Unity hay tạo rác', [
  ['`StartCoroutine(Routine())`', 'Mỗi lần gọi tạo một object IEnumerator mới và một Coroutine.', 'Không bắt đầu coroutine mỗi frame; dùng một vòng lặp sống lâu'],
  ['`Physics.OverlapSphere`, `RaycastAll`', 'Trả về mảng mới.', 'Bản `NonAlloc` với mảng có sẵn'],
  ['`string.Split`, `Substring`, `ToString()`', 'Mỗi lần tạo string/mảng mới.', 'Cache kết quả; tránh làm trong Update'],
  ['`enum.ToString()`', 'Dùng reflection và tạo string mới.', 'Bảng tra `string[]` theo giá trị enum'],
  ['`OnGUI` (IMGUI)', 'Tạo rác mỗi lần gọi, có thể gọi nhiều lần mỗi frame.', 'Chỉ dùng cho tool/debug; UI game dùng uGUI hoặc UI Toolkit'],
  ['`JsonUtility.ToJson`, log debug', 'String lớn mỗi lần.', 'Chỉ lưu khi dữ liệu thay đổi; log có điều kiện'],
]));
C.push(...demo({
  title: 'Rác sinh ra từ đâu', scene: '06_GarbageCollector', slide: 29, script: 'Scripts/06_GarbageCollector/GcDemo.cs',
  goal: 'đo GC Alloc mỗi frame của 15 đoạn code quen thuộc, và thấy heap không co lại.',
  steps: [
    'Bấm Play với **Không làm gì (mốc)**, đợi 1–2 giây để có số mốc (IMGUI tự nó cũng tạo một ít rác).',
    'Chọn lần lượt: `"Score: " + i` → `$"HP {i}"` → LINQ → Lambda dùng biến ngoài. Mỗi lần nhìn dòng “Chênh lệch” và “Số lần GC đã chạy” tăng nhanh.',
    'Chọn các cặp đối chứng: `foreach List<T>` (0) và `foreach IEnumerable<T>` (có rác); Lambda không dùng biến ngoài (0); `CompareTag` (0) và `gameObject.tag` (có rác).',
    'Bấm **Cấp phát 64 MB** rồi **Bỏ đi + GC.Collect()**: Used giảm nhưng Heap size thường giữ nguyên.',
    'Mở Profiler → CPU → cột GC Alloc để chỉ chính xác hàm `GcDemo.Update`.',
  ],
  expect: ['Mọi người nhớ được các mẫu code tạo rác, và hiểu vì sao heap đã phình thì game giữ RAM cao.'],
}));

// ---- Phần 5 ----
C.push(H1('Phần 5. Rendering: những dòng code “vô hại”'));
C.push(...callout('Ý chính của phần', 'Một vài dòng code rất bình thường có thể âm thầm làm tăng draw call, rò rỉ bộ nhớ, hoặc làm cả Canvas phải dựng lại. Phần này cũng cho thấy **lời khuyên cũ có ngoại lệ** khi dùng URP.', 'key'));

C.push(...item({
  title: '5.1 renderer.material tạo bản sao material', level: 'co_ban',
  bad: `void Flash()
{
    GetComponent<Renderer>().material.color = Color.red;   // lần đầu gọi: tạo bản sao material
}`,
  truth: [
    'Lần đầu đọc `renderer.material`, Unity **tạo một bản sao** material riêng cho renderer đó (tên có hậu tố “(Instance)”). Bản sao này không tự bị xoá khi object bị Destroy.',
    '`renderer.sharedMaterial` thì trỏ thẳng vào asset dùng chung.',
  ],
  effect: [
    '**Rò rỉ bộ nhớ:** mỗi object tạo một material mới, không ai dọn.',
    'Trong Built-in Render Pipeline: object không còn dùng chung material nên **mất static/dynamic batching**, draw call tăng.',
    'Trong URP có SRP Batcher thì ảnh hưởng tới draw call nhỏ hơn (xem 5.3), nhưng vấn đề bộ nhớ vẫn còn.',
  ],
  good: `Material _mat;

void Awake() => _mat = GetComponent<Renderer>().material;   // tạo bản sao 1 lần, có chủ đích
void Flash() => _mat.color = Color.red;
void OnDestroy() => Destroy(_mat);                           // tự dọn bản sao

// Đổi cho TẤT CẢ object dùng chung material:
// renderer.sharedMaterial.color = ...  (cẩn thận: trong Editor là sửa luôn file asset!)`,
}));
C.push(...item({
  title: '5.2 Truyền tên dạng chuỗi cho Animator và Shader', level: 'trung_binh',
  bad: `animator.SetTrigger("Jump");
animator.SetFloat("Speed", v);
material.SetColor("_BaseColor", c);`,
  truth: 'Bên trong, Unity không dùng chuỗi mà dùng **số nguyên (hash/ID)**. Mỗi lần truyền chuỗi, Unity phải băm chuỗi thành số rồi mới tra cứu.',
  good: `static readonly int JumpHash  = Animator.StringToHash("Jump");
static readonly int SpeedHash = Animator.StringToHash("Speed");
static readonly int BaseColor = Shader.PropertyToID("_BaseColor");

animator.SetTrigger(JumpHash);
animator.SetFloat(SpeedHash, v);
material.SetColor(BaseColor, c);`,
  notes: [['Lợi ích phụ', 'Gõ sai tên chỉ cần sửa ở một chỗ. Dễ tìm mọi chỗ dùng một tham số Animator bằng Find Usages.', 'info']],
}));
C.push(...item({
  title: '5.3 SRP Batcher: lời khuyên cũ có ngoại lệ', level: 'nang_cao',
  extra: image('srp_batcher', 620, 'Hình 6. Trong URP, nhiều material cùng shader vẫn gộp được; MaterialPropertyBlock lại làm mất khả năng gộp'),
  truth: [
    'Lời khuyên quen thuộc: “Muốn đổi màu từng object mà không tạo material mới thì dùng **MaterialPropertyBlock**.” Lời khuyên này đúng với **Built-in Render Pipeline**.',
    'Trong **URP**, SRP Batcher gộp theo **shader variant**, không theo material. Dữ liệu của mỗi material được giữ sẵn trên GPU, nên nhiều material khác nhau dùng chung shader vẫn vẽ rất rẻ.',
    'Renderer có gắn MaterialPropertyBlock lại **không còn tương thích SRP Batcher**, bị vẽ theo đường chậm hơn.',
  ],
  effect: 'Áp dụng lời khuyên cũ vào project URP có thể làm game **chậm hơn**, đúng ngược với mục đích.',
  good: `// Trong URP:
// - Ưu tiên: nhiều material (hoặc material variant) dùng chung 1 shader.
// - Chỉ dùng MaterialPropertyBlock khi đã đo và thấy lợi
//   (ví dụ: hàng nghìn object giống hệt nhau vẽ bằng GPU Instancing).
// Kiểm tra: chọn shader trong Project → Inspector ghi "SRP Batcher: compatible".`,
  notes: [['Bài học', 'Mọi lời khuyên tối ưu đều có điều kiện đi kèm. Luôn **đo bằng Frame Debugger hoặc Profiler** trên đúng render pipeline của project trước khi áp dụng.', 'key']],
}));
C.push(...item({
  title: '5.4 UI: một thay đổi nhỏ làm cả Canvas phải dựng lại', level: 'nang_cao',
  extra: image('canvas', 620, 'Hình 7. Tách phần UI hay thay đổi ra Canvas riêng'),
  truth: [
    'Canvas gộp **toàn bộ** phần tử con thành ít lần vẽ nhất có thể. Khi **một** phần tử thay đổi (text, màu, vị trí, bật/tắt), cả Canvas bị đánh dấu “bẩn” và phải gộp lại từ đầu.',
    'Nếu có LayoutGroup hoặc ContentSizeFitter, Unity còn phải **tính lại layout**. LayoutGroup lồng nhau là chỗ tốn nhất.',
  ],
  effect: 'Đồng hồ đếm ngược hoặc text điểm số thay đổi mỗi frame trong cùng Canvas với cả màn hình UI lớn → tốn CPU mỗi frame dù “chỉ đổi một con số”.',
  good: `// 1. Tách Canvas: phần tĩnh (nền, khung) và phần động (điểm, đồng hồ) ở 2 Canvas khác nhau.
//    Canvas con lồng trong Canvas cha cũng được tính là một khối gộp riêng.
// 2. Tắt Raycast Target cho Image/Text không cần bấm.
// 3. Ẩn/hiện thường xuyên: tắt component Canvas thay vì SetActive(false).
canvas.enabled = false;   // giữ nguyên dữ liệu đã dựng, bật lại không phải dựng lại
// 4. Tránh LayoutGroup lồng nhau cho nội dung thay đổi liên tục.`,
}));
C.push(...deep('5.5 Phân tích sâu: một lần vẽ tốn gì ở phía CPU', [
  'Mỗi object hiện lên màn hình cần CPU chuẩn bị: chọn shader và trạng thái GPU (**SetPass call**), gửi dữ liệu material và vị trí, rồi ra lệnh vẽ (**draw call**). Đổi shader/trạng thái là phần đắt nhất. Các kỹ thuật gộp đều nhằm giảm số lần đổi:',
  [
    '**Static batching:** gộp sẵn mesh của object đánh dấu Static lúc build. Tốn RAM thêm, object không được di chuyển.',
    '**Dynamic batching:** gộp mesh nhỏ lúc chạy (giới hạn số đỉnh). Chủ yếu có ích ở Built-in RP.',
    '**SRP Batcher (URP/HDRP):** giữ dữ liệu material sẵn trên GPU, gộp theo **shader variant**. Nhiều material khác nhau cùng shader vẫn rẻ.',
    '**GPU Instancing:** vẽ nhiều bản của **cùng mesh + cùng material** trong một lệnh.',
    '**GPU Resident Drawer (Unity 6, URP):** để GPU tự quản lý phần lớn việc vẽ object tĩnh và động, giảm mạnh việc của CPU. Cần bật trong URP Asset và có điều kiện đi kèm.',
  ],
  'Vì vậy câu “ít material thì nhanh” chỉ đúng một phần. Câu đúng hơn: **ít shader variant và ít lần đổi trạng thái thì nhanh**. Luôn đo bằng Frame Debugger trước khi sửa.',
]));
C.push(...seeAlso('5.6 Cùng kiểu “lấy ra là nhân bản” và các lựa chọn rẻ hơn', [
  ['`meshFilter.mesh`', 'Giống `renderer.material`: lần đầu gọi tạo **bản sao mesh** riêng, phải tự Destroy.', '`sharedMesh` khi chỉ đọc'],
  ['`renderer.materials`', 'Nhân bản **tất cả** material của renderer, trả về mảng mới.', '`sharedMaterials`'],
  ['TextMeshPro `fontMaterial`', 'Tạo bản sao material font cho riêng text đó.', '`fontSharedMaterial` hoặc tạo sẵn Material Preset'],
  ['`SpriteRenderer.color`, UI `Graphic.color`', 'Là **màu đỉnh** (vertex color), không đụng tới material, nên **không** phá batching.', 'Ưu tiên đổi màu bằng thuộc tính này thay vì sửa material'],
  ['UI `Text`/`TMP` đổi nội dung', 'Dựng lại mesh chữ và đánh dấu Canvas cần gộp lại.', 'Chỉ gán khi giá trị đổi; tách Canvas động'],
]));
C.push(...demo({
  title: 'Bản sao material và SRP Batcher', scene: '07_Rendering', slide: 34, script: 'Scripts/07_Rendering/RenderingDemo.cs',
  goal: 'cho thấy `renderer.material` sinh material mới (rò rỉ nếu không dọn), và MaterialPropertyBlock làm object rơi khỏi SRP Batcher.',
  steps: [
    'Bấm Play. Dòng Render pipeline phải là `Talk_URP`. Bật Game view → **Stats**.',
    'Chọn **renderer.material (bản sao)**: “Material sinh thêm” = 100. Tắt **Destroy bản sao khi tạo lại**, bấm **Tạo lại lưới khối** vài lần: con số tăng mãi = rò rỉ.',
    'Mở Window → Analysis → **Frame Debugger** → Enable. Với chế độ bản sao (cùng shader URP/Lit), các khối vẫn nằm trong **SRP Batch**.',
    'Chọn **MaterialPropertyBlock**: trong Frame Debugger, các khối không còn được gộp, ô lý do ghi nguyên nhân.',
    'Tắt toggle **SRP Batcher** để thấy số SetPass trong Stats thay đổi.',
  ],
  expect: ['Chốt: trong URP, “dùng MaterialPropertyBlock cho rẻ” có thể làm chậm hơn. Đo trước khi tin.'],
}));

// ---- Phần 6 ----
C.push(H1('Phần 6. Editor khác bản build'));
C.push(...callout('Ý chính của phần', 'Editor chạy code theo cách khác hẳn điện thoại. Có lỗi **chỉ** xảy ra trên bản build, và có số liệu đo **chỉ** đúng trong Editor. Phần này cũng có một mẹo giúp vào Play mode gần như ngay lập tức.', 'key'));
C.push(...image('build', 620, 'Hình 8. Đường đi của code trong Editor (Mono) và trong bản build (IL2CPP)'));

C.push(...item({
  title: '6.1 Hành vi chỉ có trong Editor', level: 'trung_binh',
  truth: [
    'Editor thêm nhiều lớp kiểm tra và hỗ trợ debug: `GetComponent` tạo object “giả null” (mục 1.6), Inspector đang mở cũng tốn thời gian vẽ, script chạy bằng Mono thay vì IL2CPP.',
    '`Debug.Log` vẫn chạy trong bản build: tạo string, lấy stack trace, ghi ra log của thiết bị. Gọi trong `Update` có thể làm game chậm thấy rõ.',
  ],
  effect: 'Tối ưu theo số liệu đo trong Editor dễ sai hướng. Log quên xoá làm chậm bản phát hành.',
  good: `// Log chỉ tồn tại trong Editor và bản Development: lời gọi bị xoá khi build Release
public static class Log
{
    [System.Diagnostics.Conditional("UNITY_EDITOR"), System.Diagnostics.Conditional("DEVELOPMENT_BUILD")]
    public static void Info(string msg) => UnityEngine.Debug.Log(msg);
}
// Lưu ý: với [Conditional], cả biểu thức tham số (kể cả $"...") cũng bị xoá → không tạo rác.`,
  notes: [['Quy tắc đo hiệu năng', 'Đo trên **thiết bị thật**, bản **Development Build** có bật Autoconnect Profiler. Số liệu trong Editor chỉ dùng để so sánh tương đối.', 'info']],
}));
C.push(...item({
  title: '6.2 IL2CPP và Code Stripping: Editor chạy tốt, build lại crash', level: 'nang_cao',
  bad: `[Serializable]
public class SaveData { public int coins; public List<string> items; }

// Không có chỗ nào gọi new SaveData() trực tiếp
var data = JsonConvert.DeserializeObject<SaveData>(json);   // build: lỗi thiếu constructor/kiểu`,
  truth: [
    'Bản build mobile dùng **IL2CPP**: code C# được dịch sang C++ rồi biên dịch thành mã máy. Trước đó, bước **Managed Code Stripping** (UnityLinker) xoá những class và hàm mà nó “không thấy ai dùng” để giảm dung lượng.',
    'UnityLinker phân tích code tĩnh. Nó **không thấy** những thứ được dùng qua reflection: thư viện JSON tạo object qua reflection, `Type.GetType("TênClass")`, `AddComponent` theo tên, các class chỉ được tạo gián tiếp.',
  ],
  effect: 'Editor (Mono, không stripping) chạy hoàn hảo. Bản build báo lỗi thiếu kiểu, thiếu constructor, hoặc dữ liệu load ra toàn giá trị mặc định. Mức **Managed Stripping Level** càng cao, nguy cơ càng lớn.',
  good: `// Cách 1: đánh dấu giữ lại
using UnityEngine.Scripting;

[Preserve, Serializable]
public class SaveData { public int coins; public List<string> items; }

// Cách 2: file Assets/link.xml giữ lại theo namespace/assembly
<linker>
  <assembly fullname="Assembly-CSharp">
    <type fullname="Game.Save.*" preserve="all"/>
  </assembly>
</linker>`,
  notes: [['Mẹo kiểm tra sớm', 'Thường xuyên build thử với đúng mức Managed Stripping Level của bản phát hành (Project Settings → Player → Other Settings), đừng đợi tới ngày release mới build IL2CPP lần đầu.', 'warn']],
}));
C.push(...item({
  title: '6.3 Enter Play Mode Options: vào Play gần như ngay lập tức', level: 'nang_cao',
  truth: [
    'Mỗi lần bấm Play, mặc định Unity làm 2 việc tốn thời gian: **Domain Reload** (khởi động lại toàn bộ môi trường C#, reset mọi biến static) và **Scene Reload**. Project lớn có thể mất 5–15 giây cho mỗi lần.',
    'Có thể tắt Domain Reload: Project Settings → Editor → **Enter Play Mode Settings** (tên mục và giao diện hơi khác giữa 2022.3 và Unity 6). Vào Play nhanh hơn rất nhiều.',
    'Đổi lại: **biến** `static` **không tự reset** giữa các lần Play. Event static vẫn giữ các hàm đã đăng ký từ lần Play trước.',
  ],
  bad: `public static class GameStats
{
    public static int Kills;                    // lần Play thứ 2 bắt đầu với Kills của lần 1
    public static event System.Action OnKill;   // vẫn giữ handler từ lần Play trước → gọi vào object đã chết
}`,
  good: `public static class GameStats
{
    public static int Kills;
    public static event System.Action OnKill;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    static void ResetStatics()   // chạy đầu mỗi lần Play, kể cả khi tắt Domain Reload
    {
        Kills = 0;
        OnKill = null;
    }
}`,
  notes: [['Nên áp dụng thế nào', 'Thử trên nhánh riêng trước. Rà các class có field `static` (đặc biệt Singleton và event static) và thêm hàm reset. Đo thời gian vào Play trước và sau để có số liệu thuyết phục team.', 'info']],
}));
C.push(...deep('6.4 Phân tích sâu: vì sao bản build mobile khác Editor', [
  'Trong Editor, code chạy bằng **Mono có JIT** (biên dịch lúc chạy), kèm nhiều kiểm tra phục vụ debug. Trên iOS bắt buộc **IL2CPP**; trên Android, bản phát hành lên Google Play cần ARM64 nên thực tế cũng dùng IL2CPP.',
  'IL2CPP là **AOT** (biên dịch trước toàn bộ). Không có JIT nghĩa là:',
  [
    'Code sinh kiểu hoặc hàm lúc chạy (`System.Reflection.Emit`) không chạy được.',
    'Một số trường hợp generic chỉ được tạo qua reflection có thể thiếu code ở bản build, cần chỉ cho compiler biết trước.',
    'Bước stripping xoá những gì nó không thấy được dùng (mục 6.2).',
  ],
]));
C.push(...seeAlso('6.5 Những lỗi “Editor chạy, build hỏng” hay gặp khác', [
  ['`Shader.Find("Custom/Outline")`', 'Bản build chỉ chứa shader được material dùng tới hoặc nằm trong Always Included Shaders. Shader chỉ gọi bằng tên sẽ trả về **null**.', 'Tham chiếu shader qua material/field, hoặc thêm vào Always Included Shaders'],
  ['`AssetDatabase`, `EditorUtility`… trong script runtime', 'Namespace `UnityEditor` không có trong bản build: lỗi compile **chỉ lúc build**.', 'Bọc trong `#if UNITY_EDITOR` hoặc đặt file vào thư mục `Editor`'],
  ['Thư mục `Resources`', 'Mọi thứ trong đó đều vào bản build, kể cả không dùng; tăng dung lượng và thời gian khởi động.', 'Hạn chế; dùng reference trực tiếp hoặc Addressables'],
  ['Đường dẫn file', '`Application.dataPath` trên điện thoại chỉ đọc; đọc/ghi file phải dùng `persistentDataPath`.', 'Lưu dữ liệu vào `persistentDataPath`'],
  ['Input chuột', 'Trong Editor thử bằng chuột; trên điện thoại là touch, multi-touch.', 'Test trên máy thật; xử lý `touchCount`'],
]));
C.push(...demo({
  title: 'Enter Play Mode Options và biến static', scene: '08_EnterPlayMode', slide: 38, script: 'Scripts/08_EnterPlayMode/PlaySession.cs',
  goal: 'đo thời gian vào Play, và cho thấy biến/event static không reset khi tắt Domain Reload.',
  steps: [
    'Bấm Play 2 lần (Stop rồi Play) với Domain Reload đang bật: mọi số đều là 1. Ghi lại “Lần vào Play gần nhất mất … ms”.',
    'Bấm **Tắt Domain Reload**, Stop, rồi Play lại 2–3 lần. Thời gian vào Play giảm; “static KHÔNG reset” tăng 2, 3…; số handler Ping tăng dần.',
    'Bấm **Phát sự kiện Ping**: handler từ các lần Play trước ném lỗi vì trỏ tới object đã chết. Listener B (OnEnable/OnDisable) vẫn đúng.',
    'Bấm **Bật lại (mặc định)** trước khi sang demo khác.',
  ],
  expect: ['Có con số tiết kiệm thời gian của chính project, và thấy rõ cái giá phải trả: phải tự reset static.'],
}));

// ---- Kết ----
C.push(H1('Kết: Cheat sheet và đáp án quiz'));
C.push(H2('Đáp án quiz'));
C.push(...table(['#', 'Câu hỏi', 'Đáp án', 'Lý do ngắn'], [
  ['1', '`enabled = false` làm coroutine dừng', '**Sai**', 'Chỉ tắt GameObject hoặc Destroy mới dừng coroutine (2.3)'],
  ['2', '`timeScale = 0` làm Update ngừng', '**Sai**', 'Update vẫn chạy, chỉ deltaTime = 0 (2.4)'],
  ['3', 'Ngay sau Destroy, `obj == null` là true', '**Sai**', 'Destroy có hiệu lực ở cuối frame (1.5)'],
  ['4', 'Sửa giá trị mặc định trong code thì prefab đổi theo', '**Sai**', 'Giá trị đã lưu trong prefab thắng (3.1)'],
  ['5', 'FixedUpdate chạy đúng 1 lần mỗi frame', '**Sai**', 'Có thể 0 lần hoặc nhiều lần (2.5)'],
  ['6', '`target?.Attack()` an toàn với object đã Destroy', '**Sai**', '`?.` không dùng toán tử == của Unity (1.5)'],
  ['7', '`async void` tự dừng khi object bị Destroy', '**Sai**', 'Task không biết vòng đời object (2.7)'],
  ['8', 'Chạy tốt trong Editor thì chạy tốt trên điện thoại', '**Sai**', 'IL2CPP và code stripping (6.2)'],
], [6, 38, 12, 44]));
C.push(H2('Cheat sheet: Thường viết → Nên viết'));
C.push(...table(['Mức', 'Thường viết', 'Nên viết'], [
  ['CƠ BẢN', '`GetComponent<T>()` trong Update', 'Lấy 1 lần trong Awake, lưu vào field'],
  ['CƠ BẢN', '`other.tag == "Enemy"`', '`other.CompareTag("Enemy")`'],
  ['CƠ BẢN', '`new WaitForSeconds(x)` trong vòng lặp', 'Tạo 1 lần, dùng lại'],
  ['CƠ BẢN', '`text = "Score: " + score` mỗi frame', 'Chỉ cập nhật khi đổi; `SetText("Score: {0}", score)`'],
  ['CƠ BẢN', 'Đổi tên field đã serialize', '`[FormerlySerializedAs("tenCu")]`'],
  ['CƠ BẢN', '`renderer.material` để đổi màu', 'Lưu bản sao và Destroy khi xong, hoặc `sharedMaterial`'],
  ['TRUNG BÌNH', 'Đọc `transform.position` nhiều lần', 'Đọc 1 lần vào biến; `SetPositionAndRotation`'],
  ['TRUNG BÌNH', '`FindObjectOfType` / `Find` trong Update', 'Kéo thả reference, hoặc tìm 1 lần (`FindAnyObjectByType`)'],
  ['TRUNG BÌNH', 'Đăng ký event ở OnEnable, huỷ ở OnDestroy', 'Đăng ký OnEnable, huỷ **OnDisable**'],
  ['TRUNG BÌNH', '`GetKeyDown` trong FixedUpdate', 'Đọc input ở Update, xử lý ở FixedUpdate'],
  ['TRUNG BÌNH', '`[HideInInspector]` để “không lưu”', '`[NonSerialized]`'],
  ['TRUNG BÌNH', '`SetTrigger("Jump")`', '`Animator.StringToHash` lưu sẵn'],
  ['NÂNG CAO', '`obj?.Method()`, `obj ?? x` với object Unity', '`if (obj != null)` hoặc `if (obj)`'],
  ['NÂNG CAO', '`GetComponent` rồi kiểm tra null', '`TryGetComponent(out T c)`'],
  ['NÂNG CAO', '`async void` + `Task.Delay`', '`destroyCancellationToken`; Unity 6: `Awaitable`; 2022.3: UniTask'],
  ['NÂNG CAO', 'Dùng ScriptableObject làm biến runtime', 'Copy giá trị ra, hoặc `Instantiate(config)`'],
  ['NÂNG CAO', 'Class đa hình trong list `[Serializable]`', '`[SerializeReference]`'],
  ['NÂNG CAO', 'MaterialPropertyBlock trong URP', 'Nhiều material chung shader (SRP Batcher)'],
  ['NÂNG CAO', 'Mọi UI chung một Canvas', 'Tách Canvas tĩnh / động; tắt Raycast Target'],
  ['NÂNG CAO', 'Class chỉ tạo qua JSON/reflection', '`[Preserve]` hoặc `link.xml`'],
  ['NÂNG CAO', 'Biến static khi tắt Domain Reload', 'Reset bằng `[RuntimeInitializeOnLoadMethod]`'],
], [16, 42, 42]));
C.push(...callout('Câu kết gợi ý', 'Buổi Debug giúp mình **tìm** ra lỗi. Hiểu Unity dưới mui xe giúp mình **không viết ra** lỗi ngay từ đầu, và khi gặp lỗi lạ thì biết ngay nên nghi ngờ chỗ nào.', 'key'));

// ---- Phụ lục A ----
C.push(H1('Phụ lục A. Project demo DEMO_UNITY'));
C.push(H2('Mở project lần đầu'));
C.push(...steps([
  'Mở `D:\\_PROJECT\\DEMO_UNITY` bằng Unity **6000.4** (Unity 6.4). Project dùng **URP** (package `com.unity.render-pipelines.universal`, tự cài khi mở).',
  'Lần đầu compile xong, script `Assets/_Talk/Editor/DemoSceneBuilder.cs` **tự dựng** 8 scene, tạo URP Asset, material, prefab và `PlayerConfig.asset`, rồi mở scene `01_FakeNull`. Console in dòng “[Talk] Đã dựng 8 scene demo…”.',
  'Muốn dựng lại từ đầu (ví dụ sau khi lỡ sửa scene): menu **Talk → Dựng lại toàn bộ scene demo**.',
  'Nếu Console báo “Không tìm thấy URP”: đợi Package Manager cài xong URP rồi chạy lại menu ở bước 3.',
]));
C.push(H2('Cấu trúc thư mục'));
C.push(...table(['Thư mục', 'Nội dung'], [
  ['`Assets/_Talk/Scenes`', '8 scene demo, đã thêm vào Build Settings theo thứ tự'],
  ['`Assets/_Talk/Scripts/Common/DemoGui.cs`', 'Giao diện chung (IMGUI chữ to, khung log, thanh chuyển scene)'],
  ['`Assets/_Talk/Scripts/01_…` → `08_…`', 'Script của từng demo, mỗi demo một thư mục'],
  ['`Assets/_Talk/Editor`', '`DemoSceneBuilder` (dựng scene), `PlayModeTimer` (đo thời gian vào Play)'],
  ['`Assets/_Talk/Rendering`, `Prefabs`, `Data`', 'URP Asset, material, prefab Player/Sword, `PlayerConfig.asset`'],
  ['`TalkDocs`', 'Tài liệu Word, hình minh hoạ và script sinh tài liệu (không thuộc Assets)'],
], [40, 60]));
C.push(H2('Checklist trước buổi họp'));
C.push(...table(['Việc cần làm', 'Xong?'], [
  ['Mở project, đợi dựng scene xong, chạy thử lần lượt 8 scene', '☐'],
  ['Đặt Game view ở 16:9 (1920×1080) để giao diện demo không bị tràn', '☐'],
  ['Kiểm tra `Talk_URP` đang là render pipeline (demo 07)', '☐'],
  ['Kiểm tra Domain Reload đang **bật** trước khi bắt đầu (demo 08 có nút bật/tắt)', '☐'],
  ['Kiểm tra `PlayerConfig.startCoins = 100` (demo 05 có nút đặt lại)', '☐'],
  ['Quay video dự phòng cho từng demo', '☐'],
  ['Tăng cỡ chữ Console; tắt Collapse, bật Clear on Play', '☐'],
  ['Cài Rider/VS Code làm External Script Editor để mở file .prefab ở demo 05', '☐'],
  ['Ghi sẵn số liệu thời gian vào Play của project thật của team (demo 08)', '☐'],
], [85, 15]));
C.push(...callout('Giới hạn của project demo', [
  'Số liệu đo trong Editor chỉ dùng để so sánh **tương đối**. Muốn số chính xác, build Development lên máy thật và mở Profiler.',
  'Giao diện demo dùng IMGUI cho gọn, nên chính nó cũng tạo một ít rác mỗi frame. Demo 06 trừ phần này bằng số mốc “Không làm gì”.',
], 'info'));

// ---- Phụ lục B ----
C.push(H1('Phụ lục B. Câu hỏi có thể gặp và gợi ý trả lời'));
C.push(...qa([
  ['Vậy có nên bỏ hết `?.` trong project Unity không?', 'Không. `?.` vẫn dùng bình thường với class C# thông thường (data, service…). Chỉ không dùng với kiểu kế thừa `UnityEngine.Object` (GameObject, Component, MonoBehaviour, ScriptableObject, Material…). Rider sẽ cảnh báo đúng những chỗ đó.'],
  ['GetComponent thật sự chậm đến mức nào?', 'Một lần gọi rất nhanh. Vấn đề là gọi **liên tục** trong Update của nhiều object. Thay vì nhớ con số, hãy đo bằng Profiler trên máy thật. Lưu lại kết quả cũng giúp code rõ phụ thuộc hơn.'],
  ['Có nên tắt Domain Reload cho cả team không?', 'Nên thử, vì lợi ích về thời gian rất lớn. Nhưng phải rà biến static và event static trước, nếu không sẽ gặp lỗi khó hiểu giữa các lần Play. Bắt đầu trên một nhánh riêng, đo, rồi mới áp dụng cho cả team.'],
  ['Incremental GC có làm game chậm hơn không?', 'Có tốn thêm một chút chi phí để theo dõi thay đổi bộ nhớ, nhưng đổi lại các lần khựng ngắn hơn nhiều vì việc dọn được chia ra nhiều frame. Với game mobile, đa số trường hợp có lợi. Nó không thay thế việc giảm tạo rác.'],
  ['Coroutine hay async/await thì tốt hơn?', 'Coroutine gắn với vòng đời MonoBehaviour nên an toàn, nhưng không trả về giá trị và khó xử lý lỗi. async/await viết gọn hơn nhưng phải tự quản lý huỷ (`destroyCancellationToken`). Trên Unity 6 có `Awaitable`; trên 2022.3 nhiều team chọn UniTask.'],
  ['MaterialPropertyBlock vậy là không bao giờ nên dùng?', 'Không phải. Trong Built-in RP nó vẫn là lựa chọn tốt; trong URP nó vẫn hữu ích khi vẽ rất nhiều object giống nhau bằng GPU Instancing. Ý chính: đo trên đúng render pipeline trước khi áp dụng.'],
  ['Sao không dùng `FindObjectOfType` nữa?', 'Từ Unity 2023.1 (gồm Unity 6) nó bị đánh dấu obsolete. `FindAnyObjectByType` nhanh hơn vì không cần sắp xếp; `FindFirstObjectByType` dùng khi thật sự cần đúng object đầu tiên. Tốt nhất vẫn là kéo thả reference hoặc truyền vào qua Initialize().'],
]));

// ---- Phụ lục C ----
C.push(H1('Phụ lục C. Tài liệu tham khảo'));
C.push(P('Tra cứu theo tên trang trên Unity Manual / Unity Blog / Unity Learn:'));
C.push(...bullets([
  '**Unity Manual:** Order of execution for event functions (vòng đời và Player Loop).',
  '**Unity Manual:** Script serialization; Serialization rules; SerializeReference.',
  '**Unity Manual:** Garbage collector overview; Incremental garbage collection.',
  '**Unity Manual:** Managed code stripping; Preserving code using annotations / link.xml.',
  '**Unity Manual:** Configurable Enter Play Mode; Domain Reloading.',
  '**Unity Manual (URP):** Scriptable Render Pipeline Batcher.',
  '**Unity Manual:** Awaitable (Unity 6) và MonoBehaviour.destroyCancellationToken.',
  '**Unity Blog:** “Custom == operator, should we keep it?” (nguồn gốc của fake null).',
  '**Unity Blog:** “10000 Update() calls” (chi phí gọi hàm Update).',
  '**Unity Learn:** Optimizing Unity UI (Canvas rebuild, tách Canvas).',
  '**Tài liệu buổi trước:** “Các phương pháp Debug trong C# và Unity”: Profiler, Frame Debugger, các case thực tế.',
]));

// ================= BUILD =================
const doc = new Document({
  creator: 'Dev Team', title: 'Unity dưới mui xe', description: 'Tài liệu buổi chia sẻ kiến thức Unity',
  styles: {
    default: { document: { run: { font: FONT, size: 22, color: COL.ink } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 40, bold: true, color: COL.ink, font: FONT }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COL.accent, space: 6 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: COL.cs, font: FONT }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: COL.ink, font: FONT }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Unity dưới mui xe', size: 16, color: COL.muted })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Trang ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: 16, color: COL.muted })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('written', OUT, b.length); });
