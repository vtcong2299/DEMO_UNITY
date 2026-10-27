using UnityEngine;
using V = DemoGui.Verdict;
#if UNITY_EDITOR
using UnityEditor;
#endif

public class EnterPlayModeDemo : MonoBehaviour
{
    void Start()
    {
        PlaySession.PlaysWithoutReset++;
        PlaySession.PlaysWithReset++;
    }

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("08 · Vào Play nhanh hơn, nhưng static không tự reset", "Tắt Domain Reload thì được gì, mất gì?");

        DemoGui.Section("Các bước");
        DemoGui.Hint("1 · Domain Reload đang bật: Stop rồi Play 2 lần. Kỳ vọng: mọi bộ đếm đều là 1. Ghi lại thời gian vào Play.");
#if UNITY_EDITOR
        bool reloadDisabled = EditorSettings.enterPlayModeOptionsEnabled &&
                              (EditorSettings.enterPlayModeOptions & EnterPlayModeOptions.DisableDomainReload) != 0;
        if (DemoGui.Step(2, "Tắt Domain Reload, rồi Stop và Play lại 2–3 lần", "Thời gian vào Play giảm; “static KHÔNG reset” tăng 2, 3…; số handler Ping tăng dần."))
        {
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;
            DemoGui.Log("Đã tắt Domain Reload. Stop rồi Play lại.", DemoGui.Yellow);
        }
#endif
        if (DemoGui.Step(3, "Phát sự kiện Ping", "Handler từ các lần Play trước báo lỗi MissingReferenceException; Listener B vẫn đúng."))
        {
            DemoGui.ClearResults();
            PlaySession.RaisePing();
        }
#if UNITY_EDITOR
        if (DemoGui.Step(4, "Bật lại Domain Reload (bắt buộc sau khi demo)", "Lần Play sau mọi bộ đếm về 1."))
        {
            EditorSettings.enterPlayModeOptionsEnabled = false;
            DemoGui.Log("Đã bật lại Domain Reload", DemoGui.Green);
        }
        DemoGui.Hint("Cài đặt nằm ở Project Settings → Editor → Enter Play Mode Settings.");
#endif
        DemoGui.Takeaway("Tắt Domain Reload giúp vào Play nhanh, nhưng phải tự reset mọi <b>static</b> bằng <b>[RuntimeInitializeOnLoadMethod(SubsystemRegistration)]</b>, và huỷ đăng ký event ở <b>OnDisable</b>.");

#if UNITY_EDITOR
        DemoGui.Live("Domain Reload", reloadDisabled ? "ĐANG TẮT" : "đang bật (mặc định)", reloadDisabled ? V.Bad : V.Good);
        DemoGui.Live("Lần vào Play gần nhất mất", $"{SessionState.GetFloat(PlayModeTimerKeys.LastEnterMs, 0f):F0} ms", V.Info, "Đo từ lúc bấm Play tới lúc vào Play mode.");
#endif
        DemoGui.Live("Lần Play thứ (static KHÔNG reset)", PlaySession.PlaysWithoutReset, PlaySession.PlaysWithoutReset > 1 ? V.Bad : V.Good, "Giá trị từ lần Play trước còn sót lại.");
        DemoGui.Live("Lần Play thứ (có RuntimeInitializeOnLoadMethod)", PlaySession.PlaysWithReset, V.Good, "Luôn là 1: được reset đầu mỗi lần Play.");
        DemoGui.Live("Số handler đang đăng ký Ping", PlaySession.PingHandlerCount, PlaySession.PingHandlerCount > 2 ? V.Bad : V.Good, "Listener A đăng ký trong Start, không huỷ → dồn lại. Listener B đăng ký OnEnable, huỷ OnDisable.");
        DemoGui.End();
    }

    #endregion
}
