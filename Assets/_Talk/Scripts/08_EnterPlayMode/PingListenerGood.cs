using UnityEngine;

public class PingListenerGood : MonoBehaviour
{
    void OnEnable() => PlaySession.Ping += OnPing;
    void OnDisable() => PlaySession.Ping -= OnPing;

    void OnPing() => DemoGui.Log($"{name} (Good) nhận Ping", DemoGui.Green);
}
