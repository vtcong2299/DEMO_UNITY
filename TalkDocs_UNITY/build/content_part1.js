const { H1, callout, image, item, demo, deep, seeAlso, summary } = require('./lib');

module.exports = function part1() {
  const C = [];
  C.push(H1('Phần 1. Mỗi object Unity có hai nửa: C# và C++'));
  C.push(...callout('Ý chính của phần', 'Code của mình viết bằng C#, còn engine Unity viết bằng C++. Mỗi `GameObject`, `Component`, `Material`… mình cầm trong code chỉ là **vỏ C#** trỏ sang **object thật bên C++**. Mỗi lần gọi API của Unity là một lần đi qua ranh giới giữa hai bên. Hiểu điều này sẽ giải thích được fake null, chi phí GetComponent và vì sao Update rỗng vẫn tốn.', 'key'));
  C.push(...image('two_worlds', 620, 'Hình 1. Mỗi UnityEngine.Object gồm vỏ C# và object thật bên C++'));

  C.push(...item({
    title: '1.1 Lưu lại kết quả GetComponent', level: 'co_ban',
    situation: 'Mỗi frame cần đẩy nhân vật lên bằng Rigidbody.',
    bad: `void Update()
{
    GetComponent<Rigidbody>().AddForce(Vector3.up); // tìm lại mỗi frame
}`,
    api: [
      ['`GetComponent<T>()`', 'Tìm component kiểu T trên cùng GameObject. Không có thì trả về null.', 'Mỗi lần gọi phải duyệt danh sách component và gọi xuống engine.'],
      ['`Rigidbody.AddForce(lực)`', 'Đẩy vật thể bằng một lực vật lý.', 'Nên gọi trong FixedUpdate để đều với bước vật lý.'],
      ['`Awake()`', 'Unity tự gọi 1 lần khi object được tạo, trước `Start`.', 'Chỗ hợp lý để lấy component của chính mình.'],
      ['`FixedUpdate()`', 'Unity gọi theo bước vật lý cố định (mặc định 50 lần/giây).', 'Có thể chạy 0 hoặc nhiều lần mỗi frame (Phần 2).'],
    ],
    truth: '`GetComponent` duyệt danh sách component trên GameObject và phải đi từ C# sang C++ rồi quay về. Gọi một lần thì rất rẻ, nhưng gọi mỗi frame trên hàng trăm object thì chi phí cộng dồn.',
    effect: 'Tốn CPU vô ích mỗi frame. Code cũng khó đọc vì phụ thuộc bị ẩn trong thân hàm.',
    good: `Rigidbody _rb;

void Awake() => _rb = GetComponent<Rigidbody>();   // lấy 1 lần

void FixedUpdate() => _rb.AddForce(Vector3.up);    // dùng lại field`,
    compare: [
      ['Gọi GetComponent mỗi lần', 'Luôn lấy đúng component hiện tại, kể cả khi vừa thêm/xoá.', 'Tốn chi phí gọi engine mỗi lần.', 'Code chạy hiếm: một lần khi va chạm, khi bấm nút.'],
      ['Lưu vào field trong Awake', 'Nhanh nhất; phụ thuộc rõ ràng ở đầu class.', 'Component bị xoá/thay sau đó thì field thành fake null.', 'Component dùng thường xuyên và không đổi (đa số trường hợp).'],
      ['Kéo thả bằng `[SerializeField]`', 'Không tốn gì lúc chạy; lấy được cả component ở object khác.', 'Phải gán tay trong Inspector; quên gán thì null.', 'Component nằm ở object khác hoặc trong prefab.'],
    ],
    remember: 'Component dùng nhiều lần: lấy **1 lần trong Awake**, lưu vào field.',
  }));

  C.push(...item({
    title: '1.2 So sánh tag bằng CompareTag', level: 'co_ban',
    situation: 'Va chạm thì kiểm tra có phải kẻ địch không.',
    bad: `void OnTriggerEnter(Collider other)
{
    if (other.tag == "Enemy") { ... }
}`,
    api: [
      ['`OnTriggerEnter(Collider other)`', 'Unity gọi khi một collider đi vào vùng trigger.', 'Một trong hai object phải có Rigidbody.'],
      ['`gameObject.tag`', 'Đọc tên tag của GameObject dưới dạng string.', 'Mỗi lần đọc tạo một string mới (rác bộ nhớ).'],
      ['`CompareTag("Enemy")`', 'So tag với một tên, trả về true/false.', 'Không tạo string. Tag chưa khai báo trong Tags & Layers sẽ báo lỗi ngay.'],
    ],
    truth: 'Mỗi lần đọc `.tag`, Unity lấy chuỗi từ C++ và tạo **một string mới** bên C#. `CompareTag` so sánh ngay bên C++ nên không tạo gì.',
    effect: 'Tạo rác bộ nhớ trong mỗi lần va chạm; nhiều va chạm thì Garbage Collector phải chạy thường xuyên hơn (Phần 4).',
    good: `void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Enemy")) { ... }   // không tạo string
}`,
    compare: [
      ['`tag == "Enemy"`', 'Quen tay; lấy được cả tên tag để in log.', 'Tạo string mỗi lần; gõ sai tên tag không báo lỗi, chỉ âm thầm sai.', 'Chỉ khi cần đọc tên tag để hiển thị/log.'],
      ['`CompareTag("Enemy")`', 'Không tạo rác; gõ sai tên tag báo lỗi ngay.', 'Chỉ trả lời đúng/sai, không lấy được tên.', 'Mọi lần kiểm tra tag.'],
    ],
    remember: 'Kiểm tra tag: luôn dùng **CompareTag**.',
  }));

  C.push(...item({
    title: '1.3 Mỗi lần đọc property là một lần gọi xuống engine', level: 'trung_binh',
    situation: 'Dịch nhân vật sang phải 1 đơn vị.',
    bad: `transform.position = new Vector3(transform.position.x + 1,
                                 transform.position.y,
                                 transform.position.z);`,
    api: [
      ['`transform.position`', 'Vị trí của object trong thế giới (world space).', 'Là **property**, không phải biến: mỗi lần đọc/ghi là một lần gọi xuống engine. Với object có cha, Unity phải tính từ chuỗi cha.'],
      ['`transform.localPosition`', 'Vị trí so với object cha.', 'Rẻ hơn khi chỉ cần vị trí tương đối.'],
      ['`transform.SetPositionAndRotation(pos, rot)`', 'Đặt vị trí và góc quay trong 1 lần gọi.', 'Rẻ hơn gán `position` rồi `rotation` riêng (2 lần cập nhật cây transform).'],
      ['`Vector3`', 'Kiểu struct chứa x, y, z.', 'Là struct nên `position` trả về một **bản sao**; không gán được `transform.position.x = 5` (lỗi compile).'],
    ],
    truth: 'Dòng trên đọc `transform.position` **3 lần** và ghi 1 lần, tức là 4 lần qua ranh giới C# ⇄ C++.',
    effect: 'Trong vòng lặp lớn (hàng trăm object, mỗi frame) chi phí này đáng kể hơn nhiều người nghĩ. Demo 02 đo được chênh lệch.',
    good: `var p = transform.position;   // đọc 1 lần vào biến cục bộ
p.x += 1;
transform.position = p;        // ghi 1 lần

transform.SetPositionAndRotation(p, rot);   // đặt cả hai trong 1 lần gọi`,
    compare: [
      ['Đọc property nhiều lần trong 1 biểu thức', 'Viết ngắn.', 'Mỗi lần đọc là 1 lần gọi engine.', 'Không nên trong code chạy mỗi frame.'],
      ['Đọc 1 lần vào biến cục bộ', 'Ít lần gọi nhất; dễ debug (xem được giá trị).', 'Thêm 1–2 dòng code.', 'Mọi chỗ cần dùng giá trị nhiều lần.'],
    ],
    remember: 'Cần dùng property của Unity nhiều lần: **đọc 1 lần vào biến**, sửa biến, **ghi 1 lần**.',
  }));

  C.push(...item({
    title: '1.4 Họ hàm Find và Camera.main', level: 'trung_binh',
    situation: 'Cần tham chiếu tới Player, camera, thanh máu.',
    bad: `void Update()
{
    var player = FindObjectOfType<Player>();      // duyệt toàn bộ scene
    var hpBar = GetComponentInChildren<HpBar>();  // duyệt cả cây con
    var boss = GameObject.Find("Boss");           // tìm theo tên
}`,
    api: [
      ['`GameObject.Find("Boss")`', 'Tìm GameObject đang bật có tên đúng như vậy.', 'Duyệt toàn bộ scene; đổi tên object là hỏng mà không báo lỗi compile.'],
      ['`FindObjectOfType<T>()`', 'Tìm object đầu tiên có component kiểu T.', 'Duyệt toàn bộ scene. **Obsolete từ Unity 2023.1 / Unity 6.**'],
      ['`FindFirstObjectByType<T>()`', 'Thay thế FindObjectOfType, đảm bảo đúng object đầu tiên.', 'Chậm hơn vì phải sắp xếp. Có từ Unity 2022.2.'],
      ['`FindAnyObjectByType<T>()`', 'Lấy một object bất kỳ có kiểu T.', 'Nhanh hơn FindFirst. Dùng khi chỉ có 1 object loại đó.'],
      ['`GetComponentInChildren<T>()`', 'Tìm component kiểu T trên chính object và toàn bộ con cháu.', 'Duyệt cả cây con.'],
      ['`Camera.main`', 'Lấy camera có tag “MainCamera”.', 'Trước Unity 2020.2: tìm theo tag mỗi lần gọi. Từ 2020.2: Unity tự lưu sẵn, gọi thoải mái.'],
    ],
    truth: 'Các hàm Find duyệt toàn bộ scene (hoặc cả cây con). Thời gian tăng theo số object, nên game càng lớn càng chậm.',
    effect: 'Gọi trong `Update` làm game chậm dần khi scene có nhiều object. Đây là lỗi hay gặp ở project lớn dần theo thời gian.',
    good: `[SerializeField] HpBar hpBar;      // kéo thả trong Inspector
Player _player;

void Awake() => _player = FindAnyObjectByType<Player>();   // tìm 1 lần`,
    compare: [
      ['Kéo thả `[SerializeField]`', 'Nhanh nhất; phụ thuộc hiện rõ trong Inspector.', 'Phải gán tay; quên gán là null.', 'Object có sẵn trong scene/prefab (ưu tiên số 1).'],
      ['Find… 1 lần trong Awake/Start', 'Không cần gán tay.', 'Phụ thuộc bị ẩn; đổi tên/loại là hỏng âm thầm.', 'Object sinh ra lúc chạy, hệ thống dùng chung.'],
      ['Find… trong Update', 'Không có.', 'Chậm, càng nhiều object càng chậm.', 'Không bao giờ.'],
    ],
    notes: [['Ghi chú phiên bản', 'Lời khuyên tối ưu có **hạn sử dụng**: “đừng gọi Camera.main” đúng trước 2020.2, nay đã hết đúng. Hiểu nguyên lý mới biết khi nào lời khuyên cũ không còn áp dụng.', 'info']],
    remember: 'Ưu tiên **kéo thả reference**. Phải tìm thì **tìm 1 lần** rồi lưu lại. **Không bao giờ Find trong Update.**',
  }));

  C.push(...item({
    title: '1.5 Fake null: vì sao ?. không an toàn với object Unity', level: 'nang_cao',
    situation: 'Kẻ địch có thể đã chết (bị Destroy) khi mình gọi tấn công.',
    bad: `Destroy(enemy.gameObject);
// ... ở frame sau
enemy?.Attack();                 // VẪN GỌI → MissingReferenceException
var target = enemy ?? backup;    // trả về enemy đã chết, không phải backup
if (enemy is null) { ... }       // false, dù enemy đã bị Destroy`,
    api: [
      ['`Destroy(obj)`', 'Xoá GameObject/Component/asset.', 'Chỉ **đánh dấu** xoá; object bị xoá thật ở **cuối frame**.'],
      ['`DestroyImmediate(obj)`', 'Xoá ngay lập tức.', 'Chỉ dùng trong script Editor; dùng lúc chạy game dễ gây lỗi.'],
      ['`a?.Method()`', 'Cú pháp C#: chỉ gọi khi `a` khác null.', 'Chỉ kiểm tra vỏ C#, **không** biết object Unity đã bị Destroy.'],
      ['`a ?? b`', 'Cú pháp C#: lấy `a`, nếu `a` null thì lấy `b`.', 'Cùng vấn đề với `?.`.'],
      ['`a is null`', 'Cú pháp C#: kiểm tra tham chiếu null.', 'Cùng vấn đề với `?.`.'],
      ['`a == null`, `if (a)`', 'Toán tử do **Unity viết lại** cho UnityEngine.Object.', 'Kiểm tra cả object bên C++: an toàn.'],
      ['`ReferenceEquals(a, b)`', 'So sánh tham chiếu thuần C#.', 'Bỏ qua toán tử của Unity; dùng khi muốn biết vỏ C# còn hay không.'],
    ],
    truth: [
      '`Destroy` chỉ giải phóng **object bên C++**. Vỏ C# vẫn còn cho tới khi không ai giữ tham chiếu và GC dọn đi.',
      'Unity **viết lại** toán tử `==`, `!=` và phép ép sang `bool` cho `UnityEngine.Object`: chúng kiểm tra cả phía C++, nên object đã Destroy được coi là null. Hiện tượng này gọi là “fake null”.',
      '`?.`, `??`, `??=` và `is null` là **cú pháp của ngôn ngữ C#**, không viết lại được. Chúng chỉ nhìn vỏ C#, mà vỏ C# vẫn còn.',
    ],
    effect: [
      '`MissingReferenceException` xuất hiện ở chỗ tưởng đã kiểm tra null cẩn thận.',
      'Trong **cùng frame** gọi Destroy, `obj == null` vẫn là false và `transform.childCount` vẫn đếm object đó.',
    ],
    good: `if (enemy != null) enemy.Attack();   // dùng != của Unity
if (enemy) enemy.Attack();           // hoặc ép sang bool

// class C# thường (không kế thừa UnityEngine.Object) vẫn dùng ?. bình thường`,
    compare: [
      ['`obj != null` / `if (obj)`', 'Đúng với cả object đã Destroy.', 'Dài hơn `?.` một chút; tốn hơn so sánh tham chiếu thường một chút.', 'Mọi kiểu kế thừa UnityEngine.Object.'],
      ['`obj?.X()`, `obj ?? y`, `is null`', 'Ngắn gọn.', 'Sai với object Unity đã Destroy.', 'Chỉ với class C# thường (data, service).'],
    ],
    notes: [['Mẹo với Rider', 'Rider (plugin Unity) cảnh báo sẵn: “Possible unintended bypass of lifetime check of underlying Unity engine object”. Đừng tắt cảnh báo đó.', 'info']],
    remember: 'Với GameObject, Component, ScriptableObject, Material…: chỉ dùng **`if (obj)`** hoặc **`obj != null`**.',
  }));

  C.push(...item({
    title: '1.6 GetComponent không tìm thấy vẫn tạo rác trong Editor', level: 'nang_cao',
    situation: 'Nhiều object, chỉ một số có khiên (Shield).',
    bad: `var shield = GetComponent<Shield>();   // nhiều object không có Shield
if (shield != null) shield.Block();`,
    api: [
      ['`TryGetComponent(out T c)`', 'Tìm component kiểu T; trả về true/false và component qua tham số `out`.', 'Có từ Unity 2019.2. Không tạo object giả khi không tìm thấy.'],
    ],
    truth: 'Trong **Editor**, khi `GetComponent` không tìm thấy, Unity không trả về null thật mà trả về một **object giả null** chứa thông tin để báo lỗi dễ hiểu hơn. Tạo object đó là tạo rác. Bản build không làm vậy.',
    effect: 'Profiler trong Editor hiện rác ở chỗ bản build không hề có. Dễ tối ưu nhầm chỗ.',
    good: `if (TryGetComponent(out Shield shield))   // không tạo rác, kể cả trong Editor
    shield.Block();`,
    compare: [
      ['`GetComponent` + kiểm tra null', 'Quen thuộc.', 'Editor tạo object giả khi không tìm thấy; dễ quên kiểm tra null.', 'Khi chắc chắn component có tồn tại.'],
      ['`TryGetComponent`', 'Không tạo rác; ép phải xử lý trường hợp không có.', 'Cú pháp `out` dài hơn chút.', 'Khi component có thể có hoặc không.'],
    ],
    remember: 'Component **có thể không tồn tại**: dùng **TryGetComponent**.',
  }));

  C.push(...item({
    title: '1.7 Hàm Update rỗng vẫn tốn chi phí', level: 'nang_cao',
    situation: 'Màn chơi có 1.000 đồng xu, script tạo sẵn có hàm `Update` rỗng.',
    bad: `public class Coin : MonoBehaviour
{
    void Start() { }
    void Update() { }   // Unity tạo sẵn khi tạo script, chưa xoá
}`,
    api: [
      ['`Update()`', 'Unity gọi mỗi frame cho mọi component đang bật có hàm này.', 'Có hàm là bị gọi, kể cả thân hàm rỗng.'],
      ['`List<T>`', 'Danh sách C# có thể thêm/xoá phần tử.', 'Duyệt bằng `for` không tạo rác.'],
    ],
    truth: [
      '`Update`, `Start`… không phải hàm ảo (`virtual`). Khi load script, Unity dùng reflection kiểm tra class có hàm tên `Update` không, rồi đưa component vào danh sách cần gọi.',
      'Mỗi frame, engine C++ duyệt danh sách và **gọi sang C# từng hàm một**. Hàm rỗng vẫn tốn chi phí của lần gọi qua ranh giới.',
    ],
    effect: '1.000 đồng xu có `Update` rỗng = 1.000 lần gọi C++ → C# mỗi frame mà không làm gì. Demo 02 đo với 10.000 object.',
    good: `// 1. Xoá Update/Start rỗng.
// 2. Hàng nghìn object giống nhau: 1 manager gọi hàm C# thường.
public class CoinManager : MonoBehaviour
{
    readonly List<Coin> _coins = new();
    public void Register(Coin c) => _coins.Add(c);
    public void Unregister(Coin c) => _coins.Remove(c);

    void Update()
    {
        float dt = Time.deltaTime;
        for (int i = 0; i < _coins.Count; i++) _coins[i].Tick(dt);   // C# gọi C#, rẻ
    }
}`,
    compare: [
      ['Mỗi object một `Update`', 'Đơn giản, mỗi object tự lo.', 'Mỗi object 1 lần gọi C++ → C# mỗi frame.', 'Ít object (vài chục).'],
      ['1 manager gọi `Tick()`', 'Một lần gọi từ engine, còn lại là C# gọi C#; dễ kiểm soát thứ tự.', 'Phải tự đăng ký/huỷ đăng ký; thêm code.', 'Hàng trăm/nghìn object giống nhau.'],
    ],
    remember: '**Xoá Update rỗng.** Nhiều object giống nhau: **một manager** gọi hàm cho cả nhóm.',
  }));

  C.push(...deep('1.8 Phân tích sâu: Unity kiểm tra “còn sống” thế nào', [
    'Bên trong, `UnityEngine.Object` giữ một con trỏ `m_CachedPtr` tới object C++. Toán tử `==` của Unity gọi một hàm so sánh: nếu một bên là null thì nó kiểm tra con trỏ còn trỏ tới object sống hay không.',
    'Khi `Destroy` có hiệu lực ở cuối frame, engine giải phóng object C++. Vỏ C# chỉ biến mất khi **không còn ai giữ tham chiếu**. Những chỗ hay vô tình giữ lại:',
    [
      'Một field `static` hoặc Singleton trỏ tới object của scene cũ: chuyển scene xong vẫn giữ vỏ C# **và mọi thứ vỏ đó tham chiếu**. GC không dọn được, gây rò rỉ bộ nhớ.',
      'Event C# không huỷ đăng ký: delegate giữ tham chiếu tới object đã Destroy (demo 08).',
      'Cache lười bằng `??=`: `_rb ??= GetComponent<Rigidbody>();` không bao giờ lấy lại khi `_rb` đã thành fake null.',
    ],
    'Fake null không chỉ do Destroy: **unload scene**, `AssetBundle.Unload(true)`, `Resources.UnloadUnusedAssets` cũng biến tham chiếu cũ thành fake null. Chính project demo này từng gặp: trong lúc dựng scene, Unity import lại `PlayerConfig.asset`, biến đang giữ asset cũ thành fake null và scene bị lưu một reference trống.',
  ]));
  C.push(...seeAlso('1.9 Cùng cơ chế C# ⇄ C++ ở những chỗ khác trong Unity', [
    ['`mesh.vertices`, `mesh.triangles`, `mesh.uv`', 'Mỗi lần đọc: copy **toàn bộ** mảng sang một mảng C# mới. `mesh.vertices[i]` trong vòng lặp là copy N lần.', 'Đọc 1 lần vào biến, hoặc `mesh.GetVertices(list)` (đổ vào list có sẵn).'],
    ['`renderer.materials`', 'Trả về mảng mới và **nhân bản mọi material** của renderer.', '`sharedMaterials` hoặc `GetSharedMaterials(list)`.'],
    ['`Input.touches`', 'Tạo mảng `Touch[]` mới mỗi lần đọc.', '`Input.touchCount` (số ngón) + `Input.GetTouch(i)` (từng ngón).'],
    ['`GetComponentsInChildren<T>()`', 'Duyệt cả cây con và tạo mảng mới.', 'Overload nhận `List<T>` dùng lại.'],
    ['`gameObject.name`', 'Mỗi lần đọc tạo một string mới.', 'Đọc 1 lần nếu dùng nhiều.'],
    ['`transform.position` khi hierarchy sâu', 'Vị trí thế giới tính qua chuỗi cha; ghi vào nó đánh dấu cả cây con là đã đổi.', '`localPosition` khi đủ dùng; giữ hierarchy nông cho object di chuyển nhiều.'],
  ]));

  C.push(...demo({
    title: 'Fake null: object đã Destroy có thật sự null?', scene: '01_FakeNull', slide: 11, script: '01_FakeNull/FakeNullDemo.cs',
    goal: 'thấy tận mắt cùng một object nhưng `==` và `?.` cho kết quả khác nhau.',
    steps: [
      ['Bấm Play. Nhìn giữa màn hình: khối đỏ “Enemy (sẽ bị Destroy)” và khối xanh “Backup”.', 'Bảng Kết quả trống, ghi “Bấm các bước bên trái…”.', 'Trạng thái ban đầu.'],
      ['Hỏi khán giả: “Sau Destroy, `enemy is null` ra True hay False?” rồi bấm **1 · Destroy Enemy rồi kiểm tra bằng 5 cách**.', '[cùng frame] `enemy == null` = **False**, số con = **2**.\n[frame sau] số con = **1**; `enemy == null` = **True** (xanh); `if (enemy)` = **False** (xanh); `enemy is null` = **False** (đỏ); `enemy?.Attack()` = **VẪN GỌI → MissingReferenceException** (đỏ); `enemy ?? backup` = **enemy ĐÃ CHẾT** (đỏ); `enemy != null ? enemy : backup` = **Backup** (xanh).', 'Destroy có hiệu lực cuối frame; `?.`, `??`, `is null` chỉ nhìn vỏ C#.'],
      ['Bấm **2 · GetComponent trên object không có Rigidbody**.', '`== null` = **True**; `is null` = **False** (đỏ, chỉ trong Editor); `TryGetComponent` = **False**, rb is null = **True**.', 'Editor trả về object giả null khi không tìm thấy component.'],
      ['Bấm **3 · Tạo lại Enemy**, có thể làm lại bước 2.', 'Khối đỏ xuất hiện lại.', 'Lặp lại cho người đến muộn.'],
    ],
  }));
  C.push(...demo({
    title: 'Gọi API Unity tốn bao nhiêu?', scene: '02_NativeCost', slide: 13, script: '02_NativeCost/NativeCostDemo.cs',
    goal: 'có số liệu thật (ms và KB) cho các cặp code quen thuộc, và chi phí của 10.000 hàm `Update` rỗng.',
    steps: [
      ['Bấm **1 · GetComponent mỗi lần vs lưu sẵn vào field**.', 'Dòng đỏ (GetComponent) chậm hơn dòng xanh (field) nhiều lần; dòng xanh ghi “Chậm hơn ≈ N lần”. Cả hai khoảng 0 KB.', 'Lưu component vào field (1.1).'],
      ['Bấm **2 · Đọc position 3 lần vs đọc 1 lần vào biến**.', 'Đọc 3 lần chậm hơn rõ rệt.', 'Mỗi lần đọc property là một lần gọi engine (1.3).'],
      ['Bấm **3 · tag == vs CompareTag**.', 'Thời gian gần nhau, nhưng `tag ==` tạo **vài MB** rác, `CompareTag` khoảng **0 KB**.', 'Đọc `.tag` tạo string mỗi lần (1.2).'],
      ['Bấm **4 · GameObject.Find vs reference đã lưu**. Sau đó bấm **+5.000 object vào scene** và bấm lại bước 4.', 'Find chậm hơn rất nhiều; sau khi thêm object, thời gian Find tăng thêm.', 'Find duyệt toàn bộ scene (1.4).'],
      ['Mục C: chọn lần lượt **Không có Update → Update rỗng → 1 Manager gọi Tick()**, mỗi lần đợi 2 giây.', 'Dòng “Frame time” và “Main Thread”: Update rỗng cao nhất, Manager thấp hơn.', 'Update rỗng vẫn tốn (1.7).'],
    ],
    after: [['Lưu ý khi đọc số', 'Số tuyệt đối khác nhau giữa các máy và trong Editor cao hơn bản build. Điều cần nhìn là **tỉ lệ** giữa hai cách.', 'info']],
  }));

  C.push(...summary(1, [
    ['Dùng component nhiều lần', 'Lấy 1 lần trong `Awake`, lưu vào field; hoặc kéo thả `[SerializeField]`.', '`GetComponent` trong `Update`.'],
    ['Kiểm tra tag', '`CompareTag("Enemy")`.', '`tag == "Enemy"`.'],
    ['Đọc/ghi transform', 'Đọc 1 lần vào biến, ghi 1 lần; `SetPositionAndRotation`.', 'Đọc `transform.position` nhiều lần trong một dòng.'],
    ['Tìm object khác', 'Kéo thả reference; hoặc `FindAnyObjectByType` 1 lần.', '`Find`, `FindObjectOfType` trong `Update`.'],
    ['Kiểm tra object Unity còn sống', '`if (obj)` hoặc `obj != null`.', '`?.`, `??`, `??=`, `is null` với object Unity.'],
    ['Component có thể không có', '`TryGetComponent(out T c)`.', '`GetComponent` rồi quên kiểm tra null.'],
    ['Nhiều object giống nhau cần cập nhật', 'Xoá `Update` rỗng; 1 manager gọi `Tick()`.', 'Mỗi object một `Update` rỗng hoặc gần rỗng.'],
  ]));
  return C;
};
