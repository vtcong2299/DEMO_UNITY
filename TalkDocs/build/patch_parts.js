// Thay khối demo cũ của từng phần bằng: phân tích sâu + ví dụ khác trong Unity + demo theo scene.
const fs = require('fs');
const file = __dirname + '/build.js';
let src = fs.readFileSync(file, 'utf8');

const parts = {
  '// ---- Phần 2 ----': `
C.push(...deep('1.8 Phân tích sâu: Unity kiểm tra “còn sống” thế nào', [
  'Bên trong, \`UnityEngine.Object\` giữ một con trỏ \`m_CachedPtr\` tới object C++. Toán tử \`==\` của Unity gọi một hàm so sánh: nếu một bên là \`null\` thì nó kiểm tra con trỏ đó còn trỏ tới object sống hay không. Đây là lý do mỗi lần so sánh \`== null\` với object Unity tốn hơn so sánh tham chiếu thường một chút.',
  'Khi \`Destroy\` chạy ở cuối frame, engine giải phóng object C++ và đặt con trỏ về 0. Vỏ C# chỉ biến mất khi **không còn ai giữ tham chiếu** tới nó. Những chỗ hay vô tình giữ lại:',
  [
    'Một \`static\` field hoặc một Singleton trỏ tới object của scene cũ: chuyển scene xong vẫn giữ vỏ C# và **mọi thứ vỏ đó tham chiếu** (list, texture, data…), GC không dọn được. Đây là một dạng rò rỉ bộ nhớ.',
    'Event C# không huỷ đăng ký: delegate giữ tham chiếu tới object đã Destroy (xem demo 08).',
    'Cache lười bằng \`??=\`: \`_rb ??= GetComponent<Rigidbody>();\` không bao giờ lấy lại khi \`_rb\` đã thành fake null.',
  ],
  'Fake null không chỉ xảy ra khi Destroy: **unload scene**, \`AssetBundle.Unload(true)\`, \`Resources.UnloadUnusedAssets\` cũng biến các tham chiếu cũ thành fake null.',
]));
C.push(...seeAlso('1.9 Cùng cơ chế C# ⇄ C++ ở những chỗ khác trong Unity', [
  ['\`mesh.vertices\`, \`mesh.triangles\`, \`mesh.uv\`', 'Mỗi lần đọc: copy **toàn bộ** mảng từ C++ sang một mảng C# mới. Viết \`mesh.vertices[i]\` trong vòng lặp là copy N lần.', 'Đọc 1 lần vào biến, hoặc \`mesh.GetVertices(list)\`'],
  ['\`renderer.materials\`', 'Trả về mảng mới và **nhân bản mọi material** của renderer.', '\`sharedMaterials\` hoặc \`GetSharedMaterials(list)\`'],
  ['\`Input.touches\`', 'Tạo mảng \`Touch[]\` mới mỗi lần đọc.', '\`Input.touchCount\` + \`Input.GetTouch(i)\`'],
  ['\`GetComponentsInChildren<T>()\`', 'Duyệt cả cây con và tạo mảng mới.', 'Overload nhận \`List<T>\` dùng lại; hoặc kéo thả reference'],
  ['\`gameObject.name\`, \`.tag\`', 'Mỗi lần đọc tạo một string mới từ dữ liệu C++.', 'Đọc 1 lần nếu dùng nhiều; \`CompareTag\` để so tag'],
  ['\`Camera.main\`', 'Trước 2020.2: tìm theo tag mỗi lần. Từ 2020.2: Unity tự cache.', 'Bản mới gọi thoải mái; bản cũ thì lưu lại'],
  ['\`transform.position\` trên object có nhiều cha', 'Vị trí thế giới được tính từ chuỗi cha. Ghi vào nó cũng đánh dấu cả cây con là đã đổi.', '\`localPosition\` khi đủ dùng; giữ hierarchy nông cho object di chuyển nhiều'],
]));
C.push(...demo({
  title: 'Fake null và Destroy có hiệu lực trễ', scene: '01_FakeNull', slide: 10, script: 'Scripts/01_FakeNull/FakeNullDemo.cs',
  goal: 'cho cả phòng thấy tận mắt \`==\` và \`?.\` cho kết quả khác nhau trên cùng một object.',
  steps: [
    'Mở scene, bấm Play. Bên phải có khối đỏ (Enemy) và khối xanh (Backup).',
    'Hỏi khán giả: “Sau khi Destroy, \`enemy is null\` là True hay False?”. Sau đó bấm **1. Destroy Enemy rồi kiểm tra bằng 5 cách**.',
    'Đọc log từng dòng: cùng frame \`== null\` vẫn False và số con vẫn còn; frame sau \`==\` là True nhưng \`is null\` và \`ReferenceEquals\` là False; \`enemy?.Attack()\` vẫn chạy và ném \`MissingReferenceException\`; \`??\` trả về enemy đã chết.',
    'Bấm **2. GetComponent trên object không có component**: trong Editor \`is null\` ra False (object giả null), \`TryGetComponent\` thì không.',
    'Bấm **Tạo lại Enemy** nếu muốn chạy lại.',
  ],
  expect: ['Một object, năm cách kiểm tra, hai kết quả khác nhau. Chốt câu: “Với object Unity, chỉ tin \`==\` và \`if (obj)\`.”'],
}));
C.push(...demo({
  title: 'Đo chi phí qua ranh giới C# ⇄ C++', scene: '02_NativeCost', slide: 12, script: 'Scripts/02_NativeCost/NativeCostDemo.cs',
  goal: 'cho số liệu thật (ms và KB) của các cặp code quen thuộc, và chi phí của 10.000 hàm \`Update\` rỗng.',
  steps: [
    'Bấm Play. Mục **A**: bấm lần lượt 3 nút so sánh. Mỗi nút chạy 100.000 lần cho cả hai cách và ghi kết quả vào bảng.',
    'Chỉ vào cặp \`tag ==\` và \`CompareTag\`: thời gian chênh ít, nhưng \`tag ==\` tạo hàng MB rác.',
    'Mục **B**: bấm **GameObject.Find vs FindAnyObjectByType**, rồi **+5.000 object vào scene**, bấm lại: thời gian Find tăng theo số object.',
    'Mục **C**: chọn **Update rỗng** (10.000 object) rồi **1 Manager gọi Tick()**, so sánh Frame time và Main Thread. Có thể mở Profiler, tìm \`BehaviourUpdate\`.',
  ],
  expect: ['GetComponent và đọc position nhiều lần chậm hơn rõ rệt. \`tag ==\` tạo rác, \`CompareTag\` không. Update rỗng tốn thời gian thật, manager rẻ hơn.', 'Số liệu tuyệt đối khác nhau giữa các máy; điều cần nói là **tỉ lệ**.'],
}));

`,
  '// ---- Phần 3 ----': `
C.push(...deep('2.9 Phân tích sâu: thứ tự đầy đủ trong một frame', [
  'Bản rút gọn từ trang “Order of execution for event functions” của Unity:',
  [
    '**Đầu frame:** cập nhật thời gian, xử lý sự kiện input từ hệ điều hành.',
    '**Vòng vật lý (0..n lần):** \`FixedUpdate\` → cập nhật animation (Animator ở chế độ Animate Physics) → mô phỏng vật lý → \`OnTriggerXXX\` / \`OnCollisionXXX\` → coroutine \`yield WaitForFixedUpdate\`.',
    '**Logic game:** sự kiện chuột (\`OnMouseXXX\`) → \`Update\` → coroutine \`yield null\`, \`WaitForSeconds\` chạy tiếp → cập nhật Animator (chế độ Normal) → \`LateUpdate\`.',
    '**Vẽ:** culling, render camera, \`OnGUI\` (có thể gọi nhiều lần mỗi frame).',
    '**Cuối frame:** \`yield WaitForEndOfFrame\`, các object bị \`Destroy\` được xoá thật.',
  ],
  'Hệ quả thực tế: **camera đi theo nhân vật bị giật** thường do nhân vật di chuyển bằng vật lý (50 lần/giây) còn camera cập nhật theo frame. Cách sửa: bật **Interpolate** trên Rigidbody, hoặc cho camera đi theo trong \`LateUpdate\`.',
  'Bên trong \`FixedUpdate\`, \`Time.deltaTime\` tự trả về giá trị của \`fixedDeltaTime\`, nên cùng một hàm di chuyển dùng được ở cả hai nơi.',
]));
C.push(...seeAlso('2.10 Thứ gì chạy theo thời gian nào trong Unity', [
  ['Animator', 'Update Mode = Normal: theo \`deltaTime\`; Animate Physics: theo bước vật lý; Unscaled Time: bỏ qua timeScale.', 'UI animation trong menu pause: Unscaled Time'],
  ['ParticleSystem', 'Mặc định theo timeScale.', 'Hiệu ứng UI lúc pause: bật \`useUnscaledTime\` trong module Main'],
  ['AudioSource', '**Không** bị timeScale ảnh hưởng: pause game nhạc vẫn chạy.', 'Tự pause bằng \`AudioListener.pause\` hoặc \`AudioSource.Pause\`'],
  ['\`Invoke\` / \`InvokeRepeating\`', 'Đếm theo thời gian có scale, gọi hàm bằng **tên chuỗi** (reflection).', 'Coroutine/async có huỷ rõ ràng; tránh chuỗi tên hàm'],
  ['Rigidbody', 'Chỉ di chuyển trong bước vật lý.', 'Bật Interpolate cho object camera bám theo'],
  ['DOTween / tween library', 'Mặc định theo timeScale.', '\`.SetUpdate(true)\` cho tween UI lúc pause'],
]));
C.push(...demo({
  title: 'FixedUpdate, input bị mất và timeScale', scene: '03_PlayerLoop', slide: 18, script: 'Scripts/03_PlayerLoop/PlayerLoopDemo.cs',
  goal: 'cho thấy FixedUpdate chạy 0 hoặc nhiều lần mỗi frame, hệ quả với input, và cái gì dừng khi timeScale = 0.',
  steps: [
    'Bấm Play, chọn Target FPS **Không giới hạn**. Chỉ vào dòng “Số frame có 0 lần”: con số tăng rất nhanh.',
    'Bấm **Frame chậm 100 ms**: log ghi frame sau chạy khoảng 5 lần FixedUpdate. Bấm **Frame chậm 1000 ms**: chỉ khoảng 17 lần, không phải 50, vì Maximum Allowed Timestep chặn lại.',
    'Mục **B**: bấm **Tự bấm 50 lần**. So sánh tỉ lệ bắt được nút giữa “Đọc trong FixedUpdate” và “Đọc ở Update”. Đổi Target FPS sang 30 rồi thử lại: tỉ lệ sai gần 100% đúng.',
    'Mục **C**: bật **Pause game**. Update/giây vẫn còn, FixedUpdate/giây về 0, \`WaitForSeconds\` đứng, \`WaitForSecondsRealtime\` vẫn đếm. Khối đỏ dừng xoay, khối xanh vẫn xoay.',
  ],
  expect: ['Mọi người thấy FixedUpdate không gắn với frame, và lỗi “bấm mà không nhảy” chỉ xuất hiện khi FPS cao, nên rất khó tái hiện nếu không hiểu nguyên lý.'],
}));
C.push(...demo({
  title: 'Coroutine và async sống tới khi nào', scene: '04_Lifetime', slide: 20, script: 'Scripts/04_Lifetime/LifetimeWorker.cs',
  goal: 'cho thấy tắt script không dừng coroutine, Task không biết vòng đời object, và cách sửa bằng \`destroyCancellationToken\`.',
  steps: [
    'Bấm Play. Bốn dòng trạng thái đều ▲ đang chạy, trừ “Coroutine do object KHÁC chạy” (chưa bắt đầu).',
    'Bấm **Tắt script**: coroutine của Worker **vẫn chạy**. Bấm **Bật script** lại.',
    'Bấm **Object khác chạy coroutine của Worker**, rồi **Tắt GameObject**: coroutine của Worker dừng, coroutine do Demo chạy vẫn tiếp tục. Bấm **Bật GameObject**: coroutine của Worker **không tự chạy lại**.',
    'Bấm **Destroy Worker**: Task (async void) vẫn đếm; Awaitable dừng nhờ \`destroyCancellationToken\`. Lưu ý: vẫn đọc được số đếm vì vỏ C# còn (nối lại demo 01).',
    'Bấm Stop để thoát Play mode, mở Console: dòng “[Task] Vẫn chạy sau khi đã thoát Play mode” tiếp tục xuất hiện.',
  ],
  expect: ['Chốt: với async trong Unity luôn truyền \`destroyCancellationToken\` (hoặc dùng Awaitable / UniTask).'],
}));

`,
  '// ---- Phần 4 ----': `
C.push(...deep('3.7 Phân tích sâu: prefab chỉ lưu phần khác biệt', [
  'Khi đặt một prefab vào scene, scene **không** lưu lại toàn bộ object. Nó chỉ lưu tham chiếu tới prefab (GUID) và một danh sách **override** (\`m_Modifications\`): field nào, giá trị nào khác với prefab gốc.',
  'Hệ quả:',
  [
    'Sửa prefab gốc thì mọi instance đổi theo, **trừ** những field đã bị override (Inspector tô đậm và có vạch xanh bên trái).',
    'Override ngoài ý muốn (lỡ kéo một giá trị) làm instance “không ăn” thay đổi của prefab gốc. Chuột phải field → **Revert** để bỏ.',
    'Prefab Variant cũng là một prefab chỉ lưu override so với prefab cha.',
  ],
  'Serializer chỉ lưu field thoả **đồng thời**: \`public\` hoặc \`[SerializeField]\`; không \`static\`, \`const\`, \`readonly\`; kiểu được hỗ trợ (kiểu nguyên thuỷ, enum, string, struct Unity như Vector3/Color, \`UnityEngine.Object\`, class/struct có \`[Serializable]\`, mảng hoặc \`List<T>\` của các kiểu trên).',
]));
C.push(...seeAlso('3.8 Những chỗ Unity lưu theo TÊN, đổi tên là hỏng', [
  ['\`UnityEvent\` (Button.onClick gán trong Inspector)', 'Lưu **tên hàm dạng chuỗi** + object đích. Đổi tên hàm: listener mất âm thầm, không lỗi compile.', 'Gán listener bằng code, hoặc rà lại Inspector sau khi đổi tên'],
  ['\`[field: SerializeField]\` trên auto-property', 'Tên lưu thật là \`<Hp>k__BackingField\`.', 'Đổi tên property phải dùng \`[FormerlySerializedAs("<Hp>k__BackingField")]\`'],
  ['Tham số và state của Animator', 'Code gọi bằng chuỗi; Animator đổi tên thì code vẫn compile.', 'Gom tên vào hằng số + \`Animator.StringToHash\`'],
  ['\`Resources.Load("UI/Popup")\`', 'Tìm theo đường dẫn chuỗi lúc chạy.', 'Kéo thả reference hoặc Addressables'],
  ['\`SendMessage("Die")\`, \`Invoke("Spawn", 1f)\`', 'Gọi hàm bằng tên qua reflection: chậm và vỡ khi đổi tên.', 'Gọi trực tiếp, event, coroutine'],
  ['\`JsonUtility\`', 'Dùng **đúng luật** của serializer Unity: không Dictionary, không property, không đa hình (trừ \`[SerializeReference]\`).', 'Cần linh hoạt hơn: Newtonsoft (xem Phần 6 về stripping)'],
]));
C.push(...demo({
  title: 'Nhìn tận mắt cách Unity lưu dữ liệu', scene: '05_Serialization', slide: 25, script: 'Scripts/05_Serialization/SerializationDemo.cs',
  goal: 'chứng minh Inspector thắng code, ScriptableObject bị ghi đè, serializer cắt kiểu con, và reference là GUID.',
  steps: [
    'Bấm Play. Mục **A**: speed trong code và trong prefab; \`[HideInInspector]\` vẫn giữ 42, \`[NonSerialized]\` về 0, dù cả hai đều được gán 42 lúc dựng scene.',
    'Mục **B**: bấm **+100 vào asset (sai)** vài lần, bấm Stop, chọn \`Assets/_Talk/Data/PlayerConfig.asset\`: giá trị không quay về 100. Play lại, bấm **+100 vào bản sao (đúng)**: asset không đổi. Cuối cùng bấm **Đặt lại asset = 100**.',
    'Mục **C**: \`List<Skill>\` thường trả về \`Skill\` (mất damage); \`[SerializeReference]\` giữ \`FireSkill\`. Field thường gán null thành object rỗng.',
    'Mục **D**: bấm **Mở Player.prefab dạng text** (mở bằng Rider/VS Code), chỉ dòng \`m_Script\` và \`weapon\` có \`guid\`. Bấm **Mở Sword.prefab.meta**: GUID trùng khớp.',
    'Ngoài Play mode: đổi \`speed = 5f\` thành \`10f\` trong \`PlayerStats.cs\`, quay lại Unity: prefab vẫn 5. Chuột phải component → **Reset**: lên 10.',
  ],
  expect: ['Mọi người thấy “Missing reference” và “sửa code không có tác dụng” đều có nguyên nhân rõ ràng.'],
}));

`,
  '// ---- Phần 5 ----': `
C.push(...deep('4.4 Phân tích sâu: bộ nhớ managed và bộ nhớ native', [
  'Game Unity có hai vùng nhớ khác nhau:',
  [
    '**Managed heap (C#):** object C#, string, list, mảng… do GC quản lý. Đây là nơi rác sinh ra và GC chạy.',
    '**Native memory (C++):** texture, mesh, audio clip, material, dữ liệu của mỗi GameObject. GC **không** quản lý vùng này.',
  ],
  'Hệ quả: \`new Texture2D(...)\`, \`Instantiate(material)\`, \`new Mesh()\` mà không \`Destroy\` thì **rò rỉ native memory**. Profiler phần GC Alloc không hiện gì, nhưng RAM tăng dần tới khi game bị hệ điều hành tắt. Dùng **Memory Profiler** để thấy hai vùng này tách riêng.',
  'Chi phí thật của GC nằm ở **lúc dọn**, không phải lúc cấp phát. Cấp phát rất nhanh; dọn thì phải dừng game (stop-the-world) và quét toàn heap. Vì vậy mục tiêu là **giảm số lần dọn** bằng cách không tạo rác trong những đoạn chạy mỗi frame, không phải cấm \`new\` hoàn toàn.',
]));
C.push(...seeAlso('4.5 Những chỗ khác trong Unity hay tạo rác', [
  ['\`StartCoroutine(Routine())\`', 'Mỗi lần gọi tạo một object IEnumerator mới và một Coroutine.', 'Không bắt đầu coroutine mỗi frame; dùng một vòng lặp sống lâu'],
  ['\`Physics.OverlapSphere\`, \`RaycastAll\`', 'Trả về mảng mới.', 'Bản \`NonAlloc\` với mảng có sẵn'],
  ['\`string.Split\`, \`Substring\`, \`ToString()\`', 'Mỗi lần tạo string/mảng mới.', 'Cache kết quả; tránh làm trong Update'],
  ['\`enum.ToString()\`', 'Dùng reflection và tạo string mới.', 'Bảng tra \`string[]\` theo giá trị enum'],
  ['\`OnGUI\` (IMGUI)', 'Tạo rác mỗi lần gọi, có thể gọi nhiều lần mỗi frame.', 'Chỉ dùng cho tool/debug; UI game dùng uGUI hoặc UI Toolkit'],
  ['\`JsonUtility.ToJson\`, log debug', 'String lớn mỗi lần.', 'Chỉ lưu khi dữ liệu thay đổi; log có điều kiện'],
]));
C.push(...demo({
  title: 'Rác sinh ra từ đâu', scene: '06_GarbageCollector', slide: 29, script: 'Scripts/06_GarbageCollector/GcDemo.cs',
  goal: 'đo GC Alloc mỗi frame của 15 đoạn code quen thuộc, và thấy heap không co lại.',
  steps: [
    'Bấm Play với **Không làm gì (mốc)**, đợi 1–2 giây để có số mốc (IMGUI tự nó cũng tạo một ít rác).',
    'Chọn lần lượt: \`"Score: " + i\` → \`$"HP {i}"\` → LINQ → Lambda dùng biến ngoài. Mỗi lần nhìn dòng “Chênh lệch” và “Số lần GC đã chạy” tăng nhanh.',
    'Chọn các cặp đối chứng: \`foreach List<T>\` (0) và \`foreach IEnumerable<T>\` (có rác); Lambda không dùng biến ngoài (0); \`CompareTag\` (0) và \`gameObject.tag\` (có rác).',
    'Bấm **Cấp phát 64 MB** rồi **Bỏ đi + GC.Collect()**: Used giảm nhưng Heap size thường giữ nguyên.',
    'Mở Profiler → CPU → cột GC Alloc để chỉ chính xác hàm \`GcDemo.Update\`.',
  ],
  expect: ['Mọi người nhớ được các mẫu code tạo rác, và hiểu vì sao heap đã phình thì game giữ RAM cao.'],
}));

`,
  '// ---- Phần 6 ----': `
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
  ['\`meshFilter.mesh\`', 'Giống \`renderer.material\`: lần đầu gọi tạo **bản sao mesh** riêng, phải tự Destroy.', '\`sharedMesh\` khi chỉ đọc'],
  ['\`renderer.materials\`', 'Nhân bản **tất cả** material của renderer, trả về mảng mới.', '\`sharedMaterials\`'],
  ['TextMeshPro \`fontMaterial\`', 'Tạo bản sao material font cho riêng text đó.', '\`fontSharedMaterial\` hoặc tạo sẵn Material Preset'],
  ['\`SpriteRenderer.color\`, UI \`Graphic.color\`', 'Là **màu đỉnh** (vertex color), không đụng tới material, nên **không** phá batching.', 'Ưu tiên đổi màu bằng thuộc tính này thay vì sửa material'],
  ['UI \`Text\`/\`TMP\` đổi nội dung', 'Dựng lại mesh chữ và đánh dấu Canvas cần gộp lại.', 'Chỉ gán khi giá trị đổi; tách Canvas động'],
]));
C.push(...demo({
  title: 'Bản sao material và SRP Batcher', scene: '07_Rendering', slide: 34, script: 'Scripts/07_Rendering/RenderingDemo.cs',
  goal: 'cho thấy \`renderer.material\` sinh material mới (rò rỉ nếu không dọn), và MaterialPropertyBlock làm object rơi khỏi SRP Batcher.',
  steps: [
    'Bấm Play. Dòng Render pipeline phải là \`Talk_URP\`. Bật Game view → **Stats**.',
    'Chọn **renderer.material (bản sao)**: “Material sinh thêm” = 100. Tắt **Destroy bản sao khi tạo lại**, bấm **Tạo lại lưới khối** vài lần: con số tăng mãi = rò rỉ.',
    'Mở Window → Analysis → **Frame Debugger** → Enable. Với chế độ bản sao (cùng shader URP/Lit), các khối vẫn nằm trong **SRP Batch**.',
    'Chọn **MaterialPropertyBlock**: trong Frame Debugger, các khối không còn được gộp, ô lý do ghi nguyên nhân.',
    'Tắt toggle **SRP Batcher** để thấy số SetPass trong Stats thay đổi.',
  ],
  expect: ['Chốt: trong URP, “dùng MaterialPropertyBlock cho rẻ” có thể làm chậm hơn. Đo trước khi tin.'],
}));

`,
  '// ---- Kết ----': `
C.push(...deep('6.4 Phân tích sâu: vì sao bản build mobile khác Editor', [
  'Trong Editor, code chạy bằng **Mono có JIT** (biên dịch lúc chạy), kèm nhiều kiểm tra phục vụ debug. Trên iOS bắt buộc **IL2CPP**; trên Android, bản phát hành lên Google Play cần ARM64 nên thực tế cũng dùng IL2CPP.',
  'IL2CPP là **AOT** (biên dịch trước toàn bộ). Không có JIT nghĩa là:',
  [
    'Code sinh kiểu hoặc hàm lúc chạy (\`System.Reflection.Emit\`) không chạy được.',
    'Một số trường hợp generic chỉ được tạo qua reflection có thể thiếu code ở bản build, cần chỉ cho compiler biết trước.',
    'Bước stripping xoá những gì nó không thấy được dùng (mục 6.2).',
  ],
]));
C.push(...seeAlso('6.5 Những lỗi “Editor chạy, build hỏng” hay gặp khác', [
  ['\`Shader.Find("Custom/Outline")\`', 'Bản build chỉ chứa shader được material dùng tới hoặc nằm trong Always Included Shaders. Shader chỉ gọi bằng tên sẽ trả về **null**.', 'Tham chiếu shader qua material/field, hoặc thêm vào Always Included Shaders'],
  ['\`AssetDatabase\`, \`EditorUtility\`… trong script runtime', 'Namespace \`UnityEditor\` không có trong bản build: lỗi compile **chỉ lúc build**.', 'Bọc trong \`#if UNITY_EDITOR\` hoặc đặt file vào thư mục \`Editor\`'],
  ['Thư mục \`Resources\`', 'Mọi thứ trong đó đều vào bản build, kể cả không dùng; tăng dung lượng và thời gian khởi động.', 'Hạn chế; dùng reference trực tiếp hoặc Addressables'],
  ['Đường dẫn file', '\`Application.dataPath\` trên điện thoại chỉ đọc; đọc/ghi file phải dùng \`persistentDataPath\`.', 'Lưu dữ liệu vào \`persistentDataPath\`'],
  ['Input chuột', 'Trong Editor thử bằng chuột; trên điện thoại là touch, multi-touch.', 'Test trên máy thật; xử lý \`touchCount\`'],
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

`,
};

for (const [marker, replacement] of Object.entries(parts)) {
  const end = src.indexOf(marker);
  const start = src.lastIndexOf('C.push(...demo(', end);
  if (end < 0 || start < 0) throw new Error('marker not found: ' + marker);
  src = src.slice(0, start) + replacement.trimStart() + src.slice(end);
}
fs.writeFileSync(file, src);
console.log('patched', Object.keys(parts).length);
