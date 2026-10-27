using System;
using System.Collections;
using System.Threading.Tasks;
using UnityEngine;

public class LifetimeWorker : MonoBehaviour
{
    const int MaxTaskTicks = 120;
    static readonly WaitForSeconds HalfSecond = new(0.5f);

    public int CoroutineTicks { get; private set; }
    public int ExternalTicks { get; private set; }
    public int TaskTicks { get; private set; }
    public int AwaitableTicks { get; private set; }
    public bool AwaitableStopped { get; private set; }

    void Start()
    {
        StartCoroutine(CoroutineLoop());
        TaskLoop();
        AwaitableLoop();
    }

    IEnumerator CoroutineLoop()
    {
        while (true)
        {
            CoroutineTicks++;
            transform.Rotate(0f, 20f, 0f);
            yield return HalfSecond;
        }
    }

    public int OwnedTicks { get; private set; }

    public IEnumerator ExternalLoop()
    {
        while (true)
        {
            ExternalTicks++;
            yield return HalfSecond;
        }
    }

    public IEnumerator OwnedLoop()
    {
        while (true)
        {
            OwnedTicks++;
            yield return HalfSecond;
        }
    }

    // capped so a forgotten demo does not log forever after leaving play mode
    async void TaskLoop()
    {
        for (int i = 0; i < MaxTaskTicks; i++)
        {
            await Task.Delay(500);
            TaskTicks++;
            if (!Application.isPlaying) Debug.Log($"[Task] Vẫn chạy sau khi đã thoát Play mode: tick {TaskTicks}");
        }
    }

    async void AwaitableLoop()
    {
        try
        {
            while (true)
            {
                await Awaitable.WaitForSecondsAsync(0.5f, destroyCancellationToken);
                AwaitableTicks++;
            }
        }
        catch (OperationCanceledException)
        {
            AwaitableStopped = true;
            Debug.Log("[Awaitable] Đã dừng vì object bị Destroy (destroyCancellationToken)");
        }
    }
}
