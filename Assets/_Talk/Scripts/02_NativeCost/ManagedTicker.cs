using UnityEngine;

public class ManagedTicker : MonoBehaviour
{
    public float Elapsed { get; private set; }

    public void Tick(float deltaTime) => Elapsed += deltaTime;
}
