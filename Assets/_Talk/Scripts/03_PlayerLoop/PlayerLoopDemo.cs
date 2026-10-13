using System.Collections;
using System.Threading;
using UnityEngine;

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
            DemoGui.Log($"Frame ngay sau khi ngủ {_reportSleepMs} ms: FixedUpdate chạy {_lastFrameFixed} lần", DemoGui.Yellow);

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
        DemoGui.Begin("03 · Player Loop: một frame chạy những gì", "FixedUpdate không gắn với frame. timeScale = 0 không dừng Update.");

        DemoGui.Section("A. FixedUpdate mỗi frame");
        DemoGui.Value("FPS", $"{1f / Mathf.Max(Time.unscaledDeltaTime, 0.0001f):F0}", DemoGui.Yellow);
        DemoGui.Value("fixedDeltaTime", $"{Time.fixedDeltaTime:F3} s  (= {1f / Time.fixedDeltaTime:F0} lần/giây)");
        DemoGui.Value("Frame trước có số lần FixedUpdate", _lastFrameFixed, DemoGui.Yellow);
        DemoGui.Label($"Số frame có 0 lần: <b>{_fixedHistogram[0]}</b> · 1 lần: <b>{_fixedHistogram[1]}</b> · 2 lần: <b>{_fixedHistogram[2]}</b> · 3+ lần: <b>{_fixedHistogram[3]}</b>");
        DemoGui.Label("Target FPS:");
        int rate = DemoGui.Choice(_frameRateIndex, new[] { "30", "60", "144", "Không giới hạn" });
        if (rate != _frameRateIndex)
        {
            _frameRateIndex = rate;
            Application.targetFrameRate = FrameRates[rate];
            ResetStats();
        }
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Frame chậm 100 ms")) _sleepNextFrameMs = 100;
        if (DemoGui.Button("Frame chậm 1000 ms")) _sleepNextFrameMs = 1000;
        GUILayout.EndHorizontal();
        DemoGui.Label($"<color=#9AA4B1>Maximum Allowed Timestep = {Time.maximumDeltaTime:F3} s → tối đa khoảng {Time.maximumDeltaTime / Time.fixedDeltaTime:F0} lần FixedUpdate mỗi frame.</color>");

        DemoGui.Section("B. Đọc GetKeyDown trong FixedUpdate");
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Bấm Nhảy 1 lần")) Press();
        if (DemoGui.Button("Tự bấm 50 lần")) _autoPressLeft = 50;
        if (DemoGui.Button("Xoá số liệu")) ResetStats();
        GUILayout.EndHorizontal();
        DemoGui.Value("Đọc trong FixedUpdate (sai)", Percent(_hitsInFixed, _presses), DemoGui.Red);
        DemoGui.Value("Đọc ở Update, xử lý ở FixedUpdate (đúng)", Percent(_hitsViaUpdate, _presses), DemoGui.Green);

        DemoGui.Section("C. Time.timeScale");
        bool paused = Time.timeScale == 0f;
        if (DemoGui.Toggle(paused, "Pause game (timeScale = 0)")) Time.timeScale = 0f;
        else Time.timeScale = 1f;
        DemoGui.Value("Update / giây", _updatePerSecond, DemoGui.Green);
        DemoGui.Value("FixedUpdate / giây", _fixedPerSecond, paused ? DemoGui.Red : DemoGui.Green);
        DemoGui.Value("Time.deltaTime", $"{Time.deltaTime:F4}", paused ? DemoGui.Red : null);
        DemoGui.Value("Time.unscaledDeltaTime", $"{Time.unscaledDeltaTime:F4}", DemoGui.Green);
        DemoGui.Value("Tick WaitForSeconds(1)", _scaledTicks, paused ? DemoGui.Red : null);
        DemoGui.Value("Tick WaitForSecondsRealtime(1)", _realtimeTicks, DemoGui.Green);
        DemoGui.Label("<color=#9AA4B1>Khối trái xoay theo deltaTime, khối phải theo unscaledDeltaTime.</color>");
        DemoGui.End();
    }

    #endregion
}
