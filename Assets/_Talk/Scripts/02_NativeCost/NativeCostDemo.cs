using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using Unity.Profiling;
using UnityEngine;
using V = DemoGui.Verdict;

public class NativeCostDemo : MonoBehaviour
{
    enum UpdateMode { None, EmptyUpdate, Manager }

    [SerializeField] Transform mover;
    [SerializeField] int iterations = 100000;
    [SerializeField] int findIterations = 1000;
    [SerializeField] int updateObjectCount = 10000;

    readonly List<GameObject> _clutter = new();
    readonly List<GameObject> _updaters = new();
    readonly List<ManagedTicker> _tickers = new();

    ProfilerRecorder _gcRecorder;
    ProfilerRecorder _mainThreadRecorder;
    UpdateMode _mode;
    Rigidbody _cachedBody;
    GameObject _cachedTarget;
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

    struct Measure
    {
        public double Ms;
        public long Kb;
    }

    IEnumerator Run(int count, Action<int> body, Action<Measure> done)
    {
        yield return null;
        var watch = Stopwatch.StartNew();
        body(count);
        watch.Stop();
        yield return null;
        done(new Measure { Ms = watch.Elapsed.TotalMilliseconds, Kb = _gcRecorder.LastValue / 1024 });
    }

    IEnumerator Compare(string slow, Action<int> slowBody, string fast, Action<int> fastBody, int count, string note)
    {
        _busy = true;
        Measure a = default, b = default;
        yield return Run(count, slowBody, m => a = m);
        yield return Run(count, fastBody, m => b = m);
        double ratio = b.Ms > 0.0001 ? a.Ms / b.Ms : 0;
        DemoGui.Result(slow, $"{a.Ms:F2} ms · {a.Kb} KB", V.Bad);
        DemoGui.Result(fast, $"{b.Ms:F2} ms · {b.Kb} KB", V.Good, $"Chậm hơn ≈ {ratio:F1} lần. {note}");
        DemoGui.Log($"{slow} vs {fast} ({count:N0} lần): {a.Ms:F2} ms / {b.Ms:F2} ms");
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

    void CachedTarget(int n)
    {
        for (int i = 0; i < n; i++) _boolSink = _cachedTarget != null;
    }

    void AddClutter(int count)
    {
        var root = new GameObject($"Clutter x{count}").transform;
        _clutter.Add(root.gameObject);
        for (int i = 0; i < count; i++) new GameObject($"Clutter {i}").transform.SetParent(root, false);
        DemoGui.Log($"Đã thêm {count:N0} object rỗng. Scene giờ có {_clutter.Count * count:N0} object thêm.", DemoGui.Yellow);
    }

    void ClearClutter()
    {
        foreach (var go in _clutter) Destroy(go);
        _clutter.Clear();
        DemoGui.Log("Đã xoá object thêm");
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
        DemoGui.Begin("02 · Gọi API Unity tốn bao nhiêu?", "Mỗi lần gọi là một lần đi qua ranh giới C# ⇄ C++. Đo bằng số thì chênh bao nhiêu?");
        GUI.enabled = !_busy;
        DemoGui.Section($"A. So sánh từng cặp ({iterations:N0} lần mỗi cách)");
        if (DemoGui.Step(1, "GetComponent mỗi lần  vs  lưu sẵn vào field", "Lưu sẵn nhanh hơn nhiều lần, cả hai đều không tạo rác."))
            StartCoroutine(Compare("GetComponent<Rigidbody>() mỗi lần", GetComponentEveryTime, "Field _rb đã lưu", CachedComponent, iterations, "Lấy 1 lần trong Awake."));
        if (DemoGui.Step(2, "Đọc position 3 lần  vs  đọc 1 lần vào biến", "Đọc 1 lần nhanh hơn rõ rệt."))
            StartCoroutine(Compare("position đọc 3 lần + ghi 1", PositionReadThreeTimes, "Đọc 1 lần vào biến + ghi 1", PositionReadOnce, iterations, "Mỗi lần đọc property là một lần gọi xuống engine."));
        if (DemoGui.Step(3, "tag == \"Player\"  vs  CompareTag(\"Player\")", "Thời gian gần nhau, nhưng tag == tạo vài MB rác, CompareTag 0 KB."))
            StartCoroutine(Compare("gameObject.tag == \"Player\"", TagEquals, "CompareTag(\"Player\")", TagCompare, iterations, "Đọc .tag tạo string mới mỗi lần."));

        DemoGui.Section($"B. GameObject.Find ({findIterations:N0} lần)");
        if (DemoGui.Step(4, "GameObject.Find  vs  reference đã lưu", "Find chậm hơn rất nhiều. Thêm 5.000 object rồi đo lại: Find chậm thêm."))
            StartCoroutine(Compare("GameObject.Find(\"Target\")", FindByName, "Reference đã lưu", CachedTarget, findIterations, "Find duyệt toàn bộ scene mỗi lần gọi."));
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("+5.000 object vào scene")) AddClutter(5000);
        if (DemoGui.Button("Xoá object thêm")) ClearClutter();
        GUILayout.EndHorizontal();
        GUI.enabled = true;

        DemoGui.Section($"C. Hàm Update rỗng ({updateObjectCount:N0} object)");
        DemoGui.Hint("5 · Chọn lần lượt 3 chế độ, nhìn Frame time ở bảng Kết quả. Kỳ vọng: Update rỗng tốn nhất, Manager rẻ hơn.");
        int selected = DemoGui.Choice((int)_mode, new[] { "Không có Update", "Update rỗng", "1 Manager gọi Tick()" }, 3);
        if (selected != (int)_mode) SetMode((UpdateMode)selected);

        DemoGui.Takeaway("Lưu kết quả <b>GetComponent</b>/<b>Find</b> 1 lần. Đọc property vào biến cục bộ. So tag bằng <b>CompareTag</b>. Xoá Update rỗng.");

        string[] modeNames = { "Không có Update", "Update rỗng", "Manager" };
        DemoGui.Live("Chế độ C đang chạy", modeNames[(int)_mode], V.Info);
        DemoGui.Live("Frame time (trung bình)", $"{_smoothedFrameMs:F2} ms", _mode == UpdateMode.EmptyUpdate ? V.Bad : V.Info);
        DemoGui.Live("Main Thread (Profiler)", $"{AverageMainThreadMs():F2} ms", V.Info, "Số đo trong Editor: chỉ nhìn tỉ lệ, không nhìn số tuyệt đối.");
        DemoGui.End();
        if (mover != null) DemoGui.WorldLabel(mover.position + Vector3.up * 0.8f, "Mover (bị đọc position)");
    }

    #endregion
}
