using UnityEngine;

public class LifetimeDemo : MonoBehaviour
{
    [SerializeField] Material workerMaterial;

    LifetimeWorker _worker;
    int _lastCoroutine, _lastExternal, _lastTask, _lastAwaitable;
    bool _coroutineRunning, _externalRunning, _taskRunning, _awaitableRunning;
    float _sampleTimer;

    void Start() => SpawnWorker();

    void Update()
    {
        _sampleTimer += Time.unscaledDeltaTime;
        if (_sampleTimer < 1.2f || ReferenceEquals(_worker, null)) return;
        _sampleTimer = 0f;
        _coroutineRunning = _worker.CoroutineTicks != _lastCoroutine;
        _externalRunning = _worker.ExternalTicks != _lastExternal;
        _taskRunning = _worker.TaskTicks != _lastTask;
        _awaitableRunning = _worker.AwaitableTicks != _lastAwaitable;
        _lastCoroutine = _worker.CoroutineTicks;
        _lastExternal = _worker.ExternalTicks;
        _lastTask = _worker.TaskTicks;
        _lastAwaitable = _worker.AwaitableTicks;
    }

    #region Logic

    void SpawnWorker()
    {
        if (_worker != null) Destroy(_worker.gameObject);
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "Worker";
        go.transform.position = new Vector3(3.5f, 0.5f, 0f);
        go.transform.localScale = Vector3.one * 2f;
        if (workerMaterial != null) go.GetComponent<Renderer>().sharedMaterial = workerMaterial;
        _worker = go.AddComponent<LifetimeWorker>();
        _lastCoroutine = _lastExternal = _lastTask = _lastAwaitable = 0;
        DemoGui.ClearLog();
        DemoGui.Log("Tạo Worker mới: chạy Coroutine, Task (async void) và Awaitable", DemoGui.Blue);
    }

    string State(bool running, int ticks) =>
        running ? $"<color={DemoGui.Green}>▲ đang chạy</color> ({ticks})" : $"<color={DemoGui.Red}>■ đứng yên</color> ({ticks})";

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("04 · Coroutine và async sống tới khi nào?", "Tắt script ≠ dừng coroutine. Task không biết gì về vòng đời GameObject.");
        bool alive = _worker != null;
        bool shellAlive = !ReferenceEquals(_worker, null);

        DemoGui.Section("Trạng thái Worker");
        DemoGui.Value("Worker còn sống", DemoGui.YesNo(alive));
        if (alive)
        {
            DemoGui.Value("Script bật (enabled)", DemoGui.YesNo(_worker.enabled));
            DemoGui.Value("GameObject bật (activeSelf)", DemoGui.YesNo(_worker.gameObject.activeSelf));
        }
        if (shellAlive)
        {
            DemoGui.Value("Coroutine của Worker", State(_coroutineRunning, _worker.CoroutineTicks));
            DemoGui.Value("Coroutine do object KHÁC chạy", State(_externalRunning, _worker.ExternalTicks));
            DemoGui.Value("async void + Task.Delay", State(_taskRunning, _worker.TaskTicks));
            DemoGui.Value("Awaitable + destroyCancellationToken", State(_awaitableRunning, _worker.AwaitableTicks));
            if (!alive) DemoGui.Label("<color=#9AA4B1>Worker đã bị Destroy nhưng vẫn đọc được số đếm: các field C# nằm ở vỏ C#, vỏ vẫn còn (xem demo 01).</color>");
        }

        DemoGui.Section("Thao tác");
        GUI.enabled = alive;
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Tắt script (enabled = false)")) { _worker.enabled = false; DemoGui.Log("worker.enabled = false", DemoGui.Yellow); }
        if (DemoGui.Button("Bật script")) { _worker.enabled = true; DemoGui.Log("worker.enabled = true"); }
        GUILayout.EndHorizontal();
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Tắt GameObject")) { _worker.gameObject.SetActive(false); DemoGui.Log("SetActive(false)", DemoGui.Yellow); }
        if (DemoGui.Button("Bật GameObject")) { _worker.gameObject.SetActive(true); DemoGui.Log("SetActive(true): coroutine KHÔNG tự chạy lại", DemoGui.Red); }
        GUILayout.EndHorizontal();
        if (DemoGui.Button("Object khác (Demo) chạy coroutine của Worker"))
        {
            StartCoroutine(_worker.ExternalLoop());
            DemoGui.Log("this.StartCoroutine(worker.ExternalLoop()): coroutine thuộc về Demo, không thuộc Worker", DemoGui.Yellow);
        }
        if (DemoGui.Button("Destroy Worker")) { Destroy(_worker.gameObject); DemoGui.Log("Destroy(worker.gameObject)", DemoGui.Red); }
        GUI.enabled = true;
        if (DemoGui.Button("Tạo Worker mới")) SpawnWorker();

        DemoGui.Space();
        DemoGui.Label("<b>Thử cuối:</b> bấm Stop để thoát Play mode, rồi xem Console: <color=#FF7B72>[Task] vẫn chạy</color>.");
        DemoGui.End();
    }

    #endregion
}
