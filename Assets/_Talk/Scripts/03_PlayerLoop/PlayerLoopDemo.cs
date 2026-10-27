using System.Collections;
using System.Threading;
using UnityEngine;
using V = DemoGui.Verdict;

public class PlayerLoopDemo : MonoBehaviour
{
    static readonly WaitForSeconds ScaledSecond = new(1f);
    static readonly WaitForSecondsRealtime RealSecond = new(1f);
    static readonly int[] FrameRates = { 30, 60, 144, -1 };

    [SerializeField] Transform scaledCube;
    [SerializeField] Transform unscaledCube;

    readonly int[] _fixedHistogram = new int[4];
    int _fixedThisFrame;
    int _lastFrameFixed;
    int _sleepNextFrameMs;
    int _reportSleepFrame = -1;
    int _reportSleepMs;

    int _pressFrame = -1;
    int _presses;
    int _hitsInFixed;
    int _hitsViaUpdate;
    bool _jumpRequested;
    int _autoPressLeft;

    int _updateCalls, _fixedCalls, _updatePerSecond, _fixedPerSecond;
    int _scaledTicks, _realtimeTicks;
    float _secondTimer;
    int _frameRateIndex = 3;

    bool KeyDownThisFrame => Time.frameCount == _pressFrame;

    void Start()
    {
        QualitySettings.vSyncCount = 0;
        Application.targetFrameRate = FrameRates[_frameRateIndex];
        StartCoroutine(ScaledTicker());
        StartCoroutine(RealtimeTicker());
    }

    void OnDestroy() => Time.timeScale = 1f;

    #region Loop

    void FixedUpdate()
    {
        _fixedThisFrame++;
        _fixedCalls++;
        if (KeyDownThisFrame) _hitsInFixed++;
        if (_jumpRequested)
        {
            _hitsViaUpdate++;
            _jumpRequested = false;
        }
    }

    void Update()
    {
        _lastFrameFixed = _fixedThisFrame;
        _fixedHistogram[Mathf.Min(_fixedThisFrame, 3)]++;
        _fixedThisFrame = 0;
        _updateCalls++;

        if (Time.frameCount == _reportSleepFrame)
        {
            int capped = Mathf.RoundToInt(Time.maximumDeltaTime / Time.fixedDeltaTime);
            int expected = Mathf.Min(Mathf.RoundToInt(_reportSleepMs / 1000f / Time.fixedDeltaTime), capped);
            DemoGui.Result($"Frame ngay sau khi ngủ {_reportSleepMs} ms", $"{_lastFrameFixed} lần FixedUpdate", V.Info,
                _reportSleepMs >= 1000 ? $"Không phải {_reportSleepMs / 20} lần: Maximum Allowed Timestep chặn ở khoảng {capped} lần." : $"Chạy bù khoảng {expected} lần để vật lý theo kịp thời gian.");
        }

        if (KeyDownThisFrame) _jumpRequested = true;

        if (_autoPressLeft > 0 && Time.frameCount % 7 == 0)
        {
            _autoPressLeft--;
            Press();
        }

        if (_sleepNextFrameMs > 0)
        {
            Thread.Sleep(_sleepNextFrameMs);
            _reportSleepMs = _sleepNextFrameMs;
            _reportSleepFrame = Time.frameCount + 1;
            _sleepNextFrameMs = 0;
        }

        scaledCube.Rotate(0f, 90f * Time.deltaTime, 0f);
        unscaledCube.Rotate(0f, 90f * Time.unscaledDeltaTime, 0f);

        _secondTimer += Time.unscaledDeltaTime;
        if (_secondTimer < 1f) return;
        _secondTimer -= 1f;
        _updatePerSecond = _updateCalls;
        _fixedPerSecond = _fixedCalls;
        _updateCalls = _fixedCalls = 0;
    }

    void Press()
    {
        _presses++;
        _pressFrame = Time.frameCount + 1;
    }

    IEnumerator ScaledTicker()
    {
        while (true)
        {
            yield return ScaledSecond;
            _scaledTicks++;
        }
    }

    IEnumerator RealtimeTicker()
    {
        while (true)
        {
            yield return RealSecond;
            _realtimeTicks++;
        }
    }

    void ResetStats()
    {
        System.Array.Clear(_fixedHistogram, 0, _fixedHistogram.Length);
        _presses = _hitsInFixed = _hitsViaUpdate = 0;
    }

    static string Percent(int hits, int total) => total == 0 ? "-" : $"{hits}/{total} ({100f * hits / total:F0}%)";

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("03 · Một frame chạy những gì?", "FixedUpdate có chạy đúng 1 lần mỗi frame không? timeScale = 0 thì cái gì dừng?");

        DemoGui.Section("A. FixedUpdate mỗi frame");
        DemoGui.Hint("1 · Chọn Target FPS. Kỳ vọng: FPS cao (Không giới hạn) → rất nhiều frame có 0 lần FixedUpdate; 30 FPS → hầu hết frame có 1–2 lần.");
        int rate = DemoGui.Choice(_frameRateIndex, new[] { "30", "60", "144", "Không giới hạn" });
        if (rate != _frameRateIndex)
        {
            _frameRateIndex = rate;
            Application.targetFrameRate = FrameRates[rate];
            ResetStats();
        }
        if (DemoGui.Step(2, "Làm 1 frame chậm 100 ms", "Frame sau chạy bù khoảng 5 lần FixedUpdate.")) _sleepNextFrameMs = 100;
        if (DemoGui.Step(3, "Làm 1 frame chậm 1000 ms", "Chỉ khoảng 17 lần chứ không phải 50: Maximum Allowed Timestep chặn lại.")) _sleepNextFrameMs = 1000;

        DemoGui.Section("B. Đọc GetKeyDown trong FixedUpdate");
        if (DemoGui.Step(4, "Tự bấm nút Nhảy 50 lần", "FPS không giới hạn: đọc trong FixedUpdate mất nhiều lần bấm; đọc ở Update bắt đủ 100%.")) _autoPressLeft = 50;
        if (DemoGui.Button("Xoá số liệu A và B")) ResetStats();

        DemoGui.Section("C. Time.timeScale = 0");
        bool paused = Time.timeScale == 0f;
        bool pause = DemoGui.Toggle(paused, "5 · Pause game (timeScale = 0)");
        if (pause != paused) Time.timeScale = pause ? 0f : 1f;
        DemoGui.Hint("→ Kỳ vọng: Update vẫn chạy, FixedUpdate về 0; khối trái dừng, khối phải vẫn xoay.");

        DemoGui.Takeaway("Đọc input ở <b>Update</b>, xử lý vật lý ở <b>FixedUpdate</b>. Menu pause: dùng <b>unscaledDeltaTime</b>, <b>WaitForSecondsRealtime</b>, Animator <b>Unscaled Time</b>.");

        DemoGui.Live("FPS", $"{1f / Mathf.Max(Time.unscaledDeltaTime, 0.0001f):F0}", V.Info, $"fixedDeltaTime = {Time.fixedDeltaTime:F3} s → {1f / Time.fixedDeltaTime:F0} lần FixedUpdate mỗi giây.");
        DemoGui.Live("Số frame có 0 / 1 / 2 / 3+ lần", $"{_fixedHistogram[0]} / {_fixedHistogram[1]} / {_fixedHistogram[2]} / {_fixedHistogram[3]}", V.Info, "Frame có 0 lần = frame mà code trong FixedUpdate không hề chạy.");
        DemoGui.Live("Bắt nút: đọc trong FixedUpdate", Percent(_hitsInFixed, _presses), V.Bad, "Frame không có FixedUpdate thì lần bấm bị mất.");
        DemoGui.Live("Bắt nút: đọc ở Update, xử lý ở FixedUpdate", Percent(_hitsViaUpdate, _presses), V.Good);
        DemoGui.Live("Update / giây", _updatePerSecond, V.Good, "timeScale = 0 vẫn chạy, chỉ deltaTime = 0.");
        DemoGui.Live("FixedUpdate / giây", _fixedPerSecond, paused ? V.Bad : V.Info, "timeScale = 0 thì dừng hẳn.");
        DemoGui.Live("Tick WaitForSeconds(1)", _scaledTicks, paused ? V.Bad : V.Info, "Đứng yên khi pause.");
        DemoGui.Live("Tick WaitForSecondsRealtime(1)", _realtimeTicks, V.Good, "Vẫn đếm khi pause.");
        DemoGui.End();

        DemoGui.WorldLabel(scaledCube.position + Vector3.up * 0.9f, "xoay theo deltaTime");
        DemoGui.WorldLabel(unscaledCube.position + Vector3.up * 0.9f, "xoay theo unscaledDeltaTime");
    }

    #endregion
}
