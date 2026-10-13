using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using Unity.Profiling;
using UnityEngine;

public class NativeCostDemo : MonoBehaviour
{
    enum UpdateMode { None, EmptyUpdate, Manager }

    [SerializeField] Transform mover;
    [SerializeField] int iterations = 100000;
    [SerializeField] int findIterations = 1000;
    [SerializeField] int updateObjectCount = 10000;

    readonly List<string> _results = new();
    readonly List<GameObject> _clutter = new();
    readonly List<GameObject> _updaters = new();
    readonly List<ManagedTicker> _tickers = new();

    ProfilerRecorder _gcRecorder;
    ProfilerRecorder _mainThreadRecorder;
    UpdateMode _mode;
    Rigidbody _cachedBody;
    GameObject _cachedTarget;
    string _stringSink;
    bool _boolSink;
    bool _busy;
    float _smoothedFrameMs;

    void OnEnable()
    {
        _gcRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Allocated In Frame");
        _mainThreadRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Internal, "Main Thread", 15);
    }

    void OnDisable()
    {
        _gcRecorder.Dispose();
        _mainThreadRecorder.Dispose();
    }

    void Start()
    {
        _cachedBody = GetComponent<Rigidbody>();
        _cachedTarget = GameObject.Find("Target");
    }

    void Update()
    {
        _smoothedFrameMs = Mathf.Lerp(_smoothedFrameMs, Time.unscaledDeltaTime * 1000f, 0.05f);
        if (_mode != UpdateMode.Manager) return;
        float dt = Time.deltaTime;
        for (int i = 0; i < _tickers.Count; i++) _tickers[i].Tick(dt);
    }

    #region Benchmarks

    IEnumerator Run(string title, int count, Action<int> body)
    {
        _busy = true;
        yield return null;
        var watch = Stopwatch.StartNew();
        body(count);
        watch.Stop();
        yield return null;
        long kb = _gcRecorder.LastValue / 1024;
        string line = $"{title}: <b>{watch.Elapsed.TotalMilliseconds:F2} ms</b>, GC cả frame ≈ <b>{kb} KB</b>";
        _results.Add(line);
        if (_results.Count > 8) _results.RemoveAt(0);
        DemoGui.Log($"{title} ({count:N0} lần): {watch.Elapsed.TotalMilliseconds:F2} ms, GC ≈ {kb} KB");
        _busy = false;
    }

    void GetComponentEveryTime(int n)
    {
        for (int i = 0; i < n; i++) _boolSink = GetComponent<Rigidbody>().isKinematic;
    }

    void CachedComponent(int n)
    {
        for (int i = 0; i < n; i++) _boolSink = _cachedBody.isKinematic;
    }

    void PositionReadThreeTimes(int n)
    {
        for (int i = 0; i < n; i++)
            mover.position = new Vector3(mover.position.x + 0.00001f, mover.position.y, mover.position.z);
    }

    void PositionReadOnce(int n)
    {
        for (int i = 0; i < n; i++)
        {
            var p = mover.position;
            p.x += 0.00001f;
            mover.position = p;
        }
    }

    void TagEquals(int n)
    {
        for (int i = 0; i < n; i++) _boolSink = gameObject.tag == "Player";
    }

    void TagCompare(int n)
    {
        for (int i = 0; i < n; i++) _boolSink = gameObject.CompareTag("Player");
    }

    void FindByName(int n)
    {
        for (int i = 0; i < n; i++) _cachedTarget = GameObject.Find("Target");
    }

    void FindByType(int n)
    {
        for (int i = 0; i < n; i++) _cachedBody = FindAnyObjectByType<Rigidbody>();
    }

    void AddClutter(int count)
    {
        var root = new GameObject($"Clutter x{count}").transform;
        _clutter.Add(root.gameObject);
        for (int i = 0; i < count; i++) new GameObject($"Clutter {i}").transform.SetParent(root, false);
        DemoGui.Log($"Đã thêm {count} object rỗng vào scene. Chạy lại test Find để so sánh.", DemoGui.Yellow);
    }

    void ClearClutter()
    {
        foreach (var go in _clutter) Destroy(go);
        _clutter.Clear();
        DemoGui.Log("Đã xoá object rác");
    }

    #endregion

    #region UpdateCost

    void SetMode(UpdateMode mode)
    {
        foreach (var go in _updaters) Destroy(go);
        _updaters.Clear();
        _tickers.Clear();
        _mode = mode;
        if (mode == UpdateMode.None) return;

        var root = new GameObject($"{mode} x{updateObjectCount}");
        _updaters.Add(root);
        for (int i = 0; i < updateObjectCount; i++)
        {
            var go = new GameObject("Unit");
            go.transform.SetParent(root.transform, false);
            if (mode == UpdateMode.EmptyUpdate) go.AddComponent<EmptyUpdateBehaviour>();
            else _tickers.Add(go.AddComponent<ManagedTicker>());
        }
        DemoGui.Log($"Chế độ: {mode} với {updateObjectCount:N0} object", DemoGui.Yellow);
    }

    double AverageMainThreadMs()
    {
        int count = _mainThreadRecorder.Count;
        if (count == 0) return 0;
        double sum = 0;
        for (int i = 0; i < count; i++) sum += _mainThreadRecorder.GetSample(i).Value;
        return sum / count * 1e-6;
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("02 · Mỗi lần gọi API = một lần qua ranh giới C# ⇄ C++", "Đo thời gian và rác bộ nhớ của những dòng code quen thuộc.");

        GUI.enabled = !_busy;
        DemoGui.Section($"A. So sánh từng cặp ({iterations:N0} lần)");
        if (DemoGui.Button("GetComponent mỗi lần  vs  lưu sẵn"))
            StartCoroutine(RunPair("GetComponent mỗi lần", GetComponentEveryTime, "Field đã lưu", CachedComponent, iterations));
        if (DemoGui.Button("transform.position đọc 3 lần  vs  đọc 1 lần"))
            StartCoroutine(RunPair("Đọc position 3 lần", PositionReadThreeTimes, "Đọc 1 lần vào biến", PositionReadOnce, iterations));
        if (DemoGui.Button("tag == \"Player\"  vs  CompareTag"))
            StartCoroutine(RunPair("tag ==", TagEquals, "CompareTag", TagCompare, iterations));

        DemoGui.Section($"B. Họ hàm Find ({findIterations:N0} lần)");
        if (DemoGui.Button("GameObject.Find  vs  FindAnyObjectByType"))
            StartCoroutine(RunPair("GameObject.Find(\"Target\")", FindByName, "FindAnyObjectByType<Rigidbody>", FindByType, findIterations));
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("+5.000 object vào scene")) AddClutter(5000);
        if (DemoGui.Button("Xoá object thêm")) ClearClutter();
        GUILayout.EndHorizontal();
        GUI.enabled = true;

        DemoGui.Section("Kết quả gần nhất");
        foreach (string line in _results) DemoGui.Label(line);

        DemoGui.Section($"C. Update rỗng ({updateObjectCount:N0} object)");
        int selected = DemoGui.Choice((int)_mode, new[] { "Không có Update", "Update rỗng", "1 Manager gọi Tick()" });
        if (selected != (int)_mode) SetMode((UpdateMode)selected);
        DemoGui.Value("Frame time (trung bình)", $"{_smoothedFrameMs:F2} ms", DemoGui.Yellow);
        DemoGui.Value("Main Thread (Profiler, 15 frame)", $"{AverageMainThreadMs():F2} ms", DemoGui.Yellow);
        DemoGui.Label("<color=#9AA4B1>Mở Profiler → CPU → tìm BehaviourUpdate để thấy rõ hơn.</color>");
        DemoGui.End();
    }

    IEnumerator RunPair(string titleA, Action<int> a, string titleB, Action<int> b, int count)
    {
        yield return Run(titleA, count, a);
        yield return Run(titleB, count, b);
    }

    #endregion
}
