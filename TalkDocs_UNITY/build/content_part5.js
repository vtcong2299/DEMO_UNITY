const { H1, callout, image, item, demo, deep, seeAlso, summary, table } = require('./lib');

module.exports = function part5() {
  const C = [];
  C.push(H1('Phần 5. Rendering: những dòng code trông vô hại'));
  C.push(...callout('Ý chính của phần', 'Vài dòng code rất bình thường có thể âm thầm tạo material mới (rò rỉ bộ nhớ), làm tăng số lần vẽ, hoặc làm cả Canvas phải dựng lại. Phần này cũng cho thấy **lời khuyên tối ưu cũ có ngoại lệ** khi dùng URP.', 'key'));

  C.push(...item({
    title: '5.0 Đọc số liệu rendering: draw call, batch, SetPass là gì', level: 'co_ban',
    situation: 'Mở Game view → Stats thấy hàng loạt con số, không biết nên nhìn số nào.',
    api: [
      ['Draw Call', 'Một lệnh CPU gửi cho GPU: “vẽ mesh này với material này”.', 'Draw call nhiều chưa chắc chậm nếu chúng rẻ (ví dụ được SRP Batcher gộp).'],
      ['Batch', 'Một nhóm lần vẽ được CPU chuẩn bị và gửi cùng nhau (cột **Batches** trong Stats).', 'Gộp được càng nhiều thì càng ít batch.'],
      ['SetPass Call', 'Một lần đổi shader pass / trạng thái render trên GPU.', '**Đắt nhất phía CPU**. Đây là số nên nhìn đầu tiên.'],
      ['Saved by batching', 'Số lần vẽ đã được gộp lại (Built-in RP).', 'URP dùng SRP Batcher nên số này ít ý nghĩa hơn.'],
      ['Triangles / Vertices', 'Số tam giác / đỉnh GPU phải xử lý mỗi frame.', 'Liên quan tới GPU, không phải CPU.'],
      ['Stats (Game view)', 'Bảng số liệu nhanh của frame hiện tại.', 'Chỉ là ước lượng trong Editor.'],
      ['Frame Debugger', 'Xem từng lần vẽ, nhóm SRP Batch và **lý do** hai lần vẽ không gộp được.', 'Window → Analysis → Frame Debugger.'],
      ['`ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count")`', 'Đọc số liệu rendering ngay trong code (demo 07 dùng).', 'Unity 6.4 tách lần vẽ theo đường đi: "SRP Batcher Draw Calls Count", "Standard Draw Calls Count", "Standard Instanced Draw Calls Count"; tên cũ "Draw Calls Count", "Batches Count" luôn trả về 0. Còn có "Triangles Count", "Vertices Count".'],
    ],
    truth: [
      'Mỗi object hiện lên màn hình có thể bị vẽ **nhiều lần**: một lần cho **bóng đổ** (shadow caster) với mỗi đèn có bóng, có thể thêm một lần **depth prepass**, rồi lần vẽ **màu** chính. Vì vậy 100 khối với 1 đèn có bóng cho ra khoảng **200 draw call** (đúng như cửa sổ Stats trong demo 07).',
      'Phía CPU, cái đắt là **chuẩn bị trạng thái** (SetPass) chứ không phải bản thân lệnh vẽ. SRP Batcher giữ dữ liệu material sẵn trên GPU nên nhiều draw call liên tiếp cùng shader chỉ tốn rất ít.',
      'Thứ tự nên nhìn trong URP: **SetPass Calls** → **Batches** → Draw Calls → Triangles/Vertices.',
    ],
    extra: table(['Số liệu', 'Đọc thế nào', 'Thường do đâu khi cao'], [
      ['SetPass Calls', 'Càng thấp càng tốt; tăng vọt là dấu hiệu phải xem ngay.', 'Nhiều shader/variant khác nhau; SRP Batcher tắt hoặc bị phá (MaterialPropertyBlock, shader không tương thích).'],
      ['Batches', 'So giữa hai cách làm cùng một cảnh.', 'Object không gộp được: khác material (Built-in), khác shader variant (URP), UI nhiều Canvas.'],
      ['Draw Calls', 'Tự nó chưa nói lên nhiều trong URP.', 'Nhiều object, nhiều pass (bóng, depth).'],
      ['Triangles / Vertices', 'Liên quan độ chi tiết mesh.', 'Mesh quá chi tiết, thiếu LOD.'],
    ], [22, 36, 42]),
    good: `using Unity.Profiling;

ProfilerRecorder _setPass;
void OnEnable()  => _setPass = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count");
void OnDisable() => _setPass.Dispose();
void LogStats()  => Debug.Log("SetPass của frame trước: " + _setPass.LastValue);`,
    remember: 'Trong URP nhìn **SetPass Calls** và **Batches** trước. Draw call cao chưa chắc chậm. Muốn biết vì sao không gộp: **Frame Debugger**.',
  }));

  C.push(...item({
    title: '5.1 renderer.material tạo bản sao material', level: 'co_ban',
    situation: 'Nháy đỏ một kẻ địch khi bị trúng đòn.',
    bad: `void Flash()
{
    GetComponent<Renderer>().material.color = Color.red;   // lần đầu gọi: tạo bản sao material
}`,
    api: [
      ['`renderer.material`', 'Lấy material **riêng** của renderer này.', 'Lần đầu gọi, Unity **tạo bản sao** (tên có “(Instance)”). Bản sao không tự bị xoá.'],
      ['`renderer.sharedMaterial`', 'Lấy material **dùng chung** (asset gốc).', 'Sửa nó là sửa cho mọi object dùng chung; trong Editor là sửa luôn file asset.'],
      ['`material.color` / `material.SetColor(id, color)`', 'Đổi màu chính / đổi một thuộc tính màu của material.', 'URP Lit dùng thuộc tính `_BaseColor`.'],
      ['`Destroy(material)`', 'Huỷ một material (bộ nhớ native).', 'Bắt buộc với bản sao tự tạo.'],
    ],
    truth: 'Lần đầu đọc `renderer.material`, Unity tạo một **bản sao** material riêng cho renderer đó. Bản sao không tự bị xoá khi object bị Destroy.',
    effect: [
      '**Rò rỉ bộ nhớ:** mỗi object một material mới, không ai dọn.',
      'Built-in Render Pipeline: object không còn dùng chung material nên **mất static/dynamic batching**, số lần vẽ tăng.',
      'URP có SRP Batcher: ảnh hưởng tới số lần vẽ nhỏ hơn (5.3), nhưng vấn đề bộ nhớ vẫn còn.',
    ],
    good: `Material _flashMaterial;

void Awake() => _flashMaterial = GetComponent<Renderer>().material;   // tạo bản sao 1 lần, có chủ đích
void Flash() => _flashMaterial.color = Color.red;
void OnDestroy() => Destroy(_flashMaterial);                         // tự dọn bản sao`,
    compare: [
      ['`renderer.material` mỗi lần cần', 'Viết nhanh; chỉ ảnh hưởng object này.', 'Tạo bản sao không ai dọn; dễ rò rỉ.', 'Không nên gọi tuỳ tiện.'],
      ['`material` 1 lần + `Destroy` khi xong', 'Màu riêng cho từng object, không rò rỉ.', 'Mỗi object một material (tốn bộ nhớ).', 'Vài object cần màu riêng lâu dài.'],
      ['`sharedMaterial`', 'Không tạo gì mới.', 'Đổi cho tất cả object dùng chung; trong Editor ghi vào asset.', 'Đổi cho cả nhóm cùng lúc.'],
      ['`MaterialPropertyBlock`', 'Không tạo material mới.', 'Trong URP làm mất SRP Batcher (5.3).', 'Built-in RP, hoặc GPU Instancing.'],
    ],
    remember: '`renderer.material` = **tạo bản sao**. Tạo thì phải **Destroy**. Đổi cho cả nhóm: `sharedMaterial`.',
  }));

  C.push(...item({
    title: '5.2 Truyền tên dạng chuỗi cho Animator và Shader', level: 'trung_binh',
    situation: 'Điều khiển animation nhảy, chạy, và đổi màu bằng code.',
    bad: `animator.SetTrigger("Jump");
animator.SetFloat("Speed", v);
material.SetColor("_BaseColor", c);`,
    api: [
      ['`animator.SetTrigger(name)`', 'Bật một trigger trong Animator (chuyển state một lần).', 'Có overload nhận `int` id.'],
      ['`animator.SetFloat(name, value)`', 'Đặt giá trị tham số float của Animator.', 'Có overload nhận `int` id.'],
      ['`Animator.StringToHash("Jump")`', 'Đổi tên tham số Animator thành số nguyên id.', 'Gọi 1 lần, lưu vào `static readonly int`.'],
      ['`Shader.PropertyToID("_BaseColor")`', 'Đổi tên thuộc tính shader thành số nguyên id.', 'Gọi 1 lần, dùng cho `SetColor`, `SetFloat`…'],
    ],
    truth: 'Bên trong, Unity không dùng chuỗi mà dùng **số nguyên (id)**. Mỗi lần truyền chuỗi, Unity phải băm chuỗi thành số rồi mới tra cứu.',
    good: `static readonly int JumpHash  = Animator.StringToHash("Jump");
static readonly int SpeedHash = Animator.StringToHash("Speed");
static readonly int BaseColor = Shader.PropertyToID("_BaseColor");

animator.SetTrigger(JumpHash);
animator.SetFloat(SpeedHash, v);
material.SetColor(BaseColor, c);`,
    compare: [
      ['Truyền chuỗi', 'Dễ đọc tại chỗ.', 'Băm chuỗi mỗi lần; gõ sai tên phải tìm khắp code.', 'Code chạy hiếm, prototype.'],
      ['Id lưu sẵn (`StringToHash`, `PropertyToID`)', 'Nhanh hơn; tên nằm một chỗ, sửa một chỗ; Find Usages được.', 'Thêm vài dòng khai báo.', 'Mọi code chạy thường xuyên.'],
    ],
    remember: 'Tên tham số Animator/Shader: **băm 1 lần** thành id, lưu `static readonly int`.',
  }));

  C.push(...item({
    title: '5.3 SRP Batcher: lời khuyên cũ có ngoại lệ', level: 'nang_cao',
    situation: '100 khối cùng mesh, mỗi khối một màu, project dùng URP.',
    api: [
      ['`MaterialPropertyBlock`', 'Gói giá trị thuộc tính (màu, số…) gắn riêng cho một renderer mà không tạo material mới.', 'Trong URP: renderer có block **không còn tương thích SRP Batcher**.'],
      ['`renderer.SetPropertyBlock(block)`', 'Gắn block vào renderer.', '-'],
      ['SRP Batcher', 'Cơ chế của URP/HDRP giữ dữ liệu material sẵn trên GPU và gộp các lần vẽ cùng **shader variant**.', 'Bật/tắt trong URP Asset hoặc `GraphicsSettings.useScriptableRenderPipelineBatching`.'],
      ['Shader variant', 'Một phiên bản biên dịch của shader với một bộ tuỳ chọn (keyword) cụ thể.', 'Nhiều material cùng shader + cùng keyword = cùng variant.'],
      ['Frame Debugger', 'Công cụ xem từng lần vẽ trong frame (Window → Analysis → Frame Debugger).', 'Ghi rõ lý do hai lần vẽ không gộp được.'],
    ],
    extra: image('srp_batcher', 620, 'Hình 6. Trong URP, nhiều material cùng shader vẫn gộp được; MaterialPropertyBlock lại làm mất khả năng gộp'),
    truth: [
      'Lời khuyên quen thuộc: “Đổi màu từng object mà không tạo material mới thì dùng **MaterialPropertyBlock**.” Đúng với **Built-in Render Pipeline**.',
      'Trong **URP**, SRP Batcher gộp theo **shader variant**, không theo material: nhiều material khác nhau dùng chung shader vẫn vẽ rất rẻ.',
      'Renderer gắn MaterialPropertyBlock lại **không còn tương thích SRP Batcher**, bị vẽ theo đường chậm hơn.',
    ],
    effect: 'Áp dụng lời khuyên cũ vào project URP có thể làm game **chậm hơn**.',
    good: `// Trong URP:
// - Ưu tiên: nhiều material (hoặc material variant) dùng chung 1 shader.
// - MaterialPropertyBlock chỉ khi đã đo và thấy lợi
//   (ví dụ: hàng nghìn object giống hệt nhau vẽ bằng GPU Instancing).
// Kiểm tra: chọn shader trong Project → Inspector ghi "SRP Batcher: compatible".`,
    compare: [
      ['Nhiều material cùng shader (URP)', 'Vẫn được SRP Batcher gộp; rõ ràng, chỉnh được trong Inspector.', 'Nhiều asset/bản sao material, tốn bộ nhớ hơn chút.', 'URP, số lượng màu/biến thể vừa phải.'],
      ['`MaterialPropertyBlock` (URP)', 'Không tạo material mới.', 'Mất SRP Batcher, có thể chậm hơn.', 'Chỉ khi dùng GPU Instancing và đã đo.'],
      ['`MaterialPropertyBlock` (Built-in RP)', 'Rẻ, giữ được batching.', 'Code phức tạp hơn gán màu.', 'Project Built-in RP.'],
    ],
    notes: [['Bài học', 'Mọi lời khuyên tối ưu đều có điều kiện. Luôn **đo bằng Frame Debugger hoặc Profiler** trên đúng render pipeline trước khi áp dụng.', 'key']],
    remember: 'Trong URP: **nhiều material cùng shader** vẫn rẻ; **MaterialPropertyBlock làm mất SRP Batcher**. Đo trước khi tin.',
  }));

  C.push(...item({
    title: '5.4 UI: một thay đổi nhỏ làm cả Canvas phải dựng lại', level: 'nang_cao',
    situation: 'Màn hình chính có nhiều UI tĩnh (nền, khung, 40 icon) và một đồng hồ đếm ngược đổi mỗi frame, tất cả trong một Canvas.',
    bad: `// HUD.cs: cùng Canvas với cả màn hình
void Update()
{
    remain -= Time.deltaTime;
    timerText.text = $"{remain:F2}";   // đổi mỗi frame → cả Canvas dựng lại mỗi frame
    hpFill.fillAmount = hp / maxHp;    // HP hồi dần → thêm một lý do dựng lại
}`,
    api: [
      ['`Canvas`', 'Component gom mọi phần tử UI con thành ít lần vẽ nhất.', 'Một phần tử đổi là cả Canvas phải gộp lại.'],
      ['`canvas.enabled = false`', 'Tắt riêng component Canvas: UI không vẽ nhưng dữ liệu đã dựng vẫn giữ.', 'Bật lại không phải dựng lại.'],
      ['`gameObject.SetActive(false)`', 'Tắt cả GameObject UI.', 'Bật lại phải dựng lại toàn bộ.'],
      ['`CanvasGroup.alpha` / `.blocksRaycasts`', 'Làm mờ/ẩn cả nhóm UI và chặn/nhận thao tác chạm.', 'Ẩn bằng alpha = 0 vẫn vẽ (tốn GPU).'],
      ['`Graphic.raycastTarget`', 'Phần tử UI có nhận chạm/click hay không.', 'Tắt cho thứ không bấm được để giảm việc dò chạm.'],
      ['LayoutGroup, ContentSizeFitter', 'Tự sắp xếp và co giãn phần tử UI.', 'Tính lại layout mỗi khi con thay đổi; lồng nhau rất tốn.'],
    ],
    extra: [
      ...image('canvas', 620, 'Hình 7. Tách phần UI hay thay đổi ra Canvas riêng'),
      ...table(['Ví dụ hay gặp', 'Unity phải làm lại gì', 'Nên viết'], [
        ['Đồng hồ `$"{remain:F2}"` gán mỗi frame trong Canvas HUD chung.', 'Mesh chữ mới + gom lại **cả HUD** mỗi frame; thêm rác string.', 'Đồng hồ ở Canvas con riêng; hiển thị theo giây và chỉ gán khi số giây đổi (`SetText("{0}", sec)`).'],
        ['Icon loading xoay / nút “Chơi” nhịp scale bằng Animator hoặc tween lặp vô hạn.', 'Animator ghi RectTransform mỗi frame → Canvas chứa nó dựng lại mỗi frame, kể cả khi màn hình “đứng yên”.', 'Đặt phần tử chuyển động trong Canvas con riêng; dừng tween/Animator khi panel ẩn.'],
        ['Thanh máu hồi dần, thanh tiến trình tải chạy liên tục.', 'fillAmount đổi mỗi frame → dựng lại Canvas chứa thanh.', 'Canvas con cho các thanh động; HUD tĩnh để ở Canvas khác.'],
        ['Danh sách 100 dòng trong VerticalLayoutGroup + ContentSizeFitter; đổi text của 1 dòng.', 'Text đổi độ dài → kích thước dòng đổi → **tính lại layout cả danh sách**, rồi dựng lại Canvas.', 'Cố định chiều cao dòng; danh sách dài dùng ScrollRect + pool (chỉ tạo dòng đang thấy); tránh LayoutGroup lồng nhau.'],
        ['Popup mở/đóng nhiều lần bằng `SetActive(true/false)`.', 'Mỗi lần bật: OnEnable của mọi phần tử, tính lại layout, dựng lại toàn bộ mesh.', '`canvas.enabled = false/true` (giữ mesh đã dựng) cho popup mở thường xuyên.'],
        ['30 thanh máu World Space trên đầu quái, chung một Canvas.', 'Một con bị đánh → cả 30 thanh dựng lại.', 'Mỗi thanh một Canvas nhỏ, hoặc vẽ bằng SpriteRenderer thay vì UI.'],
      ], [30, 36, 34]),
    ],
    truth: [
      'Canvas gộp **toàn bộ** phần tử con thành ít lần vẽ nhất. Khi **một** phần tử thay đổi (text, màu, vị trí, bật/tắt), cả Canvas bị đánh dấu “bẩn” và phải gộp lại.',
      'Có LayoutGroup hoặc ContentSizeFitter thì Unity còn phải **tính lại layout**. LayoutGroup lồng nhau là chỗ tốn nhất.',
      'Có **hai loại dựng lại**: (1) **dựng lại lần vẽ của Canvas**: gom lại mesh của mọi phần tử con thành các lần vẽ, xảy ra khi bất kỳ phần tử nào đổi hình dạng, màu, vị trí hay bật/tắt; (2) **dựng lại layout**: khi kích thước một phần tử đổi trong LayoutGroup/ContentSizeFitter, Unity tính lại vị trí và kích thước của cả nhóm, lan lên tới LayoutGroup ngoài cùng.',
      'Cả hai chạy ở cuối frame, ngay trước khi vẽ, trong mục **Canvas.SendWillRenderCanvases** và **Canvas.BuildBatch** của Profiler (CPU Usage). Module **UI** trong Profiler cho biết Canvas nào đang bị dựng lại và bao nhiêu lần vẽ.',
      'Gán **cùng một giá trị** (cùng màu, cùng fillAmount, cùng chuỗi) thì Unity tự bỏ qua, không dựng lại. Thứ làm tốn là giá trị **thật sự đổi mỗi frame**: đồng hồ có phần thập phân, thanh máu hồi dần, Animator/tween chạy liên tục, icon xoay.',
    ],
    effect: 'Đồng hồ đổi mỗi frame trong cùng Canvas với cả màn hình UI → tốn CPU mỗi frame dù “chỉ đổi một con số”.',
    good: `// Đồng hồ: chỉ gán khi số giây đổi (đặt timerText trong Canvas con riêng)
int sec = Mathf.CeilToInt(remain);
if (sec != _lastSec) { _lastSec = sec; timerText.SetText("{0}", sec); }

// 1. Tách Canvas: phần tĩnh (nền, khung) và phần động (điểm, đồng hồ) ở 2 Canvas khác nhau.
//    Canvas con lồng trong Canvas cha cũng tính là một khối gộp riêng.
// 2. Tắt Raycast Target cho Image/Text không cần bấm.
// 3. Ẩn/hiện thường xuyên: tắt component Canvas thay vì SetActive(false).
canvas.enabled = false;
// 4. Tránh LayoutGroup lồng nhau cho nội dung đổi liên tục.`,
    compare: [
      ['`SetActive(false)`', 'Tắt hẳn: không vẽ, không chạy script.', 'Bật lại phải dựng lại UI; script chạy lại OnEnable.', 'Panel ít khi mở.'],
      ['`canvas.enabled = false`', 'Bật lại không phải dựng lại.', 'Script trên object vẫn chạy.', 'UI ẩn/hiện thường xuyên.'],
      ['`CanvasGroup.alpha = 0`', 'Dùng được để làm hiệu ứng mờ dần.', 'Vẫn vẽ (tốn GPU) nếu chỉ đặt alpha.', 'Hiệu ứng fade, kết hợp tắt khi xong.'],
    ],
    remember: '**Tách Canvas tĩnh/động**, tắt **Raycast Target** thừa, ẩn/hiện liên tục bằng **canvas.enabled**.',
  }));

  C.push(...deep('5.5 Phân tích sâu: một lần vẽ tốn gì ở phía CPU', [
    'Mỗi object hiện lên màn hình cần CPU chuẩn bị: chọn shader và trạng thái GPU (**SetPass call**), gửi dữ liệu material và vị trí, rồi ra lệnh vẽ (**draw call**). Đổi shader/trạng thái là phần đắt nhất. Các kỹ thuật gộp đều nhằm giảm số lần đổi:',
    [
      '**Static batching:** gộp sẵn mesh của object đánh dấu Static lúc build. Tốn thêm RAM, object không được di chuyển.',
      '**Dynamic batching:** gộp mesh nhỏ lúc chạy. Chủ yếu có ích ở Built-in RP.',
      '**SRP Batcher (URP/HDRP):** giữ dữ liệu material trên GPU, gộp theo **shader variant**.',
      '**GPU Instancing:** vẽ nhiều bản của **cùng mesh + cùng material** trong một lệnh.',
      '**GPU Resident Drawer (Unity 6, URP):** để GPU tự quản lý phần lớn việc vẽ, giảm việc của CPU. Cần bật trong URP Asset và có điều kiện đi kèm.',
    ],
    'Câu đúng hơn câu “ít material thì nhanh” là: **ít shader variant và ít lần đổi trạng thái thì nhanh**.',
  ]));
  C.push(...seeAlso('5.6 Cùng kiểu “lấy ra là nhân bản” và các lựa chọn rẻ hơn', [
    ['`meshFilter.mesh`', 'Giống `renderer.material`: lần đầu gọi tạo **bản sao mesh**, phải tự Destroy.', '`sharedMesh` khi chỉ đọc.'],
    ['`renderer.materials`', 'Nhân bản **tất cả** material, trả về mảng mới.', '`sharedMaterials`.'],
    ['TextMeshPro `fontMaterial`', 'Tạo bản sao material font cho riêng text đó.', '`fontSharedMaterial` hoặc Material Preset có sẵn.'],
    ['`SpriteRenderer.color`, UI `Graphic.color`', 'Là **màu đỉnh** (vertex color), không đụng material, nên **không** phá batching.', 'Ưu tiên đổi màu bằng thuộc tính này.'],
    ['UI `Text`/`TMP` đổi nội dung', 'Dựng lại mesh chữ và đánh dấu Canvas cần gộp lại.', 'Chỉ gán khi giá trị đổi; tách Canvas động.'],
  ]));

  C.push(...demo({
    title: 'Đổi màu từng object: cách nào rẻ?', scene: '07_Rendering', slide: 37, script: '07_Rendering/RenderingDemo.cs',
    goal: 'thấy `renderer.material` sinh material mới (rò rỉ nếu không dọn), MaterialPropertyBlock làm object rơi khỏi SRP Batcher, và đọc được Draw Calls / SetPass bằng số.',
    prepare: [
      'Bật nút **Stats** ở góc trên Game view để đối chiếu (đặt Stats sao cho không che bảng Kết quả).',
      'Mở **Window → Analysis → Frame Debugger**, để sẵn bên cạnh Game view.',
      'Mỗi lần đổi chế độ, demo **tự chụp số liệu sau 1 giây** thành một dòng “Draw … (SRP Batcher …) · SetPass …” trong bảng Kết quả, để so sánh các chế độ với nhau.',
      'Khoảng **70 lần vẽ và 70 SetPass cố định** là của chính giao diện demo (IMGUI). Phần của 100 khối là phần **chênh lệch** giữa các chế độ.',
    ],
    steps: [
      ['Bấm Play, bấm **1 · Chế độ sharedMaterial (dùng chung)**.', 'Lưới 100 khối cùng màu; “Material sinh thêm” = **0**. Dòng chụp số liệu đầu tiên làm **mốc**: SRP Batcher **200** lần vẽ (mỗi khối vẽ 2 lần: bóng + màu), SetPass khoảng **60–75** (gần như toàn bộ là giao diện demo).', 'Đọc số liệu rendering (5.0).'],
      ['Bấm **2 · Chế độ renderer.material (bản sao)**.', 'Khối có màu cầu vồng; “Material sinh thêm” = **100**. Dòng chụp số liệu mới: Draw Calls và SetPass **gần như bằng mốc**.', 'Mỗi khối một bản sao material (5.1), nhưng cùng shader nên SRP Batcher vẫn gộp (5.3).'],
      ['Trong Frame Debugger bấm **Enable**, mở nhóm vẽ object trong cây bên trái, rồi bấm **Disable**.', 'Các khối nằm trong mục **SRP Batch**.', 'Kiểm chứng bằng mắt.'],
      ['Vẫn ở chế độ 2, tắt **5 · SRP Batcher**. Sau 1 giây bật lại.', 'Dòng “SRP Batcher tắt”: **SetPass tăng thêm khoảng 100** (mỗi material một lần đổi trạng thái; máy thử: 76 → 175). Bật lại: giảm về như cũ.', 'SRP Batcher là thứ làm 100 material vẫn rẻ.'],
      ['Bấm **3 · Tắt dọn bản sao, rồi Tạo lại lưới** 3 lần.', '“Material sinh thêm” tăng 200, 300, 400 (đỏ). Bước 4 sẽ bật lại việc dọn.', 'Bản sao không tự bị xoá = rò rỉ bộ nhớ.'],
      ['Bấm **4 · Chế độ MaterialPropertyBlock**.', '“Material sinh thêm” về **0**. Dòng chụp số liệu: SRP Batcher **0**, toàn bộ 200 lần vẽ đi đường thường, **SetPass tăng khoảng 200** (máy thử: 76 → 275, cao hơn cả khi tắt SRP Batcher). Frame Debugger: các khối **không còn** trong SRP Batch, ô lý do ghi nguyên nhân.', 'Đây là hành vi **bình thường** của URP: object có MPB không vào được SRP Batcher, mỗi lần vẽ phải đặt lại trạng thái riêng (5.3).'],
    ],
    after: [
      ['Tắt Frame Debugger', 'Nhớ bấm **Disable** trong Frame Debugger sau khi xem, nếu không game sẽ đứng ở frame đang xem.', 'warn'],
      ['Về con số', 'Số trong Editor bao gồm cả các lần vẽ của Scene view/giao diện khác nếu đang mở; hãy so **giữa các chế độ** trong cùng một lần chạy. Con số chính xác nhất là trên bản Development chạy trên máy thật.', 'info'],
    ],
  }));

  C.push(...summary(5, [
    ['Đổi màu một object lâu dài', '`renderer.material` 1 lần, lưu lại, `Destroy` khi xong.', 'Gọi `renderer.material` tuỳ tiện, không dọn.'],
    ['Đổi màu cả nhóm', '`sharedMaterial` (nhớ: Editor ghi vào asset).', 'Đổi từng `renderer.material`.'],
    ['Màu sprite / UI', '`SpriteRenderer.color`, `Graphic.color`.', 'Tạo material riêng cho sprite/UI.'],
    ['Tham số Animator / Shader', '`Animator.StringToHash`, `Shader.PropertyToID` lưu sẵn.', 'Truyền chuỗi mỗi lần gọi.'],
    ['Nhiều object khác màu trong URP', 'Nhiều material cùng shader (SRP Batcher).', 'Mặc định dùng MaterialPropertyBlock.'],
    ['Đọc số liệu rendering', 'Nhìn SetPass, Batches trước; dùng Frame Debugger tìm lý do.', 'Chỉ nhìn Draw Calls rồi kết luận.'],
    ['UI đổi liên tục', 'Tách Canvas động; tắt Raycast Target thừa.', 'Một Canvas cho cả màn hình.'],
    ['UI ẩn/hiện thường xuyên', '`canvas.enabled`.', '`SetActive` liên tục.'],
  ]));
  return C;
};
