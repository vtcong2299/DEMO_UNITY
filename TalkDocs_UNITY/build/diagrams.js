const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const C = {
  cs: '#2F6FDB', csSoft: '#E8F0FD',
  cpp: '#D9772B', cppSoft: '#FDF0E6',
  ok: '#1E8E4E', okSoft: '#E6F4EA',
  bad: '#C62828', badSoft: '#FDE7E7',
  warn: '#B7791F', warnSoft: '#FFF6DD',
  ink: '#1F2937', ink2: '#4B5563', muted: '#9CA3AF', line: '#D1D5DB', bg: '#FFFFFF', panel: '#F7F7F8',
};
const F = "Segoe UI, Arial, sans-serif";
const M = "Consolas, monospace";

const esc = s => String(s).replace(/^ +/, m => ' '.repeat(m.length)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function text(x, y, s, o = {}) {
  const { size = 18, fill = C.ink, weight = 400, anchor = 'start', font = F, italic = false } = o;
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`;
}
function lines(x, y, arr, o = {}) {
  const lh = o.lh || (o.size || 18) * 1.4;
  return arr.map((s, i) => text(x, y + i * lh, s, o)).join('');
}
function box(x, y, w, h, o = {}) {
  const { fill = C.panel, stroke = C.line, r = 12, sw = 2, dash = '' } = o;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}
function arrow(x1, y1, x2, y2, o = {}) {
  const { color = C.ink2, sw = 2.5, dash = '' } = o;
  const a = Math.atan2(y2 - y1, x2 - x1), L = 12;
  const p1 = [x2 - L * Math.cos(a - 0.4), y2 - L * Math.sin(a - 0.4)];
  const p2 = [x2 - L * Math.cos(a + 0.4), y2 - L * Math.sin(a + 0.4)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` +
    `<polygon points="${x2},${y2} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}" fill="${color}"/>`;
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;

const D = {};

// 1. Two worlds
D.two_worlds = (() => {
  const W = 1100, H = 600; let b = '';
  b += text(W / 2, 40, 'Mỗi UnityEngine.Object = vỏ C# + object thật bên C++', { size: 24, weight: 700, anchor: 'middle' });
  const panel = (x, title, destroyed) => {
    let s = box(x, 70, 510, 300, { fill: '#FAFAFA' });
    s += text(x + 255, 104, title, { size: 20, weight: 700, anchor: 'middle', fill: destroyed ? C.bad : C.ok });
    s += box(x + 25, 130, 210, 120, { fill: C.csSoft, stroke: C.cs });
    s += text(x + 130, 162, 'Thế giới C#', { size: 15, fill: C.cs, weight: 700, anchor: 'middle' });
    s += text(x + 130, 192, 'Enemy (vỏ C#)', { size: 18, weight: 700, anchor: 'middle' });
    s += text(x + 130, 222, destroyed ? 'm_CachedPtr = 0' : 'm_CachedPtr = 0x7F3A…', { size: 15, font: M, anchor: 'middle', fill: destroyed ? C.bad : C.ink2 });
    s += box(x + 275, 130, 210, 120, { fill: destroyed ? '#F3F4F6' : C.cppSoft, stroke: destroyed ? C.muted : C.cpp, dash: destroyed ? '8 6' : '' });
    s += text(x + 380, 162, 'Thế giới C++ (engine)', { size: 15, fill: destroyed ? C.muted : C.cpp, weight: 700, anchor: 'middle' });
    s += text(x + 380, 192, destroyed ? 'đã giải phóng' : 'Enemy (object thật)', { size: 18, weight: 700, anchor: 'middle', fill: destroyed ? C.muted : C.ink });
    s += text(x + 380, 222, destroyed ? '' : 'Transform, Collider…', { size: 15, anchor: 'middle', fill: C.ink2 });
    if (destroyed) {
      s += `<line x1="${x + 290}" y1="140" x2="${x + 470}" y2="240" stroke="${C.bad}" stroke-width="3"/>`;
      s += `<line x1="${x + 470}" y1="140" x2="${x + 290}" y2="240" stroke="${C.bad}" stroke-width="3"/>`;
      s += arrow(x + 235, 190, x + 272, 190, { color: C.muted, dash: '6 5' });
    } else s += arrow(x + 235, 190, x + 272, 190, { color: C.ink2 });
    s += text(x + 255, 290, destroyed ? 'Vỏ C# VẪN CÒN, chỉ mất phần C++' : 'Mỗi lần gọi API = 1 lần đi qua ranh giới', { size: 16, anchor: 'middle', fill: destroyed ? C.bad : C.ink2, weight: 600 });
    s += text(x + 255, 318, destroyed ? '(GC chỉ dọn vỏ C# khi không còn ai giữ nó)' : 'giữa C# và C++ (GetComponent, transform…)', { size: 15, anchor: 'middle', fill: C.ink2 });
    return s;
  };
  b += panel(30, 'Trước Destroy(enemy)', false);
  b += panel(560, 'Sau Destroy(enemy), từ frame sau', true);
  b += box(30, 395, 1040, 185, { fill: '#fff' });
  b += text(55, 428, 'Sau khi Destroy, các cách kiểm tra cho kết quả KHÁC NHAU:', { size: 18, weight: 700 });
  const rows = [
    ['enemy == null', 'true', 'Unity viết lại ==, kiểm tra cả phía C++', C.ok],
    ['if (enemy) …', 'false (bỏ qua)', 'Toán tử bool cũng do Unity viết lại', C.ok],
    ['enemy?.Attack()', 'VẪN GỌI → lỗi', '?. là cú pháp C#, chỉ xem vỏ C#', C.bad],
    ['enemy ?? backup', 'trả về enemy chết', '?? cũng chỉ xem vỏ C#', C.bad],
  ];
  rows.forEach((r, i) => {
    const y = 466 + i * 30;
    b += text(60, y, r[0], { size: 17, font: M });
    b += text(330, y, r[1], { size: 17, weight: 700, fill: r[3] });
    b += text(560, y, r[2], { size: 16, fill: C.ink2 });
  });
  return svg(W, H, b);
})();

// 2. Player loop
D.player_loop = (() => {
  const W = 1100, H = 500; let b = '';
  b += text(W / 2, 36, 'Một frame trong Unity (rút gọn)', { size: 24, weight: 700, anchor: 'middle' });
  const steps = [
    ['Input /', 'Initialization', C.ink2, '#F3F4F6'],
    ['FixedUpdate', '0…n lần', C.warn, C.warnSoft],
    ['Update', '1 lần', C.cs, C.csSoft],
    ['LateUpdate', '1 lần', C.cs, C.csSoft],
    ['Rendering', 'vẽ khung hình', C.cpp, C.cppSoft],
    ['Cuối frame', 'Destroy thật sự', C.bad, C.badSoft],
  ];
  const bw = 150, gap = 28, x0 = 40, y = 120;
  steps.forEach((s, i) => {
    const x = x0 + i * (bw + gap);
    b += box(x, y, bw, 90, { fill: s[3], stroke: s[2] });
    b += text(x + bw / 2, y + 38, s[0], { size: 18, weight: 700, anchor: 'middle', fill: s[2] });
    b += text(x + bw / 2, y + 66, s[1], { size: 15, anchor: 'middle', fill: C.ink2 });
    if (i < steps.length - 1) b += arrow(x + bw + 2, y + 45, x + bw + gap - 2, y + 45);
  });
  // loop arrow on FixedUpdate
  const fx = x0 + (bw + gap);
  b += `<path d="M ${fx + 40} ${y} C ${fx + 40} ${y - 30}, ${fx + 110} ${y - 30}, ${fx + 110} ${y - 4}" fill="none" stroke="${C.warn}" stroke-width="2.5"/>`;
  b += `<polygon points="${fx + 110},${y} ${fx + 104},${y - 12} ${fx + 117},${y - 11}" fill="${C.warn}"/>`;
  b += text(fx + 75, y - 30, 'lặp để đuổi kịp thời gian', { size: 13, anchor: 'middle', fill: C.warn });
  // resume points
  const notes = [
    [1, 'OnTrigger / OnCollision', 'yield WaitForFixedUpdate'],
    [2, 'yield return null', 'yield WaitForSeconds', 'await (Task/Awaitable)*'],
    [5, 'yield WaitForEndOfFrame'],
  ];
  notes.forEach(n => {
    const x = x0 + n[0] * (bw + gap) + bw / 2;
    b += `<line x1="${x}" y1="${y + 92}" x2="${x}" y2="${y + 130}" stroke="${C.muted}" stroke-width="2" stroke-dasharray="4 4"/>`;
    n.slice(1).forEach((t, j) => {
      b += box(x - 86, y + 132 + j * 44, 172, 36, { fill: '#fff', stroke: C.line, r: 8 });
      b += text(x, y + 155 + j * 44, t, { size: 12.5, font: M, anchor: 'middle' });
    });
  });
  b += text(40, 455, 'Ô dưới mỗi bước = chỗ coroutine / callback được chạy tiếp.', { size: 16, fill: C.ink2 });
  b += text(40, 482, '* Continuation của await chạy ở main thread qua UnitySynchronizationContext (thời điểm cụ thể tuỳ loại await).', { size: 14, fill: C.muted });
  return svg(W, H, b);
})();

// 3. FixedUpdate per frame
D.fixed_update = (() => {
  const W = 1100, H = 400; let b = '';
  b += text(W / 2, 40, 'FixedUpdate không gắn với frame: 0 lần, 1 lần hay nhiều lần', { size: 24, weight: 700, anchor: 'middle' });
  const x0 = 80, sx = 8; // 1ms = 8px, 0..120ms
  const ax = t => x0 + t * sx;
  b += `<line x1="${ax(0)}" y1="300" x2="${ax(122)}" y2="300" stroke="${C.ink2}" stroke-width="2"/>`;
  for (let t = 0; t <= 120; t += 20) { b += `<line x1="${ax(t)}" y1="295" x2="${ax(t)}" y2="305" stroke="${C.ink2}" stroke-width="2"/>`; b += text(ax(t), 328, `${t} ms`, { size: 14, anchor: 'middle', fill: C.ink2 }); }
  b += text(20, 130, 'Frame', { size: 16, weight: 700 });
  b += text(20, 230, 'Fixed', { size: 16, weight: 700 });
  const frames = [[0, 12, 0], [12, 25, 1], [25, 37, 0], [37, 50, 1], [50, 110, 3]];
  frames.forEach(([a, e, n], i) => {
    const slow = e - a > 30;
    b += box(ax(a) + 2, 100, (e - a) * sx - 4, 50, { fill: slow ? C.badSoft : C.csSoft, stroke: slow ? C.bad : C.cs, r: 8 });
    b += text((ax(a) + ax(e)) / 2, 132, slow ? 'Frame chậm (60 ms)' : `F${i + 1}`, { size: 15, anchor: 'middle', weight: 700, fill: slow ? C.bad : C.cs });
    b += text((ax(a) + ax(e)) / 2, 180, `${n}×`, { size: 18, anchor: 'middle', weight: 700, fill: n === 0 ? C.bad : n > 1 ? C.warn : C.ok });
  });
  [20, 40, 60, 80, 100].forEach(t => {
    b += `<line x1="${ax(t)}" y1="205" x2="${ax(t)}" y2="290" stroke="${C.warn}" stroke-width="3"/>`;
    b += `<circle cx="${ax(t)}" cy="225" r="8" fill="${C.warn}"/>`;
  });
  b += text(ax(0), 370, 'fixedDeltaTime = 0.02 s → cứ mỗi 20 ms “thời gian game” có 1 bước vật lý. Frame nhanh: có thể 0 lần. Frame chậm: chạy bù nhiều lần.', { size: 15, fill: C.ink2 });
  return svg(W, H, b);
})();

// 4. Serialization GUID
D.guid = (() => {
  const W = 1100, H = 520; let b = '';
  b += text(W / 2, 40, 'Reference trong Unity = GUID (trong file .meta) + fileID', { size: 24, weight: 700, anchor: 'middle' });
  b += box(30, 70, 560, 330, { fill: '#1E1E1E', stroke: '#1E1E1E' });
  b += text(50, 100, 'Player.prefab  (mở bằng text editor)', { size: 15, fill: '#9CDCFE', font: M });
  const y = [140, 172, 204, 236, 268, 300, 332];
  const code = [
    ['MonoBehaviour:', '#D4D4D4'],
    ['  m_Script: {fileID: 11500000,', '#D4D4D4'],
    ['     guid: 3f2a9c0d…, type: 3}', '#4EC9B0'],
    ['  speed: 5', '#CE9178'],
    ['  weapon: {fileID: 4471002,', '#D4D4D4'],
    ['     guid: 8b1e77aa…, type: 3}', '#4EC9B0'],
    ['  m_Name: Player', '#D4D4D4'],
  ];
  code.forEach((c, i) => b += text(50, y[i], c[0], { size: 18, font: M, fill: c[1] }));
  const metas = [[100, 'PlayerController.cs.meta', 'guid: 3f2a9c0d…'], [260, 'Sword.prefab.meta', 'guid: 8b1e77aa…']];
  metas.forEach(([yy, name, g]) => {
    b += box(700, yy, 370, 100, { fill: C.okSoft, stroke: C.ok });
    b += text(720, yy + 38, name, { size: 18, weight: 700, font: M });
    b += text(720, yy + 72, g, { size: 18, font: M, fill: C.ok });
  });
  b += arrow(420, 198, 696, 150, { color: C.ok });
  b += arrow(420, 294, 696, 310, { color: C.ok });
  b += box(30, 420, 1040, 85, { fill: C.warnSoft, stroke: C.warn });
  b += text(50, 452, '• Mất / tạo lại file .meta → GUID mới → mọi chỗ trỏ tới asset đó thành “Missing”.', { size: 17 });
  b += text(50, 484, '• “speed: 5” nằm trong prefab → luôn thắng giá trị mặc định viết trong code.', { size: 17 });
  return svg(W, H, b);
})();

// 5. GC heap
D.gc_heap = (() => {
  const W = 1100, H = 430; let b = '';
  b += text(W / 2, 40, 'GC Boehm: không chia thế hệ, không dồn bộ nhớ', { size: 24, weight: 700, anchor: 'middle' });
  const row = (y, label, blocks, extra) => {
    b += text(30, y + 32, label, { size: 16, weight: 700 });
    let x = 260;
    blocks.forEach(([w, used]) => {
      b += `<rect x="${x}" y="${y}" width="${w}" height="50" fill="${used ? C.cs : '#fff'}" stroke="${used ? '#fff' : C.muted}" stroke-width="2"${used ? '' : ' stroke-dasharray="5 4"'}/>`;
      x += w;
    });
    if (extra) { b += `<rect x="${x + 6}" y="${y}" width="${extra}" height="50" fill="${C.badSoft}" stroke="${C.bad}" stroke-width="2"/>`; b += text(x + 6 + extra / 2, y + 32, 'heap phình', { size: 15, anchor: 'middle', fill: C.bad, weight: 700 }); }
  };
  row(80, '1. Heap ban đầu', [[90, 1], [70, 1], [110, 1], [60, 1], [90, 1], [80, 1], [100, 1], [60, 1]]);
  row(170, '2. Sau khi GC dọn', [[90, 1], [70, 0], [110, 1], [60, 0], [90, 1], [80, 0], [100, 1], [60, 0]]);
  row(260, '3. Cần 1 khối 120', [[90, 1], [70, 0], [110, 1], [60, 0], [90, 1], [80, 0], [100, 1], [60, 0]], 130);
  b += text(260, 345, 'Tổng chỗ trống = 270, nhưng không lỗ nào ≥ 120 → không vừa → phải xin thêm bộ nhớ.', { size: 16, fill: C.ink2 });
  b += `<rect x="260" y="372" width="22" height="18" fill="${C.cs}"/>`; b += text(290, 387, 'đang dùng', { size: 15 });
  b += `<rect x="400" y="372" width="22" height="18" fill="#fff" stroke="${C.muted}" stroke-dasharray="4 3"/>`; b += text(430, 387, 'trống (lỗ hổng)', { size: 15 });
  b += text(600, 387, 'Mỗi lần GC phải quét TOÀN BỘ heap → heap càng to, khựng càng lâu.', { size: 15, fill: C.bad });
  return svg(W, H, b);
})();

// 6. SRP batcher
D.srp_batcher = (() => {
  const W = 1100, H = 440; let b = '';
  b += text(W / 2, 40, 'SRP Batcher (URP) gộp theo SHADER VARIANT, không theo material', { size: 24, weight: 700, anchor: 'middle' });
  b += box(30, 70, 500, 340, { fill: C.okSoft, stroke: C.ok });
  b += text(280, 104, 'Nhiều material, cùng shader URP/Lit', { size: 18, weight: 700, anchor: 'middle', fill: C.ok });
  [['Mat_Red', '#E57373'], ['Mat_Blue', '#64B5F6'], ['Mat_Green', '#81C784']].forEach(([n, col], i) => {
    const x = 60 + i * 155;
    b += `<circle cx="${x + 60}" cy="175" r="40" fill="${col}"/>`;
    b += text(x + 60, 245, n, { size: 15, font: M, anchor: 'middle' });
  });
  b += box(80, 280, 400, 60, { fill: '#fff', stroke: C.ok });
  b += text(280, 317, 'GỘP ĐƯỢC: 1 SRP Batch', { size: 20, weight: 700, anchor: 'middle', fill: C.ok });
  b += text(280, 382, 'Dữ liệu material nằm sẵn trên GPU → rẻ', { size: 15, anchor: 'middle', fill: C.ink2 });
  b += box(570, 70, 500, 340, { fill: C.badSoft, stroke: C.bad });
  b += text(820, 104, 'Cùng material + MaterialPropertyBlock', { size: 18, weight: 700, anchor: 'middle', fill: C.bad });
  [0, 1, 2].forEach(i => {
    const x = 600 + i * 155;
    b += `<circle cx="${x + 60}" cy="175" r="40" fill="#BDBDBD"/>`;
    b += text(x + 60, 245, `MPB #${i + 1}`, { size: 15, font: M, anchor: 'middle' });
  });
  b += box(620, 280, 400, 60, { fill: '#fff', stroke: C.bad });
  b += text(820, 317, 'KHÔNG còn tương thích SRP Batcher', { size: 18, weight: 700, anchor: 'middle', fill: C.bad });
  b += text(820, 382, 'Frame Debugger ghi rõ lý do không gộp', { size: 15, anchor: 'middle', fill: C.ink2 });
  return svg(W, H, b);
})();

// 7. Canvas rebuild
D.canvas = (() => {
  const W = 1100, H = 440; let b = '';
  b += text(W / 2, 40, '1 phần tử UI thay đổi → cả Canvas phải gộp lại (rebatch)', { size: 24, weight: 700, anchor: 'middle' });
  const canvas = (x, title, split) => {
    b += text(x + 250, 85, title, { size: 18, weight: 700, anchor: 'middle', fill: split ? C.ok : C.bad });
    if (!split) {
      b += box(x, 100, 500, 270, { fill: C.badSoft, stroke: C.bad });
      b += text(x + 20, 128, 'Canvas (1 cái cho tất cả)', { size: 15, weight: 700, fill: C.bad });
    } else {
      b += box(x, 100, 500, 160, { fill: C.okSoft, stroke: C.ok });
      b += text(x + 20, 128, 'Canvas tĩnh: nền, khung, icon', { size: 15, weight: 700, fill: C.ok });
      b += box(x, 275, 500, 95, { fill: C.badSoft, stroke: C.bad });
      b += text(x + 20, 303, 'Canvas động: chỉ phần hay đổi', { size: 15, weight: 700, fill: C.bad });
    }
    for (let i = 0; i < 8; i++) {
      const bx = x + 25 + (i % 4) * 118, by = 145 + Math.floor(i / 4) * 52;
      b += box(bx, by, 100, 40, { fill: '#fff', stroke: C.line, r: 6 });
      b += text(bx + 50, by + 26, ['Nền', 'Khung', 'Icon', 'Nút', 'Avatar', 'Tên', 'Icon', 'Nút'][i], { size: 14, anchor: 'middle', fill: C.ink2 });
    }
    const ty = split ? 315 : 265;
    b += box(x + 25, ty, 220, 42, { fill: '#fff', stroke: C.bad, r: 6, sw: 3 });
    b += text(x + 135, ty + 27, 'Score: 1234 ← đổi mỗi frame', { size: 14, anchor: 'middle', fill: C.bad, weight: 700 });
  };
  canvas(40, 'Gộp chung: đổi 1 text → tính lại cả 9 phần tử', false);
  canvas(560, 'Tách riêng: chỉ Canvas động bị tính lại', true);
  b += text(40, 410, 'Thêm: tắt Raycast Target cho thứ không bấm được; ẩn/hiện thường xuyên → tắt component Canvas thay vì SetActive.', { size: 15, fill: C.ink2 });
  return svg(W, H, b);
})();

// 8. Build pipeline
D.build = (() => {
  const W = 1100, H = 430; let b = '';
  b += text(W / 2, 40, 'Code chạy trong Editor ≠ code chạy trên điện thoại', { size: 24, weight: 700, anchor: 'middle' });
  const chain = (y, label, steps, color) => {
    b += text(30, y + 40, label, { size: 17, weight: 700, fill: color });
    let x = 170;
    steps.forEach((s, i) => {
      const w = s[2] || 150;
      b += box(x, y, w, 64, { fill: s[1] || '#fff', stroke: s[3] || color });
      b += text(x + w / 2, y + 39, s[0], { size: 15, anchor: 'middle', weight: 600 });
      if (i < steps.length - 1) b += arrow(x + w + 2, y + 32, x + w + 26, y + 32);
      x += w + 28;
    });
  };
  chain(80, 'Editor', [['Code C#'], ['IL (.dll)'], ['Mono (JIT)', '', 170], ['Chạy ngay', C.okSoft, 150, C.ok]], C.cs);
  chain(200, 'Build', [['Code C#'], ['IL (.dll)'], ['Stripping', C.badSoft, 130, C.bad], ['IL2CPP → C++', '', 160], ['Native .so', C.okSoft, 130, C.ok]], C.cpp);
  b += box(170, 300, 900, 100, { fill: C.badSoft, stroke: C.bad });
  b += text(190, 332, 'Stripping (UnityLinker) xoá code “không thấy ai dùng”, nhưng nó KHÔNG thấy:', { size: 16, weight: 700, fill: C.bad });
  b += text(190, 362, 'reflection, JSON deserialize vào class chỉ được tạo gián tiếp, Type.GetType("…"), AddComponent theo tên…', { size: 15 });
  b += text(190, 388, '→ Editor chạy tốt, build báo thiếu class / crash. Giữ lại bằng link.xml hoặc [Preserve].', { size: 15, fill: C.ink2 });
  return svg(W, H, b);
})();

const out = path.join(__dirname, '..', 'img');
fs.mkdirSync(out, { recursive: true });
for (const [name, s] of Object.entries(D)) {
  fs.writeFileSync(path.join(out, name + '.svg'), s);
  const png = new Resvg(s, { fitTo: { mode: 'zoom', value: 2 }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } }).render().asPng();
  fs.writeFileSync(path.join(out, name + '.png'), png);
  console.log('ok', name);
}
