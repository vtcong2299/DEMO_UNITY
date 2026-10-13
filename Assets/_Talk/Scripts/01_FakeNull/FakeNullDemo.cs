using System;
using System.Collections;
using UnityEngine;

public class FakeNullDemo : MonoBehaviour
{
    [SerializeField] Material enemyMaterial;
    [SerializeField] Material backupMaterial;
    [SerializeField] Transform enemyParent;

    Enemy _enemy;
    Enemy _backup;
    bool _busy;

    void Start()
    {
        _backup = Spawn("Backup", new Vector3(5f, 0f, 0f), backupMaterial);
        _enemy = Spawn("Enemy", new Vector3(2.5f, 0f, 0f), enemyMaterial);
    }

    #region Logic

    Enemy Spawn(string objectName, Vector3 position, Material material)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = objectName;
        go.transform.SetParent(enemyParent, false);
        go.transform.localPosition = position;
        if (material != null) go.GetComponent<Renderer>().sharedMaterial = material;
        return go.AddComponent<Enemy>();
    }

    IEnumerator DestroyAndInspect()
    {
        _busy = true;
        Enemy enemy = _enemy;
        DemoGui.ClearLog();
        DemoGui.Log("Destroy(enemy.gameObject)", DemoGui.Yellow);
        Destroy(enemy.gameObject);
        DemoGui.Log($"[Cùng frame] enemy == null → {enemy == null}   (Destroy chưa có hiệu lực)");
        DemoGui.Log($"[Cùng frame] số con của Enemies = {enemyParent.childCount}");

        yield return null;

        DemoGui.Log($"[Frame sau] số con của Enemies = {enemyParent.childCount}");
        DemoGui.Log($"[Frame sau] enemy == null → {enemy == null}", DemoGui.Green);
        DemoGui.Log($"[Frame sau] if (enemy) → {(bool)enemy}", DemoGui.Green);
        DemoGui.Log($"[Frame sau] enemy is null → {enemy is null}", DemoGui.Red);
        DemoGui.Log($"[Frame sau] ReferenceEquals(enemy, null) → {ReferenceEquals(enemy, null)}", DemoGui.Red);

        try
        {
            enemy?.Attack();
        }
        catch (Exception e)
        {
            DemoGui.Log($"enemy?.Attack() VẪN ĐƯỢC GỌI → {e.GetType().Name}", DemoGui.Red);
        }

        Enemy picked = enemy ?? _backup;
        DemoGui.Log($"enemy ?? backup → {(ReferenceEquals(picked, enemy) ? "trả về enemy ĐÃ CHẾT" : "backup")}", DemoGui.Red);
        Enemy safe = enemy != null ? enemy : _backup;
        DemoGui.Log($"enemy != null ? enemy : backup → {safe.name}", DemoGui.Green);
        _busy = false;
    }

    void InspectGetComponent()
    {
        DemoGui.ClearLog();
        DemoGui.Log("Object này KHÔNG có Rigidbody", DemoGui.Yellow);
        var rb = GetComponent<Rigidbody>();
        DemoGui.Log($"GetComponent<Rigidbody>() == null → {rb == null}");
        DemoGui.Log($"GetComponent<Rigidbody>() is null → {rb is null}   (Editor: False vì là object giả null; bản build: True)", DemoGui.Red);
        bool found = TryGetComponent(out Rigidbody rb2);
        DemoGui.Log($"TryGetComponent → {found}, kết quả is null → {rb2 is null}   (không tạo object giả)", DemoGui.Green);
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("01 · Fake null: vỏ C# và object C++", "Destroy chỉ xoá phía C++. ?. ?? is null chỉ nhìn vỏ C#.");
        DemoGui.Section("Enemy đang ở scene");
        DemoGui.Value("enemy còn sống (==)", DemoGui.YesNo(_enemy != null));
        DemoGui.Value("vỏ C# còn (ReferenceEquals)", DemoGui.YesNo(!ReferenceEquals(_enemy, null)));
        DemoGui.Space();

        GUI.enabled = !_busy && _enemy != null;
        if (DemoGui.Button("1. Destroy Enemy rồi kiểm tra bằng 5 cách")) StartCoroutine(DestroyAndInspect());
        GUI.enabled = !_busy;
        if (DemoGui.Button("2. GetComponent trên object không có component")) InspectGetComponent();
        if (DemoGui.Button("Tạo lại Enemy"))
        {
            if (_enemy != null) Destroy(_enemy.gameObject);
            _enemy = Spawn("Enemy", new Vector3(2.5f, 0f, 0f), enemyMaterial);
            DemoGui.Log("Đã tạo Enemy mới", DemoGui.Blue);
        }
        GUI.enabled = true;

        DemoGui.Space();
        DemoGui.Section("Ghi nhớ");
        DemoGui.Label("• Dùng <b>if (obj != null)</b> hoặc <b>if (obj)</b> với mọi UnityEngine.Object.");
        DemoGui.Label("• Không dùng <b>?.  ??  ??=  is null</b> với GameObject, Component, ScriptableObject, Material…");
        DemoGui.Label("• Muốn kiểm tra có component hay không: <b>TryGetComponent</b>.");
        DemoGui.End();
    }

    #endregion
}
