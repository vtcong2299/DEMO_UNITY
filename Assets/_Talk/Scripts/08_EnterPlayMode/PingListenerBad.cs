using UnityEngine;

public class PingListenerBad : MonoBehaviour
{
    void Start() => PlaySession.Ping += OnPing;

    void OnPing() => DemoGui.Result($"{name} (đăng ký Start, không huỷ)", $"nhận Ping, vị trí {transform.position}", DemoGui.Verdict.Info);
}
