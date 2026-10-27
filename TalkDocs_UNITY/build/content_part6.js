const { H1, callout, image, item, demo, deep, seeAlso, summary, table } = require('./lib');

module.exports = function part6() {
  const C = [];
  C.push(H1('Phần 6. Editor khác bản build'));
  C.push(...callout('Ý chính của phần', 'Editor chạy code khác hẳn điện thoại. Có lỗi **chỉ** xảy ra trên bản build, và có số đo **chỉ** đúng trong Editor. Phần này cũng có một mẹo giúp vào Play mode gần như ngay lập tức.', 'key'));
  C.push(...image('build', 620, 'Hình 8. Đường đi của code trong Editor (Mono) và trong bản build (IL2CPP)'));

  C.push(...item({
    title: '6.1 Hành vi chỉ có trong Editor và Debug.Log', level: 'trung_binh',
    situation: 'Log khắp nơi để debug, rồi build bản phát hành.',
    bad: `void Update()
{
    Debug.Log($"Vị trí: {transform.position}");   // vẫn chạy trong bản build
}`,
    api: [
      ['`Debug.Log(message)`', 'In một dòng ra Console (và log của thiết bị).', 'Vẫn chạy trong bản build: tạo string, lấy stack trace, ghi log.'],
      ['`[Conditional("UNITY_EDITOR")]`', 'Attribute C#: mọi lời gọi hàm này bị **xoá khi compile** nếu ký hiệu không được định nghĩa.', 'Xoá cả biểu thức tham số, nên không tạo string.'],
      ['`UNITY_EDITOR`, `DEVELOPMENT_BUILD`', 'Ký hiệu biên dịch Unity định nghĩa sẵn khi chạy trong Editor / build Development.', 'Dùng với `#if` hoặc `[Conditional]`.'],
    ],
    truth: [
      'Editor thêm nhiều kiểm tra phục vụ debug: `GetComponent` tạo object giả null (1.6), Inspector đang mở cũng tốn thời gian vẽ, script chạy bằng Mono thay vì IL2CPP.',
      '`Debug.Log` vẫn chạy trong bản build. Gọi trong `Update` có thể làm game chậm thấy rõ.',
    ],
    effect: 'Tối ưu theo số đo trong Editor dễ sai hướng. Log quên xoá làm chậm bản phát hành.',
    good: `public static class Log
{
    [System.Diagnostics.Conditional("UNITY_EDITOR"), System.Diagnostics.Conditional("DEVELOPMENT_BUILD")]
    public static void Info(string msg) => UnityEngine.Debug.Log(msg);
}
// Log.Info($"Vị trí: {transform.position}");  → bị xoá hoàn toàn trong bản Release`,
    compare: [
      ['`Debug.Log` trực tiếp', 'Không cần chuẩn bị gì.', 'Chạy cả trong bản phát hành; tạo rác; tốn thời gian.', 'Debug tạm thời, xoá trước khi merge.'],
      ['Wrapper có `[Conditional]`', 'Bản phát hành không còn dòng log nào, không tốn gì.', 'Cần một class Log dùng chung; log không có trong bản Release để điều tra lỗi.', 'Log debug thường xuyên.'],
    ],
    notes: [['Quy tắc đo hiệu năng', 'Đo trên **thiết bị thật**, bản **Development Build** có bật Autoconnect Profiler. Số trong Editor chỉ dùng để so sánh tương đối.', 'info']],
    remember: 'Log debug đi qua wrapper **`[Conditional]`**. **Đo hiệu năng trên máy thật.**',
  }));

  C.push(...item({
    title: '6.2 IL2CPP và Code Stripping: Editor chạy tốt, build lại hỏng', level: 'nang_cao',
    situation: 'Load dữ liệu save từ JSON bằng thư viện Newtonsoft.',
    bad: `[Serializable]
public class SaveData { public int coins; public List<string> items; }

// Không có chỗ nào gọi new SaveData() trực tiếp
var data = JsonConvert.DeserializeObject<SaveData>(json);   // build: lỗi thiếu constructor/kiểu`,
    api: [
      ['IL2CPP', 'Cách build chuyển code C# sang C++ rồi biên dịch thành mã máy.', 'Bắt buộc trên iOS; thực tế bắt buộc cho Android phát hành (ARM64).'],
      ['Managed Code Stripping (UnityLinker)', 'Bước xoá class/hàm “không thấy ai dùng” để giảm dung lượng.', 'Mức chỉnh ở Player Settings → Managed Stripping Level.'],
      ['`JsonConvert.DeserializeObject<T>(json)`', 'Hàm của Newtonsoft.Json: tạo object T từ chuỗi JSON.', 'Tạo object qua reflection, UnityLinker không thấy.'],
      ['`[Preserve]`', 'Attribute báo UnityLinker giữ lại class/hàm này.', 'Namespace `UnityEngine.Scripting`.'],
      ['`link.xml`', 'File cấu hình giữ lại cả namespace/assembly.', 'Đặt trong thư mục Assets.'],
    ],
    truth: [
      'Bản build mobile dùng **IL2CPP**. Trước đó, **Managed Code Stripping** xoá những gì nó “không thấy ai dùng”.',
      'UnityLinker phân tích code tĩnh nên **không thấy** những thứ dùng qua reflection: thư viện JSON tạo object, `Type.GetType("TênClass")`, `AddComponent` theo tên.',
    ],
    effect: 'Editor (Mono, không stripping) chạy hoàn hảo. Bản build báo thiếu kiểu, thiếu constructor, hoặc dữ liệu load ra toàn giá trị mặc định. Stripping Level càng cao, nguy cơ càng lớn.',
    good: `using UnityEngine.Scripting;

[Preserve, Serializable]
public class SaveData { public int coins; public List<string> items; }

// Hoặc Assets/link.xml giữ cả namespace:
<linker>
  <assembly fullname="Assembly-CSharp">
    <type fullname="Game.Save.*" preserve="all"/>
  </assembly>
</linker>`,
    compare: [
      ['`[Preserve]` trên từng class', 'Rõ ràng, nằm ngay cạnh code.', 'Dễ quên với class mới.', 'Ít class dùng qua reflection.'],
      ['`link.xml`', 'Giữ cả namespace/assembly một lần.', 'Giữ thừa làm build nặng hơn; nằm xa code.', 'Thư viện ngoài, cả nhóm class save/network.'],
    ],
    notes: [['Mẹo kiểm tra sớm', 'Thường xuyên build thử IL2CPP với đúng mức Managed Stripping Level của bản phát hành, đừng đợi tới ngày release.', 'warn']],
    remember: 'Class chỉ được tạo qua **reflection/JSON**: đánh dấu **`[Preserve]`** hoặc thêm vào **`link.xml`**.',
  }));

  C.push(...item({
    title: '6.3 Enter Play Mode Options: vào Play gần như ngay lập tức', level: 'nang_cao',
    situation: 'Project lớn, mỗi lần bấm Play mất 10 giây.',
    bad: `public static class GameStats
{
    public static int Kills;                    // lần Play thứ 2 bắt đầu với Kills của lần 1
    public static event System.Action OnKill;   // vẫn giữ handler từ lần Play trước
}`,
    api: [
      ['Domain Reload', 'Mỗi lần bấm Play, Unity khởi động lại toàn bộ môi trường C# (reset mọi biến static).', 'Tốn vài giây với project lớn.'],
      ['Enter Play Mode Settings', 'Cài đặt bỏ qua Domain Reload/Scene Reload khi vào Play (Project Settings → Editor).', 'Giao diện hơi khác giữa 2022.3 và Unity 6.'],
      ['`EditorSettings.enterPlayModeOptions`', 'API Editor đọc/ghi cài đặt trên (demo 08 dùng).', 'Chỉ trong Editor.'],
      ['`[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]`', 'Đánh dấu hàm static tự chạy **đầu mỗi lần vào Play**, rất sớm.', 'Chạy cả khi đã tắt Domain Reload: chỗ để reset static.'],
    ],
    truth: [
      'Mặc định mỗi lần Play, Unity làm **Domain Reload** (khởi động lại C#) và **Scene Reload**. Project lớn có thể mất 5–15 giây.',
      'Tắt Domain Reload thì vào Play nhanh hơn nhiều. Đổi lại: **biến static không tự reset**, event static giữ handler từ lần Play trước.',
    ],
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
    compare: [
      ['Domain Reload bật (mặc định)', 'An toàn: mọi static tự reset.', 'Mỗi lần Play chờ vài giây.', 'Project nhỏ, hoặc chưa rà được static.'],
      ['Domain Reload tắt', 'Vào Play gần như ngay lập tức.', 'Phải tự reset static và event static; lỗi khó hiểu nếu sót.', 'Project lớn, team đã rà static.'],
    ],
    notes: [['Nên áp dụng thế nào', 'Thử trên nhánh riêng. Rà các class có field `static` (Singleton, event static), thêm hàm reset. Đo thời gian trước và sau để thuyết phục team.', 'info']],
    remember: 'Tắt Domain Reload thì **mọi static phải tự reset** bằng `[RuntimeInitializeOnLoadMethod(SubsystemRegistration)]`.',
  }));

  C.push(...item({
    title: '6.4 Checklist cho dev trước khi build bản phát hành', level: 'trung_binh',
    situation: 'Chuẩn bị build bản đưa lên store hoặc gửi QA test trên điện thoại.',
    api: [
      ['Player Settings → Scripting Backend', 'Chọn cách build code: Mono hoặc **IL2CPP**.', 'iOS bắt buộc IL2CPP; Android lên Google Play cần ARM64 nên dùng IL2CPP.'],
      ['Target Architectures (Android)', 'Chọn kiến trúc CPU: ARMv7, **ARM64**…', 'Google Play yêu cầu có bản 64-bit.'],
      ['Managed Stripping Level', 'Mức xoá code không dùng: Minimal → High.', 'Mức cao giảm dung lượng nhưng dễ xoá nhầm (6.2).'],
      ['Development Build / Script Debugging / Autoconnect Profiler', 'Bật để debug và đo trên máy thật.', 'Tắt cho bản phát hành: chậm hơn, nặng hơn, lộ thông tin debug.'],
      ['Stack Trace (Player Settings → Other)', 'Mức stack trace in kèm mỗi log: None / ScriptOnly / Full.', 'Bản phát hành: Log và Warning = None để log rẻ; Error/Exception = ScriptOnly để còn thông tin khi crash.'],
      ['`Application.targetFrameRate`', 'Số FPS game cố gắng đạt.', 'Trên **Android/iOS mặc định là 30 FPS** nếu không đặt.'],
      ['`Application.persistentDataPath`', 'Thư mục ghi được trên mọi nền tảng (lưu save, cache).', '`Application.dataPath` trên điện thoại chỉ đọc.'],
      ['`Screen.safeArea`', 'Vùng màn hình không bị tai thỏ / thanh hệ thống che.', 'Chỉ thấy khác biệt trên máy thật hoặc Device Simulator.'],
      ['`#if UNITY_EDITOR`, `#if DEVELOPMENT_BUILD`, `#if UNITY_ANDROID`', 'Biên dịch code theo môi trường / nền tảng.', 'Code trong khối không khớp **không có** trong bản build.'],
      ['Build Report (Editor.log)', 'Sau mỗi lần build, Editor.log liệt kê asset theo dung lượng.', 'Mở bằng Console → menu ⋮ → Open Editor Log.'],
    ],
    extra: table(['Hạng mục', 'Cần làm', 'Vì sao'], [
      ['Code backend', 'IL2CPP + ARM64 (Android); build thử định kỳ, không đợi ngày release.', 'Lỗi stripping/AOT chỉ hiện trên bản IL2CPP (6.2).'],
      ['Chế độ build', 'Tắt Development Build, Script Debugging, Autoconnect Profiler.', 'Bản debug chậm hơn và nặng hơn.'],
      ['Log', 'Log debug qua wrapper `[Conditional]`; Stack Trace Log = None.', '`Debug.Log` vẫn chạy và tốn thời gian trong bản phát hành (6.1).'],
      ['Frame rate', 'Đặt `Application.targetFrameRate` ngay khi game khởi động.', 'Mobile mặc định 30 FPS: game “mượt” trong Editor nhưng chỉ 30 trên máy.'],
      ['Lưu dữ liệu', 'Ghi vào `Application.persistentDataPath`.', 'Ghi chỗ khác có thể lỗi quyền truy cập trên điện thoại.'],
      ['Shader', 'Không `Shader.Find`; kiểm tra Always Included Shaders.', 'Shader không được tham chiếu sẽ không có trong build.'],
      ['Code chỉ dành cho Editor', 'Bọc `#if UNITY_EDITOR` hoặc để trong thư mục `Editor`.', 'Nếu không: lỗi compile **chỉ lúc build**.'],
      ['Dung lượng', 'Xem Build Report; dọn thư mục `Resources`; nén texture (ASTC).', '`Resources` vào build toàn bộ; texture chưa nén chiếm nhiều MB.'],
      ['GC', 'Bật Incremental GC.', 'Giảm khựng do GC (Phần 4).'],
      ['Màn hình', 'Test tỉ lệ màn hình, tai thỏ (`Screen.safeArea`) trên máy thật / Device Simulator.', 'Editor không có tai thỏ.'],
      ['Thiết bị', 'Test trên máy yếu nhất mà game hỗ trợ.', 'Hiệu năng, bộ nhớ, nhiệt độ khác hẳn máy dev.'],
      ['Phiên bản', 'Tăng Version và Bundle Version Code / Build Number.', 'Store từ chối bản trùng số build.'],
    ], [20, 44, 36]),
    good: `// Khởi động game: đặt frame rate (mobile mặc định chỉ 30)
void Awake() => Application.targetFrameRate = 60;

// Lưu dữ liệu vào thư mục ghi được trên mọi nền tảng
string SavePath => System.IO.Path.Combine(Application.persistentDataPath, "save.json");

// Menu debug chỉ có trong Editor và bản Development
#if UNITY_EDITOR || DEVELOPMENT_BUILD
    DebugMenu.Show();
#endif

// Tránh tai thỏ: đặt UI theo vùng an toàn
Rect safe = Screen.safeArea;

// Code theo nền tảng
#if UNITY_ANDROID
    AndroidOnlySetup();
#elif UNITY_IOS
    IosOnlySetup();
#endif`,
    notes: [['Ví dụ lỗi chỉ gặp khi build', [
      'Game chạy 60 FPS trong Editor, lên điện thoại chỉ 30: quên `Application.targetFrameRate`.',
      'Save hoạt động trong Editor, lên Android không lưu được: ghi vào `Application.dataPath` hoặc đường dẫn cố định.',
      'Bản build có object màu hồng: shader chỉ được gọi bằng `Shader.Find` nên bị loại khỏi build.',
      'Build lỗi “The name AssetDatabase does not exist”: script runtime dùng API Editor mà không bọc `#if UNITY_EDITOR`.',
      'Load save ra toàn giá trị 0: class dữ liệu bị stripping xoá constructor (6.2).',
    ], 'warn']],
    remember: 'Trước khi build: **IL2CPP + ARM64**, tắt Development, **log qua [Conditional]**, đặt **targetFrameRate**, lưu vào **persistentDataPath**, và **test trên máy thật**.',
  }));

  C.push(...deep('6.5 Phân tích sâu: vì sao bản build mobile khác Editor', [
    'Trong Editor, code chạy bằng **Mono có JIT** (biên dịch lúc chạy) kèm nhiều kiểm tra debug. Trên iOS bắt buộc **IL2CPP**; trên Android, bản phát hành lên Google Play cần ARM64 nên thực tế cũng dùng IL2CPP.',
    'IL2CPP là **AOT** (biên dịch trước toàn bộ). Không có JIT nghĩa là:',
    [
      'Code sinh kiểu/hàm lúc chạy (`System.Reflection.Emit`) không chạy được.',
      'Một số kiểu generic chỉ được tạo qua reflection có thể thiếu code ở bản build.',
      'Bước stripping xoá những gì nó không thấy được dùng (6.2).',
    ],
  ]));
  C.push(...seeAlso('6.6 Những lỗi “Editor chạy, build hỏng” hay gặp khác', [
    ['`Shader.Find("Custom/Outline")`', 'Bản build chỉ chứa shader được material dùng tới hoặc nằm trong Always Included Shaders. Shader chỉ gọi bằng tên sẽ trả về **null**.', 'Tham chiếu shader qua material/field, hoặc thêm vào Always Included Shaders.'],
    ['`AssetDatabase`, `EditorUtility` trong script runtime', 'Namespace `UnityEditor` không có trong bản build: lỗi compile **chỉ lúc build**.', 'Bọc trong `#if UNITY_EDITOR` hoặc đặt file vào thư mục `Editor`.'],
    ['Thư mục `Resources`', 'Mọi thứ trong đó đều vào bản build, kể cả không dùng.', 'Hạn chế; dùng reference trực tiếp hoặc Addressables.'],
    ['Đường dẫn file', '`Application.dataPath` trên điện thoại chỉ đọc.', 'Lưu dữ liệu vào `Application.persistentDataPath`.'],
    ['Input chuột', 'Editor thử bằng chuột; điện thoại là touch, multi-touch.', 'Test trên máy thật; xử lý `Input.touchCount`.'],
  ]));

  C.push(...demo({
    title: 'Vào Play nhanh hơn, nhưng static không tự reset', scene: '08_EnterPlayMode', slide: null, script: '08_EnterPlayMode/PlaySession.cs',
    goal: 'đo thời gian vào Play, và thấy biến/event static không reset khi tắt Domain Reload.',
    steps: [
      ['Bấm Play. Bấm Stop rồi Play lại 1 lần nữa.', '“Domain Reload” = **đang bật** (xanh); mọi bộ đếm “Lần Play thứ” = **1**; “Số handler Ping” = **2**. Ghi lại “Lần vào Play gần nhất mất … ms”.', 'Mặc định: mọi static được reset.'],
      ['Bấm **2 · Tắt Domain Reload…**, rồi Stop và Play lại 2–3 lần.', '“Domain Reload” = **ĐANG TẮT**; thời gian vào Play **giảm**; “static KHÔNG reset” = **2, 3, 4…** (đỏ); “có RuntimeInitializeOnLoadMethod” vẫn **1**; “Số handler Ping” tăng **3, 4, 5…**.', 'Static giữ giá trị của lần Play trước.'],
      ['Bấm **3 · Phát sự kiện Ping**.', 'Các dòng “Handler từ lần Play trước” = **MissingReferenceException** (đỏ); “Listener A (đăng ký Start, không huỷ)” nhận Ping 1 lần; “Listener B (đăng ký OnEnable, huỷ OnDisable)” nhận Ping (xanh).', 'Handler cũ trỏ tới object đã chết (nối lại demo 01).'],
      ['Bấm **4 · Bật lại Domain Reload**, Stop rồi Play.', '“Domain Reload” = **đang bật**; mọi bộ đếm về **1**.', 'Bắt buộc làm sau khi test.'],
    ],
  }));

  C.push(...summary(6, [
    ['Log debug', 'Wrapper `[Conditional("UNITY_EDITOR")]`.', '`Debug.Log` trong `Update` của bản phát hành.'],
    ['Đo hiệu năng', 'Development Build trên máy thật + Profiler.', 'Kết luận từ số đo trong Editor.'],
    ['Class tạo qua JSON/reflection', '`[Preserve]` hoặc `link.xml`; build thử IL2CPP thường xuyên.', 'Đợi tới ngày release mới build IL2CPP lần đầu.'],
    ['Shader dùng trong code', 'Tham chiếu qua material/field.', '`Shader.Find("tên")`.'],
    ['Code dùng API Editor', '`#if UNITY_EDITOR` hoặc thư mục `Editor`.', '`using UnityEditor;` trong script runtime.'],
    ['Frame rate trên mobile', '`Application.targetFrameRate = 60` khi khởi động.', 'Để mặc định (mobile chỉ 30 FPS).'],
    ['Lưu dữ liệu', '`Application.persistentDataPath`.', '`Application.dataPath` hoặc đường dẫn cố định.'],
    ['Cài đặt build phát hành', 'IL2CPP + ARM64; tắt Development; Stack Trace Log = None.', 'Phát hành bản Development / Mono.'],
    ['Tắt Domain Reload', 'Reset static bằng `[RuntimeInitializeOnLoadMethod(SubsystemRegistration)]`.', 'Tắt mà không rà biến/event static.'],
  ]));
  return C;
};
