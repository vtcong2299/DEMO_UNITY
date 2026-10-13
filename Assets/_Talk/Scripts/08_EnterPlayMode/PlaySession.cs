using System;
using UnityEngine;

public static class PlaySession
{
    public static int PlaysWithoutReset;
    public static int PlaysWithReset;
    public static event Action Ping;

    public static int PingHandlerCount => Ping?.GetInvocationList().Length ?? 0;

    public static void RaisePing()
    {
        if (Ping == null) return;
        foreach (Action handler in Ping.GetInvocationList())
        {
            try
            {
                handler();
            }
            catch (Exception e)
            {
                DemoGui.Log($"Handler từ lần Play trước bị lỗi: {e.GetType().Name}", DemoGui.Red);
            }
        }
    }

    // runs on every play-mode entry, even with domain reload disabled; Ping is left out on purpose for the demo
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    static void ResetStatics() => PlaysWithReset = 0;
}
