using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.Profiling;
using UnityEngine.Scripting;

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

    [SerializeField] int iterations = 200;

    readonly List<int> _numbers = Enumerable.Range(0, 32).ToList();
    readonly List<Transform> _transforms = new();
    readonly List<byte[]> _bigBlocks = new();
    readonly float[] _history = new float[60];

    ProfilerRecorder _gcRecorder;
    Case _case;
    int _historyIndex;
    int _counter;
    object _sink;
    long _sum;
    float _baselineKb;
    int _startCollections;
    float _startTime;

    void OnEnable() => _gcRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Allocated In Frame");
    void OnDisable() => _gcRecorder.Dispose();

    void Start()
    {
        _startCollections = GC.CollectionCount(0);
        _startTime = Time.realtimeSinceStartup;
    }

    void Update()
    {
        _history[_historyIndex] = _gcRecorder.LastValue / 1024f;
        _historyIndex = (_historyIndex + 1) % _history.Length;
        if (_case == Case.None) _baselineKb = AverageKb();
        for (int i = 0; i < iterations; i++) Execute(_case);
    }

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

    float AverageKb()
    {
        float sum = 0f;
        foreach (float v in _history) sum += v;
        return sum / _history.Length;
    }

    void AllocateBigBlocks()
    {
        for (int i = 0; i < 64; i++) _bigBlocks.Add(new byte[1024 * 1024]);
        DemoGui.Log("Đã cấp phát 64 MB (giữ lại trong list)", DemoGui.Yellow);
    }

    void ReleaseBigBlocks()
    {
        _bigBlocks.Clear();
        GC.Collect();
        DemoGui.Log("Bỏ 64 MB + GC.Collect(): Used giảm, nhưng Heap size thường KHÔNG co lại", DemoGui.Red);
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("06 · Garbage Collector: rác sinh ra từ đâu?", $"Mỗi frame chạy trường hợp đã chọn {iterations} lần rồi đo GC Alloc của cả frame.");

        DemoGui.Section("Chọn trường hợp");
        int selected = DemoGui.Choice((int)_case, Labels, 2);
        if (selected != (int)_case)
        {
            _case = (Case)selected;
            DemoGui.Log($"Chuyển sang: {Labels[selected]}  (dự kiến tạo rác: {(Expected[selected] ? "CÓ" : "KHÔNG")})", Expected[selected] ? DemoGui.Red : DemoGui.Green);
        }

        float avg = AverageKb();
        float delta = Mathf.Max(0f, avg - _baselineKb);
        DemoGui.Section("Số đo");
        DemoGui.Value("GC Alloc / frame (trung bình 60 frame)", $"{avg:F1} KB");
        DemoGui.Value("Mốc khi \"Không làm gì\" (IMGUI cũng tạo rác)", $"{_baselineKb:F1} KB", DemoGui.Gray);
        DemoGui.Value("Chênh lệch do trường hợp đang chọn", $"{delta:F1} KB/frame", delta > 0.5f ? DemoGui.Red : DemoGui.Green);
        float minutes = Mathf.Max((Time.realtimeSinceStartup - _startTime) / 60f, 0.01f);
        DemoGui.Value("Số lần GC đã chạy", $"{GC.CollectionCount(0) - _startCollections}  ({(GC.CollectionCount(0) - _startCollections) / minutes:F0} lần/phút)", DemoGui.Yellow);

        DemoGui.Section("Heap của Mono (Boehm)");
        DemoGui.Value("Đang dùng (Used)", $"{Profiler.GetMonoUsedSizeLong() / (1024f * 1024f):F1} MB");
        DemoGui.Value("Kích thước heap (Reserved)", $"{Profiler.GetMonoHeapSizeLong() / (1024f * 1024f):F1} MB", DemoGui.Yellow);
        DemoGui.Value("Incremental GC", DemoGui.YesNo(GarbageCollector.isIncremental));
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Cấp phát 64 MB")) AllocateBigBlocks();
        if (DemoGui.Button("Bỏ đi + GC.Collect()")) ReleaseBigBlocks();
        GUILayout.EndHorizontal();
        DemoGui.Label("<color=#9AA4B1>Mở Profiler → CPU → cột GC Alloc để xem đúng hàm nào tạo rác.</color>");
        DemoGui.End();
    }

    #endregion
}
