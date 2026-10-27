const { H1, callout, image, item, demo, deep, seeAlso, summary, table } = require('./lib');

module.exports = function part2() {
  const C = [];
  C.push(H1('Phần 2. Một frame trong Unity chạy những gì'));
  C.push(...callout('Ý chính của phần', 'Unity không chỉ “gọi Update rồi vẽ”. Mỗi frame là một chuỗi bước cố định gọi là **Player Loop**. Biết code của mình (Update, vật lý, coroutine, await) chạy ở bước nào thì giải thích được phần lớn lỗi về thứ tự và thời gian.', 'key'));
  C.push(...image('player_loop', 620, 'Hình 2. Các bước chính trong một frame và chỗ coroutine được chạy tiếp'));

  C.push(...item({
    title: '2.1 Thứ tự vòng đời: Awake, OnEnable, Start', level: 'co_ban',
    situation: 'Panel lắng nghe sự kiện “đổi số coin” để cập nhật hiển thị.',
    bad: `void OnEnable()  => GameEvents.CoinChanged += Refresh;
void OnDestroy() => GameEvents.CoinChanged -= Refresh;   // huỷ sai chỗ`,
    api: [
      ['`Awake()`', 'Gọi 1 lần khi object được tạo/scene load.', 'Chạy cả khi component đang tắt, miễn GameObject đang bật.'],
      ['`OnEnable()`', 'Gọi mỗi lần component/GameObject được bật.', 'Chạy lại mỗi lần `SetActive(true)`.'],
      ['`Start()`', 'Gọi 1 lần ngay trước `Update` đầu tiên.', 'Chỉ chạy khi component đang bật.'],
      ['`OnDisable()`', 'Gọi mỗi lần bị tắt, và trước `OnDestroy`.', 'Cặp đôi của `OnEnable`.'],
      ['`OnDestroy()`', 'Gọi khi object bị Destroy hoặc scene unload.', 'Chỉ chạy nếu object từng được bật (đã chạy Awake).'],
      ['`event += Handler` / `-= Handler`', 'Đăng ký / huỷ đăng ký một hàm vào sự kiện C#.', 'Đăng ký 2 lần thì hàm bị gọi 2 lần.'],
    ],
    extra: table(['Hàm', 'Khi nào chạy', 'Chạy lại?', 'Điều kiện'], [
      ['`Awake`', 'Khi object được tạo / scene load', 'Không', 'GameObject bật. **Chạy cả khi component tắt**'],
      ['`OnEnable`', 'Sau Awake, và mỗi lần bật lại', '**Có**', 'Cả GameObject và component đều bật'],
      ['`Start`', 'Trước Update đầu tiên', 'Không', 'Component đang bật'],
      ['`OnDisable`', 'Mỗi lần tắt, và trước OnDestroy', 'Có', '-'],
      ['`OnDestroy`', 'Khi Destroy / unload scene', 'Không', 'Object từng được bật'],
    ], [16, 32, 16, 36]),
    truth: 'Panel bật/tắt 3 lần thì `OnEnable` chạy 3 lần, nhưng `OnDestroy` chưa chạy lần nào: hàm `Refresh` bị đăng ký 3 lần.',
    effect: 'Mỗi lần coin đổi, `Refresh` chạy 3 lần. Khi panel bị Destroy, handler cũ còn sót có thể gây lỗi.',
    good: `void OnEnable()  => GameEvents.CoinChanged += Refresh;
void OnDisable() => GameEvents.CoinChanged -= Refresh;   // đúng cặp`,
    compare: [
      ['Đăng ký `OnEnable`, huỷ `OnDisable`', 'Luôn cân bằng; panel ẩn thì không nhận sự kiện thừa.', 'Panel ẩn sẽ bỏ lỡ sự kiện, cần làm mới khi bật lại.', 'UI, object hay bật/tắt (đa số).'],
      ['Đăng ký `Awake`/`Start`, huỷ `OnDestroy`', 'Nhận sự kiện cả khi đang ẩn.', 'Không được đăng ký lại ở OnEnable; dễ lệch cặp.', 'Hệ thống sống suốt game, không bật/tắt.'],
    ],
    remember: 'Đăng ký và huỷ phải **cùng cặp**: `OnEnable` ↔ `OnDisable`, hoặc `Awake` ↔ `OnDestroy`.',
  }));

  C.push(...item({
    title: '2.2 Thứ tự Awake giữa các script không được đảm bảo', level: 'co_ban',
    situation: 'HUD cần đăng ký vào GameManager ngay khi khởi động.',
    bad: `// GameManager.cs
void Awake() => Instance = this;

// Hud.cs
void Awake() => GameManager.Instance.OnScore += Show;   // đôi khi Instance còn null`,
    api: [
      ['`[DefaultExecutionOrder(-100)]`', 'Attribute đặt thứ tự chạy cho cả class; số nhỏ chạy trước.', 'Áp dụng cho Awake, OnEnable, Start, Update…'],
      ['Project Settings → Script Execution Order', 'Cửa sổ chỉnh thứ tự chạy giữa các script.', 'Cùng tác dụng, nhưng nằm ngoài code nên dễ bị quên.'],
      ['`Initialize()`', 'Quy ước của team: một hàm khởi tạo được gọi chủ động.', 'Thứ tự do code quyết định, không phụ thuộc Unity.'],
    ],
    truth: 'Nếu không cấu hình, Unity không hứa script nào chạy `Awake` trước. Thứ tự có thể khác giữa các máy, giữa Editor và bản build, hoặc đổi sau khi thêm object vào scene.',
    effect: 'Lỗi kiểu “máy tôi chạy được, máy bạn lỗi”, hoặc chỉ lỗi trên bản build.',
    good: `// Cách 1: Awake chỉ lo bản thân; lấy object khác trong Start
void Start() => GameManager.Instance.OnScore += Show;

// Cách 2: chỉ định thứ tự
[DefaultExecutionOrder(-100)]
public class GameManager : MonoBehaviour { ... }

// Cách 3: một chỗ gọi Initialize() theo đúng thứ tự mong muốn`,
    compare: [
      ['Awake lo bản thân, Start lấy object khác', 'Đơn giản, không cần cấu hình.', 'Chỉ có 2 “tầng”; chuỗi phụ thuộc dài thì không đủ.', 'Project nhỏ, phụ thuộc đơn giản.'],
      ['`[DefaultExecutionOrder]`', 'Thứ tự rõ ràng, nằm ngay trong code.', 'Nhiều class cùng chỉnh số dễ rối.', 'Vài hệ thống lõi phải chạy trước.'],
      ['Gọi `Initialize()` chủ động', 'Thứ tự hoàn toàn do code quyết định, dễ đọc, dễ test.', 'Phải có một “điểm khởi động” gọi lần lượt.', 'Hệ thống lớn (khuyến nghị).'],
    ],
    remember: '**Đừng dựa vào thứ tự Awake** giữa các script. Khởi tạo theo một chuỗi rõ ràng.',
  }));

  C.push(...item({
    title: '2.3 Coroutine dừng khi nào', level: 'trung_binh',
    situation: 'Đèn nhấp nháy mỗi 0,5 giây bằng coroutine.',
    bad: `IEnumerator Blink()
{
    while (true)
    {
        Toggle();
        yield return new WaitForSeconds(0.5f);   // tạo object mới mỗi vòng
    }
}`,
    api: [
      ['`StartCoroutine(Blink())`', 'Chạy một hàm `IEnumerator` trải qua nhiều frame.', 'Coroutine thuộc về MonoBehaviour **đã gọi** StartCoroutine.'],
      ['`yield return null`', 'Tạm dừng, chạy tiếp ở frame sau (ngay sau Update).', '-'],
      ['`new WaitForSeconds(0.5f)`', 'Tạm dừng 0,5 giây theo thời gian có scale.', 'Mỗi lần `new` là một object mới (rác). Đứng yên khi timeScale = 0.'],
      ['`StopCoroutine` / `StopAllCoroutines`', 'Dừng một / mọi coroutine do MonoBehaviour đó chạy.', 'Không dừng coroutine do object khác chạy.'],
      ['`gameObject.SetActive(false)`', 'Tắt cả GameObject.', 'Dừng hẳn mọi coroutine của nó; bật lại không tự chạy tiếp.'],
      ['`enabled = false`', 'Tắt riêng component.', 'Update ngừng được gọi, nhưng **coroutine vẫn chạy**.'],
    ],
    extra: table(['Hành động', 'Coroutine', 'Ghi chú'], [
      ['`enabled = false`', '**Vẫn chạy**', 'Chỉ Update/LateUpdate… ngừng'],
      ['`SetActive(false)`', 'Dừng hẳn', 'Bật lại **không** tự chạy tiếp'],
      ['`Destroy(gameObject)`', 'Dừng', '-'],
      ['`StopCoroutine`/`StopAllCoroutines`', 'Dừng', 'Chỉ coroutine do chính MonoBehaviour đó chạy'],
    ], [34, 22, 44]),
    truth: 'Coroutine thuộc về MonoBehaviour đã gọi `StartCoroutine`, không thuộc object chứa hàm. `GameManager.Instance.StartCoroutine(panel.Fade())` sẽ chạy tiếp kể cả khi panel đã tắt.',
    good: `static readonly WaitForSeconds HalfSecond = new(0.5f);   // tạo 1 lần

IEnumerator Blink()
{
    while (true)
    {
        Toggle();
        yield return HalfSecond;   // dùng lại, không tạo rác
    }
}`,
    compare: [
      ['`new WaitForSeconds` mỗi vòng', 'Viết nhanh; đổi được thời gian mỗi lần.', 'Tạo rác mỗi vòng lặp.', 'Coroutine chạy 1 lần, không lặp.'],
      ['Cache `WaitForSeconds` dùng lại', 'Không tạo rác.', 'Thời gian cố định.', 'Coroutine lặp với thời gian cố định.'],
    ],
    remember: 'Coroutine chỉ dừng khi **tắt GameObject** hoặc **Destroy**. Cache `WaitForSeconds` khi lặp.',
  }));

  C.push(...item({
    title: '2.3b Coroutine thuộc về object nào?', level: 'trung_binh',
    situation: 'Class A muốn chạy hiệu ứng cuộn nằm trong class B.',
    bad: `public class A : MonoBehaviour
{
    public B b;
    void Start() => StartCoroutine(b.Scroll());   // = this.StartCoroutine(...): coroutine thuộc về A
}

public class B : MonoBehaviour
{
    public IEnumerator Scroll()
    {
        Debug.Log("Start Scroll");
        yield return new WaitForSeconds(2f);
        Debug.Log("After 2 seconds");   // B đã bị tắt vẫn in ra; A bị tắt thì KHÔNG in
    }
}`,
    api: [
      ['`StartCoroutine(routine)`', 'Viết tắt của `this.StartCoroutine(routine)`: chạy coroutine trên **MonoBehaviour hiện tại**.', 'Object hiện tại là “chủ”: chủ tắt hoặc bị Destroy thì coroutine dừng.'],
      ['`b.StartCoroutine(routine)`', 'Chạy coroutine trên MonoBehaviour **b**.', 'b là chủ. Nếu GameObject của b đang tắt, Unity báo lỗi “Coroutine couldn\'t be started because the game object is inactive”.'],
      ['`b.Scroll()`', 'Chỉ **tạo** đối tượng IEnumerator, chưa chạy gì.', 'Hàm nằm ở class nào không quyết định coroutine thuộc về ai.'],
    ],
    truth: 'Coroutine gắn với MonoBehaviour mà ta **gọi** `StartCoroutine` **trên nó**, không phải class chứa hàm `IEnumerator`. Hai dòng dưới chỉ khác nhau một tiền tố nhưng hành vi khác hẳn:',
    extra: table(['Chuyện gì xảy ra', '`StartCoroutine(b.Scroll())` (A là chủ)', '`b.StartCoroutine(b.Scroll())` (B là chủ)'], [
      ['GameObject của B bị tắt', '**Vẫn chạy**, vẫn in “After 2 seconds”', 'Dừng'],
      ['B bị Destroy', '**Vẫn chạy**; nếu Scroll đụng `transform` của B → MissingReferenceException', 'Dừng'],
      ['GameObject của A bị tắt / Destroy', 'Dừng', '**Vẫn chạy**'],
      ['`b.StopAllCoroutines()`', 'Không dừng', 'Dừng'],
      ['`StopAllCoroutines()` trong A', 'Dừng', 'Không dừng'],
    ], [30, 35, 35]),
    effect: 'Hiệu ứng của B vẫn chạy khi B đã bị ẩn (ví dụ popup đã đóng vẫn cuộn), hoặc lỗi MissingReferenceException khi B đã bị huỷ. Ngược lại, tắt A làm hiệu ứng của B dừng giữa chừng.',
    good: `public class B : MonoBehaviour
{
    Coroutine _scroll;

    public void PlayScroll()                      // B tự chạy và tự quản lý coroutine của mình
    {
        if (_scroll != null) StopCoroutine(_scroll);
        _scroll = StartCoroutine(Scroll());
    }

    IEnumerator Scroll() { ... }
}

public class A : MonoBehaviour
{
    public B b;
    void Start() => b.PlayScroll();               // A chỉ ra lệnh, không giữ coroutine của B
}`,
    compare: [
      ['`StartCoroutine(b.Scroll())` trong A', 'A kiểm soát được (dừng khi A tắt).', 'Không dừng theo B; dễ chạm object đã chết; khó tìm ai đang chạy coroutine.', 'Hiếm khi: chuỗi hành động thật sự thuộc về A.'],
      ['`b.StartCoroutine(b.Scroll())`', 'Dừng đúng theo B.', 'Lỗi nếu B đang tắt; A vẫn “thò tay” vào việc của B.', 'Khi không sửa được class B.'],
      ['B có hàm `PlayScroll()` tự chạy coroutine', 'Dừng theo B; B tự chặn chạy trùng; A chỉ gọi một hàm.', 'Thêm một hàm public.', 'Khuyến nghị.'],
    ],
    remember: 'Coroutine thuộc về object **gọi** `StartCoroutine`. Coroutine điều khiển object nào thì **để chính object đó chạy**.',
  }));

  C.push(...item({
    title: '2.4 Time.timeScale = 0: cái gì dừng, cái gì không', level: 'trung_binh',
    situation: 'Làm menu pause: game dừng nhưng popup vẫn có animation.',
    api: [
      ['`Time.timeScale`', 'Hệ số tốc độ thời gian game: 1 = bình thường, 0 = dừng.', 'Không dừng Update.'],
      ['`Time.deltaTime`', 'Thời gian (giây) của frame vừa rồi, đã nhân timeScale.', 'Bằng 0 khi pause.'],
      ['`Time.unscaledDeltaTime`', 'Thời gian thật của frame vừa rồi, bỏ qua timeScale.', 'Dùng cho UI, hiệu ứng lúc pause.'],
      ['`WaitForSecondsRealtime`', 'Coroutine đợi theo thời gian thật.', 'Chạy cả khi pause.'],
      ['Animator → Update Mode', 'Chọn Animator chạy theo Normal / Animate Physics / Unscaled Time.', 'Unscaled Time để animation chạy lúc pause.'],
      ['DOTween `.SetUpdate(true)`', 'Cho tween bỏ qua timeScale.', 'Thư viện ngoài, nhiều project dùng.'],
    ],
    extra: table(['Thứ', 'Khi timeScale = 0', 'Muốn chạy lúc pause'], [
      ['`Update`, `LateUpdate`', '**Vẫn chạy**, deltaTime = 0', '`unscaledDeltaTime`'],
      ['`FixedUpdate`, vật lý', 'Dừng hẳn', '-'],
      ['`WaitForSeconds`', 'Đứng yên mãi', '`WaitForSecondsRealtime`'],
      ['Animator', 'Đứng yên', 'Update Mode = Unscaled Time'],
      ['ParticleSystem', 'Đứng yên', 'Main → Use Unscaled Time'],
      ['DOTween', 'Đứng yên', '`.SetUpdate(true)`'],
      ['AudioSource', '**Vẫn phát**', 'Tự pause âm thanh'],
      ['`Task.Delay`', 'Vẫn chạy (thời gian thật)', 'Cẩn thận khi dùng cho logic game'],
    ], [28, 36, 36]),
    effect: 'Lỗi “menu pause bị đơ”: popup dùng `WaitForSeconds` hoặc Animator mặc định nên animation mở không chạy.',
    compare: [
      ['Thời gian có scale (`deltaTime`, `WaitForSeconds`)', 'Tự dừng khi pause, tự chậm khi slow-motion.', 'UI và hiệu ứng menu cũng dừng theo.', 'Gameplay: di chuyển, hồi chiêu, vật lý.'],
      ['Thời gian thật (`unscaledDeltaTime`, `Realtime`)', 'Chạy cả khi pause.', 'Không dừng theo game; dùng nhầm cho gameplay thì pause không có tác dụng.', 'UI, menu pause, hiệu ứng giao diện.'],
    ],
    remember: '**Gameplay** dùng thời gian có scale; **UI/menu pause** dùng thời gian thật.',
  }));

  C.push(...item({
    title: '2.5 FixedUpdate có thể chạy 0 lần hoặc nhiều lần mỗi frame', level: 'trung_binh',
    situation: 'Bấm Space để nhân vật nhảy (dùng vật lý).',
    bad: `void FixedUpdate()
{
    if (Input.GetKeyDown(KeyCode.Space)) Jump();   // có lúc bấm mà không nhảy
}`,
    api: [
      ['`Input.GetKeyDown(key)`', 'Trả về true **đúng 1 frame** lúc phím vừa được nhấn.', 'Frame đó không có FixedUpdate thì bỏ lỡ.'],
      ['`Time.fixedDeltaTime`', 'Khoảng thời gian giữa 2 bước vật lý (mặc định 0,02 giây = 50 lần/giây).', 'Chỉnh trong Project Settings → Time.'],
    ],
    extra: image('fixed_update', 620, 'Hình 3. Với fixedDeltaTime = 0.02 s, số lần FixedUpdate mỗi frame thay đổi theo tốc độ frame'),
    truth: 'FixedUpdate chạy theo **thời gian game**, không theo frame. Frame nhanh (FPS cao) có thể có **0 lần**; frame chậm phải chạy **bù nhiều lần**.',
    effect: 'Lỗi “bấm mà không nhảy” chỉ xuất hiện khi FPS cao, nên rất khó tái hiện nếu không hiểu nguyên lý.',
    good: `bool _jumpRequested;

void Update()
{
    if (Input.GetKeyDown(KeyCode.Space)) _jumpRequested = true;   // đọc input ở Update
}

void FixedUpdate()
{
    if (!_jumpRequested) return;
    Jump();                        // xử lý vật lý ở FixedUpdate
    _jumpRequested = false;
}`,
    compare: [
      ['Đọc input trong FixedUpdate', 'Ít code.', 'Mất lần bấm khi frame không có FixedUpdate.', 'Không nên.'],
      ['Đọc ở Update, lưu cờ, xử lý ở FixedUpdate', 'Không mất input; vật lý vẫn đều.', 'Thêm một biến cờ.', 'Mọi input điều khiển vật lý.'],
    ],
    remember: 'Đọc **input ở Update**, xử lý **vật lý ở FixedUpdate**.',
  }));

  C.push(...item({
    title: '2.6 Vòng xoáy khi máy chậm và Maximum Allowed Timestep', level: 'nang_cao',
    situation: 'Máy yếu, có lúc khựng một frame dài.',
    api: [
      ['`Time.maximumDeltaTime` (Maximum Allowed Timestep)', 'Giới hạn lượng thời gian vật lý được xử lý trong một frame.', 'Mặc định khoảng 0,33 giây → tối đa khoảng 16–17 lần FixedUpdate mỗi frame.'],
    ],
    truth: [
      'Khi một frame chậm, Unity chạy **bù** nhiều lần `FixedUpdate`. Chạy bù làm frame đó càng chậm, frame sau phải bù nhiều hơn nữa: vòng xoáy làm game “đơ hẳn”.',
      'Maximum Allowed Timestep chặn vòng xoáy: phần thời gian vượt quá bị bỏ, game “chậm lại” thay vì đứng hẳn.',
    ],
    effect: 'Đặt logic nặng (tìm đường, xử lý nhiều object) trong `FixedUpdate` dễ kích hoạt vòng xoáy trên máy yếu.',
    good: `// Giữ FixedUpdate thật nhẹ: chỉ lực, vận tốc, raycast cần thiết.
// Logic nặng chuyển sang Update hoặc chia nhỏ qua nhiều frame.`,
    remember: '**FixedUpdate phải nhẹ.** Máy càng chậm, nó càng bị gọi nhiều.',
  }));

  C.push(...item({
    title: '2.7 async/await: vẫn chạy sau khi object đã bị Destroy', level: 'nang_cao',
    situation: 'Đợi 3 giây rồi đưa nhân vật về giữa màn hình.',
    bad: `async void Start()
{
    await Task.Delay(3000);
    transform.position = Vector3.zero;   // object có thể đã bị Destroy, hoặc đã thoát Play mode
}`,
    api: [
      ['`async` / `await`', 'Viết code bất đồng bộ như code tuần tự: `await` tạm dừng hàm, chạy tiếp khi việc chờ xong.', 'Trong Unity, phần sau await được đưa về main thread.'],
      ['`async void`', 'Hàm async không trả về gì, chạy kiểu “bắn rồi quên”.', 'Không ai theo dõi/huỷ được; lỗi bên trong khó bắt.'],
      ['`Task.Delay(ms)` / `Task.Delay(ms, token)`', 'Chờ một số mili giây (thời gian thật).', 'Có `token` thì huỷ được giữa chừng.'],
      ['`CancellationToken`', 'Tín hiệu “hãy dừng lại” truyền vào việc đang chờ.', 'Khi bị huỷ, await ném `OperationCanceledException`.'],
      ['`destroyCancellationToken`', 'Token có sẵn trên MonoBehaviour, tự huỷ khi object bị Destroy.', 'Có từ Unity 2022.2.'],
      ['`Awaitable.WaitForSecondsAsync(s, token)`', 'Chờ s giây kiểu async, chạy trên main thread, dùng lại bộ nhớ.', 'Có từ Unity 2023.1 (Unity 6). Không có trên 2022.3.'],
      ['UniTask (thư viện)', 'Thay thế async/await tối ưu cho Unity, gần như không tạo rác.', 'Thư viện ngoài; dùng được trên 2022.3.'],
    ],
    truth: [
      'Unity cài `UnitySynchronizationContext`, nên phần sau `await` chạy tiếp trên **main thread**. Đây là lý do gọi được API Unity sau `await`.',
      'Nhưng `Task` **không biết gì về vòng đời GameObject**: object bị Destroy, scene đổi, thậm chí **thoát Play mode trong Editor**, Task vẫn chạy tới cuối.',
    ],
    effect: [
      '`MissingReferenceException` ngẫu nhiên khi chuyển scene.',
      'Trong Editor: log và logic vẫn chạy sau khi bấm Stop, có thể sửa cả asset.',
      'Lỗi trong `async void` không có ai bắt, rất khó lần ra.',
    ],
    good: `// Unity 6: Awaitable, tự dừng khi object bị Destroy
async Awaitable Start()
{
    await Awaitable.WaitForSecondsAsync(3f, destroyCancellationToken);
    transform.position = Vector3.zero;
}

// Unity 2022.3: Task có token
async void Start()
{
    try
    {
        await Task.Delay(3000, destroyCancellationToken);
        transform.position = Vector3.zero;
    }
    catch (OperationCanceledException) { }   // bị huỷ vì object chết: không phải lỗi
}`,
    compare: [
      ['Coroutine', 'Gắn với vòng đời GameObject; có sẵn, quen thuộc.', 'Không trả về giá trị; xử lý lỗi khó; tạo rác khi bắt đầu.', 'Hiệu ứng, chuỗi hành động đơn giản.'],
      ['`async void` + `Task.Delay`', 'Viết gọn.', 'Không dừng khi object chết; chạy cả sau khi thoát Play.', 'Không nên dùng trong MonoBehaviour.'],
      ['Task + `destroyCancellationToken`', 'Dừng đúng lúc; dùng được trên 2022.3.', 'Phải try/catch; Task tạo rác.', 'Unity 2022.3 không có UniTask.'],
      ['`Awaitable` (Unity 6)', 'Có sẵn, chạy main thread, dùng lại bộ nhớ, hỗ trợ token.', 'Chỉ có từ Unity 6.', 'Project Unity 6 (khuyến nghị).'],
      ['UniTask', 'Rất ít rác, nhiều tiện ích, chạy được từ 2022.3.', 'Thêm thư viện ngoài vào project.', 'Project dùng async nhiều.'],
    ],
    notes: [['Ghi chú phiên bản', '`destroyCancellationToken`: từ Unity 2022.2. `Awaitable`: từ Unity 2023.1 (Unity 6), **không có trên 2022.3**.']],
    remember: 'Async trong MonoBehaviour: **luôn truyền** `destroyCancellationToken`. Tránh `async void` + `Task.Delay` trần.',
  }));

  C.push(...item({
    title: '2.8 Tự chèn bước vào Player Loop', level: 'nang_cao',
    situation: 'Muốn một hàm chạy mỗi frame trước mọi Update mà không cần MonoBehaviour.',
    api: [
      ['`PlayerLoop.GetCurrentPlayerLoop()`', 'Lấy cấu trúc các bước của một frame.', 'Namespace `UnityEngine.LowLevel`.'],
      ['`PlayerLoop.SetPlayerLoop(loop)`', 'Ghi lại cấu trúc đã sửa.', 'Ảnh hưởng toàn game; sửa sai là hỏng cả vòng lặp.'],
      ['`PlayerLoopSystem`', 'Một bước trong Player Loop, có `updateDelegate` là hàm sẽ chạy.', '-'],
      ['`[RuntimeInitializeOnLoadMethod]`', 'Đánh dấu hàm static tự chạy khi game khởi động.', 'Tham số chọn thời điểm chạy (Phần 6).'],
    ],
    truth: 'Player Loop không phải hộp đen: đọc và sửa được bằng `UnityEngine.LowLevel.PlayerLoop`. Thư viện **UniTask** chính là chèn các bước riêng vào đây để chạy `await` mà không cần MonoBehaviour.',
    good: `static class GameTick
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
    notes: [['Khi nào nên dùng', 'Hiếm khi cần trong game thường. Mục này chủ yếu để hiểu UniTask hoạt động thế nào.', 'info']],
    remember: 'Player Loop sửa được, nhưng **chỉ dùng khi thật sự cần**.',
  }));

  C.push(...deep('2.9 Phân tích sâu: thứ tự đầy đủ trong một frame', [
    'Rút gọn từ trang “Order of execution for event functions” của Unity:',
    [
      '**Đầu frame:** cập nhật thời gian, nhận sự kiện input từ hệ điều hành.',
      '**Vòng vật lý (0..n lần):** `FixedUpdate` → Animator (chế độ Animate Physics) → mô phỏng vật lý → `OnTriggerXXX` / `OnCollisionXXX` → coroutine `yield WaitForFixedUpdate`.',
      '**Logic game:** `OnMouseXXX` → `Update` → coroutine `yield null`, `WaitForSeconds` chạy tiếp → Animator (chế độ Normal) → `LateUpdate`.',
      '**Vẽ:** culling, render camera, `OnGUI` (có thể gọi nhiều lần mỗi frame).',
      '**Cuối frame:** `yield WaitForEndOfFrame`, object bị `Destroy` được xoá thật.',
    ],
    'Hệ quả: **camera bám nhân vật bị giật** thường do nhân vật đi bằng vật lý (50 lần/giây) còn camera theo frame. Sửa: bật **Interpolate** trên Rigidbody (làm mượt vị trí giữa các bước vật lý), hoặc cho camera bám trong `LateUpdate`.',
    'Trong `FixedUpdate`, `Time.deltaTime` tự trả về giá trị của `fixedDeltaTime`, nên cùng hàm di chuyển dùng được ở cả hai nơi.',
  ]));
  C.push(...seeAlso('2.10 Thứ gì chạy theo thời gian nào trong Unity', [
    ['Animator', 'Normal: theo `deltaTime`; Animate Physics: theo bước vật lý; Unscaled Time: bỏ qua timeScale.', 'UI animation trong menu pause: Unscaled Time.'],
    ['ParticleSystem', 'Mặc định theo timeScale.', 'Hiệu ứng UI lúc pause: bật `useUnscaledTime`.'],
    ['AudioSource', '**Không** bị timeScale ảnh hưởng.', 'Tự pause bằng `AudioListener.pause` hoặc `AudioSource.Pause()`.'],
    ['`Invoke("Spawn", 1f)` / `InvokeRepeating`', 'Gọi hàm theo **tên chuỗi** sau một khoảng thời gian có scale.', 'Coroutine/async có huỷ rõ ràng; tránh chuỗi tên hàm.'],
    ['Rigidbody', 'Chỉ di chuyển trong bước vật lý.', 'Bật Interpolate cho object camera bám theo.'],
  ]));

  C.push(...demo({
    title: 'Một frame chạy những gì?', scene: '03_PlayerLoop', slide: 20, script: '03_PlayerLoop/PlayerLoopDemo.cs',
    goal: 'thấy FixedUpdate chạy 0 hoặc nhiều lần mỗi frame, hệ quả với input, và cái gì dừng khi timeScale = 0.',
    steps: [
      ['Bấm Play. Ở mục A chọn Target FPS **Không giới hạn**, đợi 3 giây.', 'Dòng “Số frame có 0 / 1 / 2 / 3+ lần”: số đầu tiên (0 lần) tăng rất nhanh.', 'FPS cao → nhiều frame không có FixedUpdate.'],
      ['Chọn Target FPS **30**, bấm **Xoá số liệu A và B**, đợi 3 giây.', 'Gần như không còn frame 0 lần; đa số 1–2 lần.', 'FPS thấp → mỗi frame phải chạy 1–2 bước vật lý.'],
      ['Chọn lại **Không giới hạn**. Bấm **2 · Làm 1 frame chậm 100 ms**.', 'Dòng mới: “Frame ngay sau khi ngủ 100 ms: khoảng 5 lần FixedUpdate”.', 'Frame chậm thì chạy bù.'],
      ['Bấm **3 · Làm 1 frame chậm 1000 ms**.', 'Khoảng **16–17 lần**, không phải 50.', 'Maximum Allowed Timestep chặn vòng xoáy (2.6).'],
      ['Bấm **4 · Tự bấm nút Nhảy 50 lần**, đợi khoảng 6 giây.', '“Đọc trong FixedUpdate” (đỏ) bắt thiếu nhiều lần bấm; “Đọc ở Update…” (xanh) **50/50 (100%)**.', 'Đọc input ở Update (2.5).'],
      ['Bật **5 · Pause game (timeScale = 0)**, đợi 3 giây.', 'Update/giây vẫn > 0; FixedUpdate/giây = **0**; Tick WaitForSeconds đứng yên; Tick Realtime vẫn tăng. Khối đỏ (deltaTime) dừng, khối xanh (unscaledDeltaTime) vẫn xoay.', 'timeScale không dừng Update (2.4). Tắt Pause để tiếp tục.'],
    ],
  }));
  C.push(...demo({
    title: 'Coroutine và async sống tới khi nào?', scene: '04_Lifetime', slide: 23, script: '04_Lifetime/LifetimeWorker.cs',
    goal: 'thấy tắt script không dừng coroutine, Task không biết vòng đời object, và `destroyCancellationToken` sửa được điều đó.',
    steps: [
      ['Bấm Play, đợi 2 giây.', 'Coroutine của Worker, async void + Task.Delay, Awaitable đều **▲ đang chạy**. Khối vàng “Worker” xoay.', 'Trạng thái ban đầu.'],
      ['Bấm **1 · Tắt script (enabled = false)**, đợi 2 giây.', '“Script bật” = False, nhưng Coroutine của Worker **vẫn ▲ đang chạy**, khối vẫn xoay.', 'Tắt script không dừng coroutine (quiz câu 1).'],
      ['Bấm **2 · Bật script lại**. Bấm **3 · Demo gọi: StartCoroutine(worker.ExternalLoop())**, rồi **3b · Demo gọi: worker.StartCoroutine(worker.OwnedLoop())**.', 'Hai dòng “3 · StartCoroutine(…)” và “3b · worker.StartCoroutine(…)” đều chuyển sang ▲ đang chạy.', 'Cùng nằm trong Worker, nhưng (3) thuộc về Demo, (3b) thuộc về Worker (2.3b).'],
      ['Bấm **4 · Tắt GameObject Worker**, đợi 2 giây.', 'Coroutine của Worker và dòng **3b ■ đứng yên**; dòng **3 vẫn ▲**.', 'Coroutine dừng theo object **sở hữu** nó, không theo nơi chứa hàm.'],
      ['Bấm **5 · Bật GameObject Worker lại**, đợi 2 giây.', 'Coroutine của Worker và dòng 3b **vẫn ■ đứng yên**.', 'Bật lại không tự chạy coroutine.'],
      ['Bấm **6 · Destroy Worker**, đợi 2 giây.', '“Worker còn sống” = False; async void + Task.Delay **vẫn ▲** (đỏ); Awaitable **■ đứng yên** (xanh); dòng 3 **vẫn ▲**.', 'Task không biết object đã chết; token thì biết (quiz câu 6).'],
      ['Bấm **Stop** để thoát Play mode, mở cửa sổ Console.', 'Dòng **“[Task] Vẫn chạy sau khi đã thoát Play mode: tick N”** tiếp tục xuất hiện (tối đa 120 lần).', 'Task chạy cả sau khi thoát Play.'],
    ],
    after: [['Làm lại từ đầu', 'Đang Play: bấm **7 · Tạo Worker mới**. Mọi bộ đếm về 0.', 'info']],
  }));

  C.push(...summary(2, [
    ['Đăng ký sự kiện', '`OnEnable` đăng ký, `OnDisable` huỷ (hoặc `Awake` ↔ `OnDestroy`).', 'Đăng ký `OnEnable`, huỷ `OnDestroy`.'],
    ['Khởi tạo phụ thuộc nhau', 'Awake lo bản thân, Start lấy object khác; hoặc một chuỗi `Initialize()`.', 'Dựa vào thứ tự Awake giữa các script.'],
    ['Chạy coroutine điều khiển object khác', 'Để object đó tự chạy (`b.PlayScroll()`).', '`StartCoroutine(b.Scroll())` từ A.'],
    ['Coroutine lặp', 'Cache `WaitForSeconds`; nhớ: tắt script không dừng coroutine.', '`new WaitForSeconds` mỗi vòng; mong `enabled = false` dừng coroutine.'],
    ['Menu pause', '`unscaledDeltaTime`, `WaitForSecondsRealtime`, Animator Unscaled Time.', '`WaitForSeconds`/Animator mặc định cho UI lúc pause.'],
    ['Input điều khiển vật lý', 'Đọc ở `Update`, lưu cờ, xử lý ở `FixedUpdate`.', '`GetKeyDown` trong `FixedUpdate`.'],
    ['Logic nặng', 'Để ngoài `FixedUpdate`.', 'Tìm đường, xử lý nhiều object trong `FixedUpdate`.'],
    ['Chờ thời gian bằng async', '`Awaitable` + `destroyCancellationToken` (Unity 6); Task có token hoặc UniTask (2022.3).', '`async void` + `Task.Delay` không token.'],
  ]));
  return C;
};
