using UnityEngine;

public class PingListenerGood : MonoBehaviour
{
    void OnEnable() => PlaySession.Ping += OnPing;
    void OnDisable() => PlaySession.Ping -= OnPing;

    void OnPing() => DemoGui.Result($"{name} (đăng ký OnEnable, huỷ OnDisable)", "nhận Ping", DemoGui.Verdict.Good);
}
