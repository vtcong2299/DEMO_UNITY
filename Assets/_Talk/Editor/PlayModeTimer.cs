using UnityEditor;
using UnityEngine;

[InitializeOnLoad]
static class PlayModeTimer
{
    static PlayModeTimer()
    {
        EditorApplication.playModeStateChanged -= OnStateChanged;
        EditorApplication.playModeStateChanged += OnStateChanged;
    }

    static void OnStateChanged(PlayModeStateChange state)
    {
        if (state == PlayModeStateChange.ExitingEditMode)
        {
            SessionState.SetFloat(PlayModeTimerKeys.StartedAt, (float)EditorApplication.timeSinceStartup);
            return;
        }
        if (state != PlayModeStateChange.EnteredPlayMode) return;
        float started = SessionState.GetFloat(PlayModeTimerKeys.StartedAt, 0f);
        if (started <= 0f) return;
        float ms = ((float)EditorApplication.timeSinceStartup - started) * 1000f;
        SessionState.SetFloat(PlayModeTimerKeys.LastEnterMs, ms);
        Debug.Log($"[PlayModeTimer] Vào Play mode mất {ms:F0} ms");
    }
}
