# Chuyện gì xảy ra sau mỗi dòng code Unity?

Project demo cho buổi chia sẻ kiến thức Unity: 8 scene, mỗi scene chứng minh một cơ chế bên trong Unity
(fake null, chi phí gọi API, Player Loop, coroutine/async, serialization, GC, rendering, Enter Play Mode).

- Tài liệu đầy đủ (giải thích, so sánh, các bước test): [`TalkDocs_UNITY/SauMoiDongCodeUnity.docx`](TalkDocs_UNITY/SauMoiDongCodeUnity.docx)
- Yêu cầu: **Unity 6.4 (6000.4.x)**, URP (tự cài khi mở project)

## Chạy demo

1. `git clone https://github.com/vtcong2299/DEMO_UNITY.git` (hoặc Code → Download ZIP).
2. Unity Hub → Add → chọn thư mục project → mở bằng Unity 6.4.
3. Đợi import. Nếu scene thiếu hoặc cũ, Console in `[Talk] Đã dựng 8 scene demo…` (script tự dựng lại).
4. Mở `Assets/_Talk/Scenes/01_FakeNull.unity`, đặt Game view **16:9 (1920×1080)**, bấm **Play**.
5. Làm theo các bước bên trái màn hình. Bảng **Kết quả** bên phải: chấm xanh = cách đúng, chấm đỏ = bẫy.
   Nút **Scene trước / Scene sau** ở đáy màn hình để chuyển demo.

## Danh sách demo

| Scene | Câu hỏi | Kết quả cần thấy |
|---|---|---|
| `01_FakeNull` | Object đã Destroy có thật sự null? | `enemy == null` là True nhưng `enemy is null` là False, `enemy?.Attack()` vẫn gọi và ném lỗi |
| `02_NativeCost` | Gọi API Unity tốn bao nhiêu? | GetComponent mỗi lần, đọc position nhiều lần, `GameObject.Find` chậm hơn nhiều lần; `tag ==` tạo vài MB rác |
| `03_PlayerLoop` | FixedUpdate có chạy 1 lần mỗi frame? | FPS cao có rất nhiều frame 0 lần; đọc input trong FixedUpdate mất lần bấm; timeScale = 0 không dừng Update |
| `04_Lifetime` | Coroutine và async sống tới khi nào? | Tắt script coroutine vẫn chạy; Task vẫn chạy sau Destroy và sau khi thoát Play; Awaitable + token thì dừng |
| `05_Serialization` | Unity lưu dữ liệu thế nào? | Prefab (7.5) thắng code (5); `[HideInInspector]` vẫn lưu; ScriptableObject bị ghi đè; List thường mất kiểu con |
| `06_GarbageCollector` | Rác bộ nhớ sinh ra từ đâu? GC chạy khi nào? | Số byte rác mỗi lần gọi của 14 đoạn code (LINQ ≈ 480 B, ghép chuỗi ≈ 80 B, ô xanh ≈ 0); tạo rác nhiều thì GC dày hơn, frame có GC chậm gấp 2–3 lần; heap không co lại |
| `07_Rendering` | Đổi màu từng object: cách nào rẻ? | Draw Calls (qua SRP Batcher / đường thường) và SetPass in ra từng chế độ; `renderer.material` tạo 100 material nhưng SetPass không đổi; tắt SRP Batcher thì SetPass +100; MaterialPropertyBlock: 0 material nhưng mất SRP Batcher, SetPass +200 (bình thường trong URP) |
| `08_EnterPlayMode` | Tắt Domain Reload được gì, mất gì? | Vào Play nhanh hơn; biến static và event static không tự reset |

## Sau khi test

- Demo 05: bấm **Đặt lại asset = 100**.
- Demo 08: bấm **Bật lại Domain Reload**.
- Lỡ làm hỏng scene: menu **Talk → Dựng lại toàn bộ scene demo**.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `Assets/_Talk/Scenes` | 8 scene demo (có trong Build Settings) |
| `Assets/_Talk/Scripts` | `Common/DemoGui.cs` (giao diện chung) và script của từng demo |
| `Assets/_Talk/Editor` | `DemoSceneBuilder` (dựng scene, URP, material, prefab), `PlayModeTimer` |
| `TalkDocs_UNITY` | Tài liệu Word, hình minh hoạ, script sinh tài liệu (`cd TalkDocs_UNITY/build && npm install && npm run doc`) |
