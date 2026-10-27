const { H1, H2, P, bullets, steps, callout, table, apiIndex, REPO } = require('./lib');

module.exports = function ending(docLink) {
  const C = [];
  C.push(H1('Kết: Đáp án quiz và cheat sheet'));
  C.push(H2('Đáp án quiz (slide 39)'));
  C.push(...table(['#', 'Câu hỏi', 'Đáp án', 'Lý do ngắn'], [
    ['1', '`enabled = false` làm coroutine dừng', '**Sai**', 'Chỉ tắt GameObject hoặc Destroy mới dừng (2.3)'],
    ['2', '`timeScale = 0` làm Update ngừng', '**Sai**', 'Update vẫn chạy, deltaTime = 0 (2.4)'],
    ['3', 'Ngay sau Destroy, `obj == null` là true', '**Sai**', 'Destroy có hiệu lực ở cuối frame (1.5)'],
    ['4', 'FixedUpdate chạy đúng 1 lần mỗi frame', '**Sai**', '0 lần hoặc nhiều lần (2.5)'],
    ['5', '`target?.Attack()` an toàn với object đã Destroy', '**Sai**', '`?.` không dùng `==` của Unity (1.5)'],
    ['6', '`async void` tự dừng khi object bị Destroy', '**Sai**', 'Task không biết vòng đời object (2.7)'],
    ['7', 'Chạy tốt trong Editor thì chạy tốt trên điện thoại', '**Sai**', 'IL2CPP và code stripping (6.2). Câu này chỉ có trong tài liệu.'],
  ], [6, 38, 12, 44]));
  C.push(H2('Cheat sheet: Thường viết → Nên viết (slide 40)'));
  C.push(...table(['Mức', 'Thường viết', 'Nên viết', 'Mục'], [
    ['CƠ BẢN', '`GetComponent<T>()` trong Update', 'Lấy 1 lần trong Awake, lưu field', '1.1'],
    ['CƠ BẢN', '`other.tag == "Enemy"`', '`other.CompareTag("Enemy")`', '1.2'],
    ['CƠ BẢN', 'Đăng ký OnEnable, huỷ OnDestroy', 'Đăng ký OnEnable, huỷ **OnDisable**', '2.1'],
    ['CƠ BẢN', '`new WaitForSeconds(x)` trong vòng lặp', 'Tạo 1 lần, dùng lại', '2.3'],
    ['CƠ BẢN', 'Đổi tên field đã serialize', '`[FormerlySerializedAs("tênCũ")]`', '3.2'],
    ['CƠ BẢN', '`text = "Score: " + score` mỗi frame', 'Chỉ gán khi đổi; `SetText("{0}", score)`', '4.1'],
    ['CƠ BẢN', '`renderer.material` để đổi màu', 'Lưu bản sao và Destroy, hoặc `sharedMaterial`', '5.1'],
    ['TRUNG BÌNH', 'Đọc `transform.position` nhiều lần', 'Đọc 1 lần vào biến; `SetPositionAndRotation`', '1.3'],
    ['TRUNG BÌNH', '`Find` / `FindObjectOfType` trong Update', 'Kéo thả reference, hoặc tìm 1 lần', '1.4'],
    ['TRUNG BÌNH', '`GetKeyDown` trong FixedUpdate', 'Đọc ở Update, xử lý ở FixedUpdate', '2.5'],
    ['TRUNG BÌNH', 'UI menu pause dùng `WaitForSeconds`', '`WaitForSecondsRealtime`, `unscaledDeltaTime`', '2.4'],
    ['TRUNG BÌNH', '`[HideInInspector]` để “không lưu”', '`[NonSerialized]`', '3.3'],
    ['TRUNG BÌNH', '`SetTrigger("Jump")`', '`Animator.StringToHash` lưu sẵn', '5.2'],
    ['NÂNG CAO', '`obj?.Method()`, `obj ?? x` với object Unity', '`if (obj != null)` hoặc `if (obj)`', '1.5'],
    ['NÂNG CAO', '`GetComponent` rồi kiểm tra null', '`TryGetComponent(out T c)`', '1.6'],
    ['NÂNG CAO', '`async void` + `Task.Delay`', '`Awaitable` + `destroyCancellationToken`', '2.7'],
    ['NÂNG CAO', 'Dùng ScriptableObject làm biến runtime', 'Copy giá trị ra, hoặc `Instantiate(config)`', '3.6'],
    ['NÂNG CAO', 'List đa hình `[Serializable]` thường', '`[SerializeReference]`', '3.5'],
    ['NÂNG CAO', 'MaterialPropertyBlock trong URP', 'Nhiều material cùng shader', '5.3'],
    ['NÂNG CAO', 'Mọi UI chung một Canvas', 'Tách Canvas tĩnh/động; tắt Raycast Target', '5.4'],
    ['NÂNG CAO', 'Class chỉ tạo qua JSON/reflection', '`[Preserve]` hoặc `link.xml`', '6.2'],
    ['NÂNG CAO', 'Static khi tắt Domain Reload', 'Reset bằng `[RuntimeInitializeOnLoadMethod]`', '6.3'],
  ], [14, 36, 40, 10]));
  C.push(...callout('Câu kết gợi ý', 'Buổi Debug giúp mình **tìm ra** lỗi. Hiểu chuyện gì xảy ra sau mỗi dòng code giúp mình **không viết ra** lỗi ngay từ đầu, và khi gặp lỗi lạ thì biết nên nghi chỗ nào.', 'key'));

  C.push(H1('Phụ lục A. Chi tiết project demo'));
  C.push(P(`Repo: **${REPO}** · Tài liệu: **${docLink}**`));
  C.push(H2('Cấu trúc thư mục'));
  C.push(...table(['Thư mục / file', 'Nội dung'], [
    ['`Assets/_Talk/Scenes`', '8 scene demo, đã có trong Build Settings theo thứ tự. File ẩn `.build_version` đánh dấu phiên bản bố cục scene.'],
    ['`Assets/_Talk/Scripts/Common/DemoGui.cs`', 'Giao diện chung: câu hỏi, các bước, bảng Kết quả, ô Ghi nhớ, nhãn trên object 3D, thanh chuyển scene.'],
    ['`Assets/_Talk/Scripts/01_…` → `08_…`', 'Script của từng demo, mỗi demo một thư mục.'],
    ['`Assets/_Talk/Editor/DemoSceneBuilder.cs`', 'Dựng lại toàn bộ scene, URP Asset, material, prefab, `PlayerConfig.asset`. Tự chạy khi scene thiếu hoặc cũ; chạy tay bằng menu **Talk → Dựng lại toàn bộ scene demo**.'],
    ['`Assets/_Talk/Editor/PlayModeTimer.cs`', 'Đo thời gian từ lúc bấm Play tới lúc vào Play mode (demo 08).'],
    ['`Assets/_Talk/Rendering`, `Prefabs`, `Data`', 'URP Asset, material, prefab Player/Sword, `PlayerConfig.asset`.'],
    ['`TalkDocs/`', 'Tài liệu Word này, hình minh hoạ và script sinh tài liệu.'],
  ], [36, 64]));
  C.push(H2('Checklist trước buổi họp'));
  C.push(...table(['Việc cần làm', 'Xong?'], [
    ['Kéo code mới nhất (`git pull`), mở project, đợi import xong', '☐'],
    ['Chạy thử lần lượt 8 scene theo bảng bước trong tài liệu', '☐'],
    ['Game view 16:9 (1920×1080)', '☐'],
    ['Domain Reload đang **bật** (demo 08 có nút bật/tắt)', '☐'],
    ['`PlayerConfig.startCoins = 100` (demo 05 có nút đặt lại)', '☐'],
    ['Rider/VS Code là External Script Editor (demo 05 mở file .prefab)', '☐'],
    ['Quay video dự phòng cho từng demo', '☐'],
    ['Ghi sẵn thời gian vào Play của project thật của team (demo 08)', '☐'],
  ], [85, 15]));
  C.push(...callout('Giới hạn của project demo', [
    'Số đo trong Editor chỉ để so sánh **tương đối**. Muốn số chính xác: build Development lên máy thật và mở Profiler.',
    'Giao diện demo dùng IMGUI cho gọn, nên chính nó cũng tạo một ít rác mỗi frame. Demo 06 trừ phần này bằng số mốc.',
  ], 'info'));

  C.push(H1('Phụ lục B. Câu hỏi có thể gặp'));
  [
    ['Vậy có nên bỏ hết `?.` trong project Unity không?', 'Không. `?.` vẫn dùng bình thường với class C# thường (data, service…). Chỉ không dùng với kiểu kế thừa `UnityEngine.Object`. Rider cảnh báo đúng những chỗ đó.'],
    ['GetComponent thật sự chậm đến mức nào?', 'Một lần gọi rất nhanh. Vấn đề là gọi **liên tục** trên nhiều object. Demo 02 cho số liệu; hãy đo trên máy thật thay vì nhớ con số.'],
    ['Có nên tắt Domain Reload cho cả team không?', 'Nên thử vì tiết kiệm nhiều thời gian, nhưng phải rà biến static và event static trước. Bắt đầu trên nhánh riêng, đo, rồi mới áp dụng.'],
    ['Incremental GC có làm game chậm hơn không?', 'Tốn thêm một chút để theo dõi bộ nhớ, nhưng mỗi lần khựng ngắn hơn nhiều. Với game mobile đa số trường hợp có lợi. Nó không thay thế việc giảm tạo rác.'],
    ['Coroutine hay async/await thì tốt hơn?', 'Xem bảng so sánh ở mục 2.7. Ngắn gọn: Unity 6 dùng `Awaitable` + `destroyCancellationToken`; 2022.3 dùng UniTask hoặc Task có token; coroutine vẫn ổn cho hiệu ứng đơn giản.'],
    ['MaterialPropertyBlock vậy là không nên dùng?', 'Không phải. Trong Built-in RP nó vẫn tốt; trong URP nó có ích khi vẽ rất nhiều object giống nhau bằng GPU Instancing. Ý chính: đo trên đúng pipeline.'],
    ['Sao không dùng `FindObjectOfType` nữa?', 'Từ Unity 2023.1 (gồm Unity 6) nó bị đánh dấu obsolete. Dùng `FindAnyObjectByType` (nhanh) hoặc `FindFirstObjectByType` (đúng object đầu tiên). Tốt nhất vẫn là kéo thả reference.'],
  ].forEach(([q, a]) => { C.push(P('**Hỏi:** ' + q, { p: { spacing: { after: 40 } } })); C.push(P('**Đáp:** ' + a)); });

  C.push(H1('Phụ lục C. Tài liệu tham khảo'));
  C.push(P('Tra cứu theo tên trang trên Unity Manual / Unity Blog / Unity Learn:'));
  C.push(...bullets([
    '**Unity Manual:** Order of execution for event functions.',
    '**Unity Manual:** Script serialization; Serialization rules; SerializeReference.',
    '**Unity Manual:** Garbage collector overview; Incremental garbage collection.',
    '**Unity Manual:** Managed code stripping; link.xml.',
    '**Unity Manual:** Configurable Enter Play Mode; Domain Reloading.',
    '**Unity Manual (URP):** Scriptable Render Pipeline Batcher.',
    '**Unity Manual:** Awaitable; MonoBehaviour.destroyCancellationToken.',
    '**Unity Blog:** “Custom == operator, should we keep it?” (nguồn gốc của fake null).',
    '**Unity Blog:** “10000 Update() calls”.',
    '**Unity Learn:** Optimizing Unity UI.',
    '**Tài liệu buổi trước:** “Các phương pháp Debug trong C# và Unity”.',
  ]));

  C.push(H1('Phụ lục D. Bảng tra cứu hàm và cú pháp'));
  C.push(P('Mọi hàm/cú pháp đã giải thích trong tài liệu, sắp theo bảng chữ cái. Cột “Mục” cho biết chỗ giải thích đầy đủ (kèm lưu ý khi dùng).'));
  const key = s => s.replace(/[`\[\]()<>"]/g, '').replace(/^[\s.]+/, '').toLowerCase();
  const rows = [...apiIndex.entries()].sort((a, b) => key(a[0]).localeCompare(key(b[0]), 'vi')).map(([name, [what, sec]]) => [name, what, sec]);
  C.push(...table(['Hàm / cú pháp', 'Dùng để làm gì', 'Mục'], rows, [34, 56, 10]));
  return C;
};
