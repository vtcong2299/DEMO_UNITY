const { Paragraph, TextRun } = require('docx');
const L = require('./lib');
const { P, H1, H2, bullets, steps, callout, table, COL, MONO, REPO } = L;

const TITLE = 'Chuyện gì xảy ra sau mỗi dòng code Unity?';
const SUBTITLE = 'GetComponent, Destroy, Update, coroutine, prefab… Unity thực sự làm gì bên dưới, và nên viết thế nào cho đúng';
const DOC_LINK = `${REPO}/blob/main/TalkDocs/SauMoiDongCodeUnity.docx`;

module.exports = function intro() {
  const C = [];
  C.push(new Paragraph({ spacing: { before: 2200, after: 120 }, children: [new TextRun({ text: 'BUỔI CHIA SẺ KIẾN THỨC DEV', bold: true, size: 22, color: COL.accent, characterSpacing: 40 })] }));
  C.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: TITLE, bold: true, size: 60, color: COL.ink })] }));
  C.push(new Paragraph({ spacing: { after: 480 }, children: [new TextRun({ text: SUBTITLE, size: 28, color: COL.ink2 })] }));
  C.push(...table(['Thông tin', ''], [
    ['Người trình bày', '……………………'],
    ['Thời lượng', 'Khoảng 60 phút trình bày và 10 phút hỏi đáp'],
    ['Phiên bản Unity', 'Unity 6.4 (6000.4). Chỗ nào Unity 2022.3 khác sẽ có ghi chú riêng'],
    ['Project demo', `${REPO}`],
    ['Tài liệu này trên Git', DOC_LINK],
    ['Nối tiếp', 'Buổi “Các phương pháp Debug trong C# và Unity” và buổi “Agentic Coding với Claude”'],
  ], [28, 72]));

  C.push(H1('Mục lục'));
  [
    'Hướng dẫn sử dụng tài liệu',
    'Tự test bằng project demo',
    'Mở đầu: Quiz “Đúng hay sai?”',
    'Phần 1. Mỗi object Unity có hai nửa: C# và C++',
    'Phần 2. Một frame trong Unity chạy những gì',
    'Phần 3. Unity lưu dữ liệu thế nào (Serialization)',
    'Phần 4. Bộ nhớ và Garbage Collector',
    'Phần 5. Rendering: những dòng code trông vô hại',
    'Phần 6. Editor khác bản build',
    'Kết: Đáp án quiz và cheat sheet',
    'Phụ lục A. Chi tiết project demo',
    'Phụ lục B. Câu hỏi có thể gặp',
    'Phụ lục C. Tài liệu tham khảo',
    'Phụ lục D. Bảng tra cứu hàm và cú pháp',
  ].forEach((t, i) => C.push(new Paragraph({ children: [new TextRun({ text: `${String(i + 1).padStart(2, '0')}   `, color: COL.muted, font: MONO }), new TextRun({ text: t, size: 24 })], spacing: { after: 100 } })));
  C.push(P('Mẹo: bật **View → Navigation Pane** trong Word để nhảy nhanh giữa các phần.', { run: { color: COL.muted, size: 20 } }));

  C.push(H1('Hướng dẫn sử dụng tài liệu'));
  C.push(H2('Tài liệu dùng để làm gì'));
  C.push(...bullets([
    '**Kịch bản cho người trình bày:** mỗi mục có ví dụ, giải thích, demo và số slide tương ứng.',
    '**Tài liệu tự học cho team:** mỗi hàm xuất hiện đều có giải thích “dùng để làm gì”, mỗi so sánh đều có ưu và nhược.',
    '**Hướng dẫn tự test:** mỗi demo có bảng các bước và kết quả đúng để ai cũng tự làm lại được.',
  ]));
  C.push(H2('Cách đọc nhãn độ khó'));
  C.push(...table(['Nhãn', 'Ý nghĩa'], [
    ['CƠ BẢN', 'Phần lớn dev đã biết cách dùng. Mục này giải thích thêm vì sao.'],
    ['TRUNG BÌNH', 'Dev đã dùng nhưng hay hiểu sai hoặc chưa để ý.'],
    ['NÂNG CAO', 'Nằm sâu trong engine, đa số chưa biết. Có demo chứng minh.'],
  ], [20, 80]));
  C.push(H2('Cấu trúc của mỗi mục'));
  C.push(...table(['Khối', 'Nội dung'], [
    ['Tình huống', 'Một câu mô tả việc cần làm trong game.'],
    ['Thường viết (khung đỏ)', 'Đoạn code quen tay mà nhiều người viết.'],
    ['Các hàm và cú pháp trong ví dụ', 'Bảng giải thích từng hàm: dùng để làm gì, lưu ý khi dùng.'],
    ['Thật ra Unity làm gì', 'Nguyên lý bên dưới.'],
    ['Hậu quả', 'Chậm ở đâu, lỗi ở đâu.'],
    ['Nên viết (khung xanh)', 'Cách viết đúng.'],
    ['So sánh các cách', 'Khi có 2 cách trở lên: ưu điểm, nhược điểm, khi nào dùng.'],
    ['Ghi nhớ (ô xanh lá)', 'Một câu chốt để nhớ.'],
  ], [30, 70]));
  C.push(P('Cuối mỗi phần có bảng **Tổng kết: nên viết thế nào**. Cuối tài liệu có **Phụ lục D** tra cứu mọi hàm đã nhắc tới.'));
  C.push(H2('Kế hoạch thời gian và vị trí slide'));
  C.push(...table(['Phần', 'Nội dung', 'Thời lượng', 'Slide', 'Demo (scene · slide)'], [
    ['Mở đầu', 'Giới thiệu, cách tự test, quiz', '5 phút', '1–5', '-'],
    ['1', 'Mỗi object có hai nửa: C# và C++', '10 phút', '6–14', '01_FakeNull · 11\n02_NativeCost · 13'],
    ['2', 'Một frame chạy những gì', '13 phút', '15–24', '03_PlayerLoop · 20\n04_Lifetime · 23'],
    ['3', 'Serialization', 'tự đọc', 'không chiếu', '05_Serialization (tự test)'],
    ['4', 'Bộ nhớ và GC', '10 phút', '25–30', '06_GarbageCollector · 29'],
    ['5', 'Rendering', '12 phút', '31–38', '07_Rendering · 37'],
    ['6', 'Editor khác bản build', 'tự đọc', 'không chiếu', '08_EnterPlayMode (tự test)'],
    ['Kết', 'Đáp án quiz, cheat sheet, hỏi đáp', '4 phút', '39–41', '-'],
    ['', '**Tổng (phần chiếu)**', '**≈ 54 phút**', '', ''],
  ], [9, 33, 13, 10, 35]));
  C.push(...callout('Nếu chỉ có 40–45 phút', [
    'Phần 3 và Phần 6 không chiếu trên slide (vẫn đầy đủ trong tài liệu và project). Nếu cần ngắn hơn nữa: gộp Phần 4 với Phần 5. Mục CƠ BẢN chỉ đọc khung “Nên viết” và ô “Ghi nhớ”.',
  ], 'info'));

  C.push(H1('Tự test bằng project demo'));
  C.push(P(`Toàn bộ 8 demo nằm trong project **DEMO_UNITY** trên GitHub: **${REPO}**. Tài liệu này nằm cùng repo: **${DOC_LINK}**.`));
  C.push(H2('Cài đặt một lần'));
  C.push(...steps([
    `Tải project: \`git clone ${REPO}.git\`, hoặc trên trang GitHub bấm **Code → Download ZIP** rồi giải nén.`,
    'Mở **Unity Hub → Add → Add project from disk**, chọn thư mục DEMO_UNITY, mở bằng **Unity 6.4 (6000.4.x)**. Demo 04 dùng `Awaitable` nên cần Unity 6.',
    'Đợi Unity import lần đầu (có cài URP). Nếu scene chưa có hoặc đã cũ, script `DemoSceneBuilder` tự dựng lại và Console in dòng **“[Talk] Đã dựng 8 scene demo…”**.',
    'Mở **Assets/_Talk/Scenes/01_FakeNull.unity**. Đặt Game view tỉ lệ **16:9** (1920×1080) để giao diện demo không bị tràn.',
    'Bấm **Play**. Làm theo bảng “Các bước test và kết quả đúng” của demo tương ứng trong tài liệu. Dùng nút **Scene trước / Scene sau** ở đáy màn hình để chuyển demo khi đang Play.',
  ]));
  C.push(H2('Cách đọc màn hình demo'));
  C.push(...table(['Vùng', 'Nội dung'], [
    ['Dải trên cùng', 'Tên demo và **câu hỏi** demo trả lời.'],
    ['Cột trái', 'Các **bước** đánh số. Dưới mỗi nút có dòng “→ Kỳ vọng” nói trước kết quả đúng. Cuối cột là ô xanh lá **Ghi nhớ**.'],
    ['Cột phải', 'Bảng **Kết quả**. Chấm **xanh** = cách đúng/an toàn, chấm **đỏ** = bẫy, không chấm = thông tin. Dòng xám bên dưới mỗi kết quả giải thích vì sao.'],
    ['Giữa màn hình', 'Object 3D có nhãn chữ (ví dụ “Enemy (sẽ bị Destroy)”).'],
    ['Đáy màn hình', 'Chuyển scene trước/sau, link repo.'],
  ], [22, 78]));
  C.push(...callout('Sau khi test xong', [
    'Demo 05: bấm **Đặt lại asset = 100** (nếu không, file `PlayerConfig.asset` bị đổi thật).',
    'Demo 08: bấm **Bật lại Domain Reload** (nếu không, các lần Play sau giữ biến static cũ).',
    'Lỡ làm hỏng scene: menu **Talk → Dựng lại toàn bộ scene demo**.',
  ], 'warn'));

  C.push(H1('Mở đầu: Quiz “Đúng hay sai?”'));
  C.push(P('Chiếu từng câu, cho cả phòng giơ tay **Đúng** hoặc **Sai**, chưa công bố đáp án. Đáp án nằm trong từng phần và được tổng kết ở cuối (slide 39).'));
  C.push(...table(['#', 'Câu hỏi', 'Mức', 'Giải ở'], [
    ['1', 'Gọi `enabled = false` thì coroutine của script đó dừng lại.', 'CƠ BẢN', '2.3'],
    ['2', 'Đặt `Time.timeScale = 0` thì `Update` ngừng chạy.', 'CƠ BẢN', '2.4'],
    ['3', 'Sau `Destroy(obj)`, ngay dòng tiếp theo `obj == null` là true.', 'TRUNG BÌNH', '1.5'],
    ['4', '`FixedUpdate` luôn chạy đúng 1 lần mỗi frame.', 'TRUNG BÌNH', '2.5'],
    ['5', '`target?.Attack()` an toàn với object đã bị Destroy.', 'NÂNG CAO', '1.5'],
    ['6', '`async void` tự dừng khi object bị Destroy.', 'NÂNG CAO', '2.7'],
    ['7', 'Code chạy tốt trong Editor thì chắc chắn chạy tốt trên điện thoại.', 'NÂNG CAO', '6.2 (chỉ trong tài liệu)'],
  ], [6, 64, 15, 15]));
  return C;
};
module.exports.TITLE = TITLE;
module.exports.DOC_LINK = DOC_LINK;
