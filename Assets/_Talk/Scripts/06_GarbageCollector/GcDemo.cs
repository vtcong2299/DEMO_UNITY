using System;
using System.Collections.Generic;
using System.Linq;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.Profiling;
using UnityEngine.Scripting;
using V = DemoGui.Verdict;

public class GcDemo : MonoBehaviour
{
    enum Case
    {
        None, StringConcat, Interpolation, Linq, CapturingLambda, StaticLambda,
        ForeachList, ForeachInterface, Boxing, Params, NewWaitForSeconds, TagRead, CompareTag,
        GetComponentsArray, GetComponentsList,
    }

    static readonly string[] Labels =
    {
        "Không làm gì (mốc)", "\"Score: \" + i", "$\"HP {i}\"", "LINQ Where().ToList()", "Lambda dùng biến ngoài", "Lambda không dùng biến ngoài",
        "foreach List<T>", "foreach IEnumerable<T>", "Boxing: object o = i", "Hàm params int[]", "new WaitForSeconds()", "gameObject.tag", "CompareTag()",
        "GetComponents<T>() mảng", "GetComponents(list)",
    };

    static readonly bool[] Expected =
    {
        false, true, true, true, true, false,
        false, true, true, true, true, true, false,
        true, false,
    };

    const int SampleCount = 30;
    const float ZeroThresholdBytes = 2f;
    const float GcWindowSeconds = 10f;

    [SerializeField] int iterations = 1000;

    readonly List<int> _numbers = Enumerable.Range(0, 32).ToList();
    readonly List<Transform> _transforms = new();
    readonly List<byte[]> _bigBlocks = new();
    readonly Queue<float> _onSamples = new();
    readonly Queue<float> _offSamples = new();
    readonly float[] _bytesPerCall = Enumerable.Repeat(-1f, Labels.Length).ToArray();
    readonly List<float> _gcTimes = new();

    ProfilerRecorder _gcRecorder;
    Case _case;
    bool _ranThisFrame;
    int _counter;
    object _sink;
    long _sum;
    int _lastCollectionCount;
    float _lastGcFrameMs;
    float _smoothedFrameMs;

    void OnEnable() => _gcRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Allocated In Frame");
    void OnDisable() => _gcRecorder.Dispose();

    void Start() => _lastCollectionCount = GC.CollectionCount(0);

    void Update()
    {
        TrackCollections();
        RecordPreviousFrame();

        _ranThisFrame = !_ranThisFrame;
        if (_ranThisFrame)
            for (int i = 0; i < iterations; i++) Execute(_case);
    }

    #region Measure

    // alternate run/skip frames so the demo UI's own per-frame garbage cancels out of the difference
    void RecordPreviousFrame()
    {
        float bytes = _gcRecorder.LastValue;
        var target = _ranThisFrame ? _onSamples : _offSamples;
        target.Enqueue(bytes);
        if (target.Count > SampleCount) target.Dequeue();

        if (_onSamples.Count < SampleCount || _offSamples.Count < SampleCount) return;
        float perCall = Mathf.Max(0f, (Median(_onSamples) - Median(_offSamples)) / iterations);
        _bytesPerCall[(int)_case] = perCall;
    }

    // median ignores the occasional Editor spike that would skew an average
    static float Median(IEnumerable<float> samples)
    {
        var sorted = samples.OrderBy(s => s).ToList();
        return sorted[sorted.Count / 2];
    }

    void TrackCollections()
    {
        float frameMs = Time.unscaledDeltaTime * 1000f;
        int count = GC.CollectionCount(0);
        if (count != _lastCollectionCount)
        {
            _lastCollectionCount = count;
            _lastGcFrameMs = frameMs;
            _gcTimes.Add(Time.realtimeSinceStartup);
            return;
        }
        _smoothedFrameMs = Mathf.Lerp(_smoothedFrameMs, frameMs, 0.05f);
        _gcTimes.RemoveAll(time => Time.realtimeSinceStartup - time > GcWindowSeconds);
    }

    void SelectCase(Case c)
    {
        _case = c;
        _onSamples.Clear();
        _offSamples.Clear();
    }

    static string FormatBytes(float bytes) => bytes < 0f ? "đang đo…" : bytes < ZeroThresholdBytes ? "≈ 0 B/lần" : $"{bytes:F0} B/lần";

    #endregion

    #region Cases

    void Execute(Case c)
    {
        _counter++;
        switch (c)
        {
            case Case.None: break;
            case Case.StringConcat: _sink = "Score: " + _counter; break;
            case Case.Interpolation: _sink = $"HP {_counter}/100"; break;
            case Case.Linq: _sink = _numbers.Where(n => n > 10).ToList(); break;
            case Case.CapturingLambda: { int limit = _counter; Func<int, bool> f = n => n > limit; _sink = f; break; }
            case Case.StaticLambda: { Func<int, bool> f = n => n > 10; _sink = f; break; }
            case Case.ForeachList: foreach (int n in _numbers) _sum += n; break;
            case Case.ForeachInterface: { IEnumerable<int> e = _numbers; foreach (int n in e) _sum += n; break; }
            case Case.Boxing: _sink = _counter; break;
            case Case.Params: _sum += Sum(1, 2, 3); break;
            case Case.NewWaitForSeconds: _sink = new WaitForSeconds(1f); break;
            case Case.TagRead: _sink = gameObject.tag; break;
            case Case.CompareTag: _sum += gameObject.CompareTag("Player") ? 1 : 0; break;
            case Case.GetComponentsArray: _sink = GetComponents<Transform>(); break;
            case Case.GetComponentsList: GetComponents(_transforms); break;
            default: throw new ArgumentOutOfRangeException(nameof(c), c, null);
        }
    }

    static int Sum(params int[] values)
    {
        int total = 0;
        foreach (int v in values) total += v;
        return total;
    }

    void AllocateBigBlocks()
    {
        for (int i = 0; i < 64; i++) _bigBlocks.Add(new byte[1024 * 1024]);
        DemoGui.Log("Đã cấp phát 64 MB (giữ lại trong list): Used và Heap size cùng tăng", DemoGui.Yellow);
    }

    void ReleaseBigBlocks()
    {
        _bigBlocks.Clear();
        GC.Collect();
        DemoGui.Log("Bỏ 64 MB + GC.Collect(): Used giảm, Heap size thường giữ nguyên", DemoGui.Red);
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("06 · Rác bộ nhớ sinh ra từ đâu?", $"Đoạn code nào tạo rác, mỗi lần gọi bao nhiêu byte? (chạy {iterations} lần, xen kẽ frame có/không)");

        DemoGui.Section("Các bước");
        DemoGui.Hint("1 · Chọn lần lượt từng ô, mỗi ô đợi khoảng 1 giây tới khi bảng bên phải hiện số. Kỳ vọng: ô đỏ ra vài chục byte/lần trở lên, ô xanh ra ≈ 0 B/lần.");
        int selected = DemoGui.Choice((int)_case, Labels, 2);
        if (selected != (int)_case) SelectCase((Case)selected);
        GUILayout.BeginHorizontal();
        bool allocate = DemoGui.Button("<b>2</b> · Cấp phát 64 MB");
        bool release = DemoGui.Button("<b>3</b> · Bỏ đi + GC.Collect()");
        GUILayout.EndHorizontal();
        if (allocate) AllocateBigBlocks();
        if (release) ReleaseBigBlocks();
        DemoGui.Hint("→ Kỳ vọng bước 2–3: Used tăng rồi giảm; Reserved tăng rồi GIỮ NGUYÊN (heap không co lại).");
        DemoGui.Hint("4 · Chọn “LINQ Where().ToList()”, quan sát “Số lần GC” và “Frame có GC”. Kỳ vọng: GC chạy dày hơn; frame có GC chậm hơn frame thường.");

        DemoGui.Takeaway("Code chạy mỗi frame: không ghép chuỗi, không LINQ, không lambda dùng biến ngoài, không foreach qua interface. Dùng bản <b>NonAlloc</b>/nhận <b>List</b>, <b>CompareTag</b>, cache <b>WaitForSeconds</b>.");

        DemoGui.Live("Đang chạy", Labels[(int)_case], Expected[(int)_case] ? V.Bad : V.Good);
        DemoGui.Live("Số lần GC đã chạy", GC.CollectionCount(0), V.Info, "GC chạy khi heap không còn đủ chỗ trống cho lần cấp phát mới. Tạo rác càng nhanh → GC chạy càng dày.");
        DemoGui.Live($"Số lần GC trong {GcWindowSeconds:F0} giây gần nhất", _gcTimes.Count, _gcTimes.Count > 1 ? V.Bad : V.Info, "Đổi ô xong đợi 10 giây để con số phản ánh ô mới.");
        DemoGui.Live("Frame có GC gần nhất / frame thường", $"{_lastGcFrameMs:F1} ms / {_smoothedFrameMs:F1} ms", _lastGcFrameMs > _smoothedFrameMs * 1.5f ? V.Bad : V.Info, "Frame có GC dài hơn: đó là cú khựng người chơi thấy.");
        DemoGui.Live("Heap đang dùng (Used)", $"{Profiler.GetMonoUsedSizeLong() / (1024f * 1024f):F0} MB", V.Info, "Trong Editor heap chứa cả dữ liệu của Editor nên rất lớn; trên điện thoại nhỏ hơn nhiều.");
        DemoGui.Live("Kích thước heap (Reserved)", $"{Profiler.GetMonoHeapSizeLong() / (1024f * 1024f):F0} MB", V.Info, $"Incremental GC: {DemoGui.YesNo(GarbageCollector.isIncremental)}");
        for (int i = 1; i < Labels.Length; i++)
            DemoGui.Live(Labels[i], FormatBytes(_bytesPerCall[i]), Expected[i] ? V.Bad : V.Good);
        DemoGui.End();
    }

    #endregion
}
