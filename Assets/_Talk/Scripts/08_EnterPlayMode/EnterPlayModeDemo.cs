using UnityEngine;
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
        DemoGui.Begin("08 · Enter Play Mode Options", "Tắt Domain Reload: vào Play nhanh hơn, nhưng biến static không tự reset.");

#if UNITY_EDITOR
        DemoGui.Section("A. Cấu hình hiện tại");
        bool reloadDisabled = EditorSettings.enterPlayModeOptionsEnabled &&
                              (EditorSettings.enterPlayModeOptions & EnterPlayModeOptions.DisableDomainReload) != 0;
        DemoGui.Value("Domain Reload", reloadDisabled ? $"<color={DemoGui.Red}>ĐANG TẮT</color>" : $"<color={DemoGui.Green}>đang bật (mặc định)</color>");
        DemoGui.Value("Lần vào Play gần nhất mất", $"{SessionState.GetFloat(PlayModeTimerKeys.LastEnterMs, 0f):F0} ms", DemoGui.Yellow);
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Tắt Domain Reload"))
        {
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload;
            DemoGui.Log("Đã tắt Domain Reload. Stop rồi Play lại để thấy khác biệt.", DemoGui.Yellow);
        }
        if (DemoGui.Button("Bật lại (mặc định)"))
        {
            EditorSettings.enterPlayModeOptionsEnabled = false;
            DemoGui.Log("Đã bật lại Domain Reload", DemoGui.Green);
        }
        GUILayout.EndHorizontal();
        DemoGui.Label("<color=#9AA4B1>Cài đặt nằm ở Project Settings → Editor → Enter Play Mode Settings.</color>");
#endif

        DemoGui.Section("B. Biến static qua nhiều lần Play");
        DemoGui.Value("Lần Play thứ (static KHÔNG reset)", PlaySession.PlaysWithoutReset, PlaySession.PlaysWithoutReset > 1 ? DemoGui.Red : DemoGui.Green);
        DemoGui.Value("Lần Play thứ (có [RuntimeInitializeOnLoadMethod])", PlaySession.PlaysWithReset, DemoGui.Green);

        DemoGui.Section("C. Event static quên huỷ đăng ký");
        DemoGui.Value("Số handler đang đăng ký Ping", PlaySession.PingHandlerCount, PlaySession.PingHandlerCount > 2 ? DemoGui.Red : DemoGui.Green);
        DemoGui.Label("Scene có 1 listener Bad (đăng ký trong Start, không huỷ) và 1 listener Good (OnEnable/OnDisable).");
        if (DemoGui.Button("Phát sự kiện Ping")) PlaySession.RaisePing();

        DemoGui.Section("Cách thử");
        DemoGui.Label("1. Bấm Play 2–3 lần với Domain Reload bật: mọi số đều về 1.");
        DemoGui.Label("2. Tắt Domain Reload, Stop, Play lại 2–3 lần: số không reset tăng dần, handler cũ dồn lại.");
        DemoGui.Label("3. So sánh thời gian vào Play ở mục A.");
        DemoGui.Label("<color=#F2CC60>Xong demo nhớ bấm “Bật lại (mặc định)”.</color>");
        DemoGui.End();
    }

    #endregion
}
