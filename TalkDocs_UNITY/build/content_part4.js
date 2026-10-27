const { H1, callout, image, item, demo, deep, seeAlso, summary, table } = require('./lib');

module.exports = function part4() {
  const C = [];
  C.push(H1('Phần 4. Bộ nhớ và Garbage Collector'));
  C.push(...callout('Ý chính của phần', 'FPS trung bình 60 vẫn có thể giật. Thủ phạm thường là **Garbage Collector (GC)**: code tạo “rác” (object C# dùng xong bỏ đi) liên tục, tới lúc GC chạy dọn thì cả game dừng lại một nhịp. Muốn hết giật phải biết chỗ nào tạo rác, kể cả chỗ nhìn code không thấy.', 'key'));

  C.push(...item({
    title: '4.1 Ghép chuỗi trong Update', level: 'co_ban',
    situation: 'Hiển thị điểm số trên màn hình.',
    bad: `void Update()
{
    scoreText.text = "Score: " + score;   // tạo string mới mỗi frame, kể cả khi điểm không đổi
}`,
    api: [
      ['`"Score: " + score`', 'Ghép chuỗi bằng toán tử `+`.', 'Mỗi lần tạo một string mới trên heap.'],
      ['`$"Score: {score}"`', 'Nội suy chuỗi (string interpolation).', 'Cũng tạo string mới.'],
      ['`TMP_Text.text = …`', 'Gán nội dung cho TextMeshPro.', 'Mỗi lần gán, TMP dựng lại mesh chữ.'],
      ['`TMP_Text.SetText("Score: {0}", score)`', 'Đặt nội dung bằng chuỗi mẫu và số.', 'TMP tự định dạng số vào bộ đệm có sẵn: không tạo string mới.'],
    ],
    truth: '`string` trong C# là **bất biến** (không sửa được). Mỗi phép `+` hoặc `$"..."` tạo một string mới. 60 frame/giây × vài chục byte = rác tích tụ liên tục.',
    good: `int _shownScore = -1;

void Update()
{
    if (score == _shownScore) return;          // chỉ cập nhật khi giá trị đổi
    _shownScore = score;
    scoreText.SetText("Score: {0}", score);    // không tạo string
}`,
    compare: [
      ['Gán `text = "…" + x` mỗi frame', 'Dễ viết.', 'Tạo rác mỗi frame; TMP dựng lại chữ mỗi frame.', 'Không nên.'],
      ['Chỉ gán khi giá trị đổi', 'Ít rác, ít dựng lại UI.', 'Thêm một biến nhớ giá trị cũ.', 'Mọi text hiển thị số.'],
      ['`SetText("{0}", x)`', 'Không tạo string kể cả khi đổi liên tục.', 'Chỉ có ở TextMeshPro; định dạng hạn chế hơn.', 'Số đổi liên tục (đồng hồ, máu).'],
    ],
    remember: 'Text: **chỉ cập nhật khi đổi**, dùng **`SetText("{0}", x)`** với TextMeshPro.',
  }));

  C.push(...item({
    title: '4.2 Những chỗ tạo rác mà nhìn code không thấy', level: 'trung_binh',
    situation: 'Code không có chữ `new` nhưng Profiler vẫn báo GC Alloc.',
    api: [
      ['Boxing', 'Gán một giá trị struct (int, float, Vector3…) vào biến kiểu `object` hoặc interface: C# phải tạo object bọc giá trị đó.', 'Ví dụ `object o = 5;`, truyền int vào `string.Format`.'],
      ['Closure', 'Lambda dùng biến bên ngoài nó: C# tạo object để giữ biến đó.', 'Lambda không dùng biến ngoài thì được tạo sẵn 1 lần.'],
      ['Enumerator', 'Object giúp `foreach` duyệt một tập hợp.', '`List<T>` dùng enumerator kiểu struct (không rác); qua interface `IEnumerable<T>` thì bị boxing.'],
      ['`params int[] values`', 'Hàm nhận số lượng tham số tuỳ ý.', 'Mỗi lần gọi tạo một mảng mới.'],
      ['LINQ (`Where`, `Select`, `ToList`…)', 'Các hàm truy vấn tập hợp của C#.', 'Tạo iterator, delegate và list mới.'],
      ['`Physics.RaycastNonAlloc(ray, hits)`', 'Bắn tia, ghi kết quả vào mảng có sẵn.', 'Không tạo mảng mới như `RaycastAll`.'],
      ['`GetComponents(list)`', 'Lấy mọi component, đổ vào list có sẵn.', 'Không tạo mảng mới như `GetComponents<T>()`.'],
    ],
    extra: table(['Đoạn code', 'Tạo rác?', 'Vì sao', 'Thay bằng'], [
      ['`foreach (var e in list)` với `List<T>`', 'Không', 'Enumerator của List là struct', '-'],
      ['`foreach` qua biến kiểu `IEnumerable<T>`', '**Có**', 'Enumerator bị boxing', 'Dùng đúng kiểu `List<T>`, hoặc `for`'],
      ['Lambda dùng biến ngoài: `x => x.id == id`', '**Có**', 'Tạo object closure giữ `id`', 'Vòng lặp `for` thường'],
      ['Lambda không dùng biến ngoài', 'Không', 'Compiler tạo sẵn, dùng lại', '-'],
      ['LINQ: `.Where().ToList()`', '**Có**', 'Iterator, delegate, list mới', '`for` + list dùng lại'],
      ['`$"HP {hp}"`, `string.Format`', '**Có**', 'String mới, boxing tham số', '`SetText`, `StringBuilder` dùng lại'],
      ['Hàm có tham số `params`', '**Có**', 'Mảng mới mỗi lần gọi', 'Overload số tham số cố định'],
      ['`new WaitForSeconds(1)` trong vòng lặp', '**Có**', 'Object mới mỗi lần', 'Tạo 1 lần, dùng lại'],
      ['`GetComponents<T>()`', '**Có**', 'Mảng mới', '`GetComponents(List<T>)`'],
      ['`Physics.RaycastAll`', '**Có**', 'Mảng mới', '`Physics.RaycastNonAlloc`'],
      ['`gameObject.tag`', '**Có**', 'String mới', '`CompareTag`'],
      ['`Debug.Log` trong bản build', '**Có**', 'String, stack trace', 'Bọc bằng `[Conditional]` (6.1)'],
    ], [32, 11, 27, 30]),
    notes: [['Cách tìm chỗ tạo rác', 'Window → Analysis → **Profiler** → CPU Usage → bảng Hierarchy → sắp xếp theo cột **GC Alloc**. Bật **Call Stacks** cho GC.Alloc để biết dòng code. Đo trên **bản build Development** (xem 1.6 và Phần 6).', 'info']],
    remember: 'Đoạn code chạy mỗi frame: **không** ghép chuỗi, LINQ, lambda dùng biến ngoài, foreach qua interface, `params`, `new` object tạm.',
  }));

  C.push(...item({
    title: '4.3 GC của Unity hoạt động thế nào', level: 'nang_cao',
    situation: 'Game mobile thỉnh thoảng khựng dù FPS trung bình vẫn cao.',
    api: [
      ['`GC.Collect()`', 'Ép GC chạy dọn rác ngay.', 'Tốn thời gian; chỉ gọi ở lúc người chơi không để ý (màn loading).'],
      ['Incremental GC', 'Chế độ chia việc quét rác ra nhiều frame (Project Settings → Player → Use incremental GC).', 'Bớt khựng nhưng không giảm tổng việc.'],
      ['`Profiler.GetMonoUsedSizeLong()`', 'Số byte heap C# đang dùng.', 'Dùng trong demo 06.'],
      ['`Profiler.GetMonoHeapSizeLong()`', 'Kích thước heap C# đã xin từ hệ điều hành.', 'Thường không giảm lại.'],
    ],
    extra: image('gc_heap', 620, 'Hình 5. Heap bị phân mảnh: tổng chỗ trống đủ nhưng không lỗ nào đủ lớn, nên heap phải phình ra'),
    truth: [
      'Unity dùng GC **Boehm**, khác GC của .NET hiện đại:',
      [
        '**Không chia thế hệ:** mỗi lần dọn quét **toàn bộ** heap, không chỉ phần object mới tạo. Heap càng to, mỗi lần khựng càng lâu.',
        '**Không dồn bộ nhớ:** object còn sống nằm yên tại chỗ, để lại lỗ trống. Cần một khối lớn mà không lỗ nào vừa thì heap phải phình ra.',
        'Heap đã phình thì **hiếm khi trả lại** cho hệ điều hành.',
      ],
    ],
    effect: 'Trên điện thoại, mỗi lần GC có thể mất vài tới vài chục mili giây. Với 16,6 ms mỗi frame (60 FPS), một lần GC là đủ khựng.',
    good: `// 1. Giảm rác ở những đoạn chạy mỗi frame (bảng 4.2).
// 2. Bật Incremental GC để chia việc quét ra nhiều frame.
// 3. Chủ động dọn ở lúc người chơi không để ý (màn loading):
System.GC.Collect();`,
    compare: [
      ['Incremental GC bật', 'Mỗi lần khựng ngắn hơn nhiều.', 'Tốn thêm chút chi phí theo dõi bộ nhớ; không giảm tổng việc.', 'Hầu hết game mobile.'],
      ['Incremental GC tắt', 'Tổng chi phí thấp hơn chút.', 'Mỗi lần GC là một cú khựng dài.', 'Game ít tạo rác hoặc không nhạy với khựng.'],
    ],
    remember: 'Chi phí thật là **lúc dọn**: giảm số lần dọn bằng cách **không tạo rác mỗi frame**.',
  }));

  C.push(...item({
    title: '4.4 GC chạy khi nào? Chạy nhiều có lag hơn không?', level: 'nang_cao',
    situation: 'Profiler thỉnh thoảng hiện một cột GC.Collect cao vọt, lúc có lúc không; demo 06 hiện “Số lần GC đã chạy” tăng dần.',
    api: [
      ['`GC.CollectionCount(0)`', 'Số lần GC đã chạy từ lúc khởi động.', 'Demo 06 dùng để đếm và đo khoảng cách giữa hai lần GC.'],
      ['`GarbageCollector.isIncremental`', 'Cho biết đang bật Incremental GC hay không (chỉ đọc lúc chạy).', 'Bật/tắt ở Player Settings → Use incremental GC.'],
      ['`GarbageCollector.incrementalTimeSliceNanoseconds`', 'Thời gian tối đa GC incremental được dùng trong mỗi frame.', 'Mặc định khoảng 3 ms.'],
      ['`GarbageCollector.GCMode`', 'Bật / tắt / để tay (Manual) việc GC tự chạy.', 'Tắt GC thì heap chỉ tăng; chỉ dùng trong khoảng ngắn và phải bật lại.'],
      ['Profiler marker `GC.Alloc` / `GC.Collect`', 'Hai dòng trong Profiler: chỗ cấp phát và chỗ GC chạy.', 'Xem trong CPU Usage → Hierarchy hoặc Timeline.'],
    ],
    truth: [
      '**GC không chạy theo lịch.** Mỗi lần code `new` một object (kể cả rác ngầm ở 4.2), runtime lấy chỗ trống trong heap. Khi **không còn chỗ trống đủ cho lần cấp phát đó**, GC chạy (hoặc khi code gọi `GC.Collect()`). Có thể hiểu nôm na là “heap đầy thì dọn”.',
      'Một lần GC (chế độ thường) gồm: **dừng game** → **đánh dấu** mọi object còn được tham chiếu (mark) → **thu hồi** phần còn lại (sweep). Dọn xong mà vẫn không đủ chỗ thì runtime **xin thêm bộ nhớ**, heap lớn lên.',
      'Vì vậy:',
      [
        '**Tần suất GC ≈ tốc độ tạo rác ÷ chỗ trống trong heap.** Ví dụ có 10 MB trống: tạo 10 KB rác/frame → khoảng 1.000 frame (≈ 17 giây ở 60 FPS) mới GC một lần; tạo 100 KB/frame → khoảng 1,7 giây một lần.',
        '**Thời gian mỗi lần GC** tăng theo lượng object còn sống và kích thước heap (Boehm quét toàn bộ).',
        '**Tổng thời gian mất cho GC = số lần × thời gian mỗi lần.** Không bật Incremental: mỗi lần là một cú khựng, nên GC càng dày thì càng nhiều cú khựng. Bật Incremental: việc quét được chia ra nhiều frame (mỗi frame tối đa khoảng 3 ms), ít khựng hơn nhưng vẫn tốn CPU; nếu tạo rác nhanh hơn tốc độ GC kịp dọn, Unity vẫn phải chạy một lần đầy đủ và game vẫn khựng.',
        'Heap to hơn không hẳn tốt hơn: ít GC hơn nhưng **mỗi lần lâu hơn** và tốn RAM.',
      ],
    ],
    effect: 'Người chơi không cảm nhận “số lần GC”, mà cảm nhận **frame bị kéo dài** lúc GC chạy. Demo 06 hiện thời gian “frame có GC” so với frame thường để thấy điều này.',
    good: `// 1. Giảm tốc độ tạo rác trong code chạy mỗi frame (4.1, 4.2): GC sẽ thưa đi.
// 2. Bật Incremental GC: mỗi lần dọn chia nhỏ ra nhiều frame.
// 3. Dọn chủ động ở lúc người chơi không để ý:
void OnLoadingScreenShown() => System.GC.Collect();
// 4. Nâng cao: tắt GC trong một đoạn ngắn cực kỳ nhạy (ví dụ một pha combo), rồi bật lại ngay:
GarbageCollector.GCMode = GarbageCollector.Mode.Disabled;   // heap chỉ tăng, không giảm
// ...
GarbageCollector.GCMode = GarbageCollector.Mode.Enabled;`,
    notes: [['Vì sao số đo GC trong Editor khác lý thuyết', [
      'Trong Editor, heap C# chứa **cả dữ liệu của Editor** (cửa sổ, Inspector, asset đã load) nên lớn tới hàng trăm MB. GC phải quét cả phần đó, nên số lần và thời gian GC không giống trên điện thoại.',
      'Bản thân Editor và giao diện demo (IMGUI) cũng tạo rác mỗi frame. Demo 06 dùng cách **chạy xen kẽ frame có / frame không** rồi lấy chênh lệch để loại phần nhiễu này.',
      'Muốn số đúng: build **Development** lên máy thật, mở Profiler, xem `GC.Alloc` và `GC.Collect`.',
    ], 'info']],
    remember: 'GC chạy khi **heap hết chỗ trống**. Tạo rác càng nhanh → GC càng dày → càng nhiều frame bị kéo dài. Cách chữa gốc là **giảm rác mỗi frame**.',
  }));

  C.push(...deep('4.5 Phân tích sâu: bộ nhớ managed và bộ nhớ native', [
    'Game Unity có hai vùng nhớ:',
    [
      '**Managed heap (C#):** object C#, string, list, mảng… do GC quản lý. Đây là nơi rác sinh ra.',
      '**Native memory (C++):** texture, mesh, audio clip, material, dữ liệu của GameObject. GC **không** quản lý vùng này.',
    ],
    'Hệ quả: `new Texture2D(...)`, `Instantiate(material)`, `new Mesh()` mà không `Destroy` thì **rò rỉ native memory**. Cột GC Alloc không hiện gì nhưng RAM tăng dần tới khi hệ điều hành tắt game. Dùng **Memory Profiler** để thấy hai vùng tách riêng.',
    'Cấp phát rất nhanh; dọn mới tốn (dừng game, quét toàn heap). Mục tiêu là **giảm số lần dọn**, không phải cấm `new` hoàn toàn.',
  ]));
  C.push(...seeAlso('4.6 Những chỗ khác trong Unity hay tạo rác', [
    ['`StartCoroutine(Routine())`', 'Mỗi lần gọi tạo object IEnumerator và Coroutine mới.', 'Không bắt đầu coroutine mỗi frame; dùng một vòng lặp sống lâu.'],
    ['`Physics.OverlapSphere`, `RaycastAll`', 'Trả về mảng mới.', 'Bản `NonAlloc` với mảng có sẵn.'],
    ['`string.Split`, `Substring`, `ToString()`', 'Mỗi lần tạo string/mảng mới.', 'Cache kết quả; tránh trong Update.'],
    ['`enumValue.ToString()`', 'Dùng reflection và tạo string mới.', 'Bảng tra `string[]` theo giá trị enum.'],
    ['`OnGUI` (IMGUI)', 'Tạo rác mỗi lần gọi, có thể nhiều lần mỗi frame.', 'Chỉ dùng cho tool/debug (như project demo này).'],
    ['`JsonUtility.ToJson`, log debug', 'String lớn mỗi lần.', 'Chỉ lưu khi dữ liệu đổi; log có điều kiện.'],
  ]));

  C.push(...demo({
    title: 'Rác bộ nhớ sinh ra từ đâu?', scene: '06_GarbageCollector', slide: 29, script: '06_GarbageCollector/GcDemo.cs',
    goal: 'đo số byte rác **mỗi lần gọi** của 14 đoạn code quen thuộc, thấy GC chạy dày lên khi tạo rác nhiều, và thấy heap không co lại.',
    steps: [
      ['Bấm Play. Bảng Kết quả bên phải liệt kê 14 đoạn code, ban đầu ghi “đang đo…”.', 'Dòng “Đang chạy” = **Không làm gì (mốc)**.', 'Demo chạy đoạn code đã chọn 1.000 lần nhưng **chỉ ở frame xen kẽ**; lấy trung vị rác của 30 frame có chạy trừ trung vị 30 frame không chạy, chia cho 1.000 = số byte mỗi lần gọi. Nhờ vậy rác của giao diện demo và Editor bị loại ra.'],
      ['Chọn lần lượt các ô đỏ: **"Score: " + i**, **$"HP {i}"**, **LINQ Where().ToList()**, **Lambda dùng biến ngoài**, **foreach IEnumerable<T>**, **Boxing**, **params**, **new WaitForSeconds()**, **gameObject.tag**, **GetComponents<T>() mảng**. Mỗi ô đợi khoảng 1 giây.', 'Mỗi dòng đỏ hiện **vài chục tới vài trăm B/lần**; LINQ cao nhất (tạo iterator, delegate, list và mảng bên trong). Máy thử (Unity 6.4, Editor): ghép chuỗi 82, $"…" 73, LINQ 480, lambda dùng biến ngoài 148, params 44, foreach IEnumerable 40, GetComponents<T>() 40, gameObject.tag 38, boxing 20, new WaitForSeconds 20.', 'Các mẫu code tạo rác (4.1, 4.2).'],
      ['Chọn các ô xanh: **Lambda không dùng biến ngoài**, **foreach List<T>**, **CompareTag()**, **GetComponents(list)**.', 'Các dòng xanh hiện **≈ 0 B/lần**.', 'Cùng việc, cách viết khác nhau thì rác khác nhau.'],
      ['Chọn **LINQ Where().ToList()**, để khoảng 20 giây. Sau đó chọn **foreach List<T>**, để khoảng 20 giây.', 'Khi chạy LINQ: “Số lần GC trong 10 giây gần nhất” cao hơn khi chạy foreach List; “Frame có GC gần nhất” dài gấp 2–3 lần frame thường (máy thử: khoảng 30 ms so với 12 ms).', 'Tạo rác càng nhanh → GC càng dày (4.4). Trong Editor, giao diện demo và Editor tự tạo khoảng 100 KB rác mỗi frame nên GC vẫn chạy cả khi chọn foreach List; trên bản build, phần nền này gần như bằng 0 nên chênh lệch rõ hơn nhiều.'],
      ['Bấm **2 · Cấp phát 64 MB**.', '“Heap đang dùng (Used)” và “Kích thước heap (Reserved)” cùng tăng khoảng 64 MB.', 'Heap xin thêm bộ nhớ.'],
      ['Bấm **3 · Bỏ đi + GC.Collect()**.', '“Used” giảm khoảng 64 MB; “Reserved” **gần như giữ nguyên**.', 'Heap đã phình hiếm khi co lại (4.3).'],
    ],
    after: [
      ['Về con số trong Editor', 'Used/Reserved trong Editor lên tới hàng trăm MB vì heap chứa cả dữ liệu Editor; số lần GC cũng chịu ảnh hưởng của Editor. Hãy nhìn **chênh lệch** giữa các trường hợp, không nhìn số tuyệt đối (xem 4.4).', 'info'],
      ['Xem chính xác dòng code', 'Mở Window → Analysis → Profiler → CPU Usage, chọn một frame chẵn, tìm `GcDemo.Update` và xem cột **GC Alloc**.', 'info'],
    ],
  }));

  C.push(...summary(4, [
    ['Hiển thị số trên UI', 'Chỉ cập nhật khi đổi; `SetText("{0}", x)`.', 'Ghép chuỗi gán `text` mỗi frame.'],
    ['Duyệt danh sách mỗi frame', '`for` hoặc `foreach` trên đúng kiểu `List<T>`.', 'LINQ; `foreach` qua `IEnumerable<T>`.'],
    ['Điều kiện lọc', 'Vòng lặp `for` với biến cục bộ.', 'Lambda dùng biến bên ngoài trong code chạy mỗi frame.'],
    ['Raycast, lấy nhiều component', '`RaycastNonAlloc`, `GetComponents(list)` với mảng/list có sẵn.', '`RaycastAll`, `GetComponents<T>()` mỗi frame.'],
    ['Coroutine chờ lặp', 'Cache `WaitForSeconds`.', '`new WaitForSeconds` mỗi vòng.'],
    ['Giảm khựng do GC', 'Bật Incremental GC; `GC.Collect()` ở màn loading.', 'Gọi `GC.Collect()` giữa gameplay.'],
    ['Texture, mesh, material tạo lúc chạy', '`Destroy` khi không dùng nữa.', 'Để GC lo (GC không quản lý bộ nhớ native).'],
  ]));
  return C;
};
