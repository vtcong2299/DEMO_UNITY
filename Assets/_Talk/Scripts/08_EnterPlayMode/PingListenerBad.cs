using UnityEngine;

public class PingListenerBad : MonoBehaviour
{
    void Start() => PlaySession.Ping += OnPing;

    void OnPing() => DemoGui.Log($"{name} (Bad) nhận Ping, vị trí {transform.position}", DemoGui.Red);
}
