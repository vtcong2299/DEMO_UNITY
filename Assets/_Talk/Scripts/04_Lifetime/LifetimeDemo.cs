using UnityEngine;
using V = DemoGui.Verdict;

public class LifetimeDemo : MonoBehaviour
{
    [SerializeField] Material workerMaterial;

    LifetimeWorker _worker;
    int _lastCoroutine, _lastExternal, _lastOwned, _lastTask, _lastAwaitable;
    bool _coroutineRunning, _externalRunning, _ownedRunning, _taskRunning, _awaitableRunning;
    float _sampleTimer;

    void Start() => SpawnWorker();

    void Update()
    {
        _sampleTimer += Time.unscaledDeltaTime;
        if (_sampleTimer < 1.2f || ReferenceEquals(_worker, null)) return;
        _sampleTimer = 0f;
        _coroutineRunning = _worker.CoroutineTicks != _lastCoroutine;
        _externalRunning = _worker.ExternalTicks != _lastExternal;
        _ownedRunning = _worker.OwnedTicks != _lastOwned;
        _taskRunning = _worker.TaskTicks != _lastTask;
        _awaitableRunning = _worker.AwaitableTicks != _lastAwaitable;
        _lastCoroutine = _worker.CoroutineTicks;
        _lastExternal = _worker.ExternalTicks;
        _lastOwned = _worker.OwnedTicks;
        _lastTask = _worker.TaskTicks;
        _lastAwaitable = _worker.AwaitableTicks;
    }

    #region Logic

    void SpawnWorker()
    {
        if (_worker != null) Destroy(_worker.gameObject);
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "Worker";
        go.transform.position = new Vector3(0f, 1.2f, 0f);
        go.transform.localScale = Vector3.one * 1.6f;
        if (workerMaterial != null) go.GetComponent<Renderer>().sharedMaterial = workerMaterial;
        _worker = go.AddComponent<LifetimeWorker>();
        _lastCoroutine = _lastExternal = _lastOwned = _lastTask = _lastAwaitable = 0;
        _coroutineRunning = _externalRunning = _ownedRunning = _taskRunning = _awaitableRunning = false;
        DemoGui.ClearResults();
        DemoGui.Log("Tạo Worker mới: Coroutine, Task (async void) và Awaitable bắt đầu đếm", DemoGui.Blue);
    }

    static string State(bool running, int ticks) => running ? $"▲ đang chạy ({ticks})" : $"■ đứng yên ({ticks})";

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("04 · Coroutine và async sống tới khi nào?", "Tắt script, tắt GameObject, Destroy, thoát Play: cái nào dừng, cái nào vẫn chạy?");
        bool alive = _worker != null;

        DemoGui.Section("Các bước (làm theo thứ tự)");
        GUI.enabled = alive;
        if (DemoGui.Step(1, "Tắt script (enabled = false)", "Coroutine của Worker VẪN chạy. Khối vàng vẫn xoay.")) { _worker.enabled = false; DemoGui.Log("worker.enabled = false", DemoGui.Yellow); }
        if (DemoGui.Step(2, "Bật script lại", "Không có gì thay đổi: mọi thứ vẫn chạy.")) { _worker.enabled = true; DemoGui.Log("worker.enabled = true"); }
        if (DemoGui.Step(3, "Demo gọi: StartCoroutine(worker.ExternalLoop())", "Coroutine này thuộc về Demo (object gọi), dù hàm nằm trong Worker.")) StartCoroutine(_worker.ExternalLoop());
        if (DemoGui.Button("<b>3b</b> · Demo gọi: worker.StartCoroutine(worker.OwnedLoop())")) _worker.StartCoroutine(_worker.OwnedLoop());
        DemoGui.Hint("→ Kỳ vọng: coroutine này thuộc về Worker vì gọi qua worker.StartCoroutine.");
        if (DemoGui.Step(4, "Tắt GameObject Worker", "Coroutine của Worker và coroutine 3b DỪNG. Coroutine 3 (thuộc Demo) vẫn chạy.")) { _worker.gameObject.SetActive(false); DemoGui.Log("SetActive(false)", DemoGui.Yellow); }
        if (DemoGui.Step(5, "Bật GameObject Worker lại", "Coroutine của Worker KHÔNG tự chạy lại.")) { _worker.gameObject.SetActive(true); DemoGui.Log("SetActive(true)", DemoGui.Yellow); }
        if (DemoGui.Step(6, "Destroy Worker", "Task (async void) VẪN đếm. Awaitable dừng nhờ destroyCancellationToken.")) { Destroy(_worker.gameObject); DemoGui.Log("Destroy(worker.gameObject)", DemoGui.Red); }
        GUI.enabled = true;
        if (DemoGui.Step(7, "Tạo Worker mới (làm lại từ đầu)", "Mọi bộ đếm về 0 và bắt đầu chạy.")) SpawnWorker();
        DemoGui.Hint("8 · Bấm Stop thoát Play mode, mở Console. Kỳ vọng: dòng “[Task] Vẫn chạy sau khi đã thoát Play mode” tiếp tục xuất hiện.");

        DemoGui.Takeaway("Coroutine chỉ dừng khi tắt GameObject/Destroy. Async trong Unity: luôn truyền <b>destroyCancellationToken</b> (Unity 6: <b>Awaitable</b>; 2022.3: Task có token hoặc UniTask).");

        if (!ReferenceEquals(_worker, null))
        {
            DemoGui.Live("Worker còn sống", DemoGui.YesNo(alive), alive ? V.Good : V.Bad, alive ? null : "Vẫn đọc được số đếm bên dưới vì vỏ C# còn (demo 01).");
            if (alive)
            {
                DemoGui.Live("Script bật (enabled)", DemoGui.YesNo(_worker.enabled));
                DemoGui.Live("GameObject bật (activeSelf)", DemoGui.YesNo(_worker.gameObject.activeSelf));
            }
            DemoGui.Live("Coroutine của Worker", State(_coroutineRunning, _worker.CoroutineTicks), _coroutineRunning ? V.Good : V.Bad, "Dừng khi tắt GameObject hoặc Destroy. Không dừng khi tắt script.");
            DemoGui.Live("3 · StartCoroutine(worker.ExternalLoop())", State(_externalRunning, _worker.ExternalTicks), _externalRunning ? V.Good : V.Info, "Demo sở hữu: Worker tắt hay bị Destroy cũng không dừng.");
            DemoGui.Live("3b · worker.StartCoroutine(worker.OwnedLoop())", State(_ownedRunning, _worker.OwnedTicks), _ownedRunning ? V.Good : V.Info, "Worker sở hữu: dừng theo Worker.");
            DemoGui.Live("async void + Task.Delay", State(_taskRunning, _worker.TaskTicks), alive ? V.Info : (_taskRunning ? V.Bad : V.Info), "Task không biết vòng đời object.");
            DemoGui.Live("Awaitable + destroyCancellationToken", State(_awaitableRunning, _worker.AwaitableTicks), alive ? V.Info : V.Good, "Tự dừng khi object bị Destroy.");
        }
        DemoGui.End();
        if (alive) DemoGui.WorldLabel(_worker.transform.position + Vector3.up * 1.4f, "Worker");
    }

    #endregion
}
