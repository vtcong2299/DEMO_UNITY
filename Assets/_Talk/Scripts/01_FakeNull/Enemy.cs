using UnityEngine;

public class Enemy : MonoBehaviour
{
    public void Attack()
    {
        transform.Rotate(0f, 45f, 0f);
        DemoGui.Log($"{name} tấn công!");
    }
}
