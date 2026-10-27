using System;
using System.Collections;
using UnityEngine;
using V = DemoGui.Verdict;

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
        _backup = Spawn("Backup", new Vector3(1.2f, 0f, 0f), backupMaterial);
        _enemy = Spawn("Enemy", new Vector3(-1.2f, 0f, 0f), enemyMaterial);
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
        DemoGui.ClearResults();
        Destroy(enemy.gameObject);
        DemoGui.Result("[cùng frame] enemy == null", DemoGui.YesNo(enemy == null), V.Info, "Destroy chưa có hiệu lực: object chỉ bị xoá ở cuối frame.");
        DemoGui.Result("[cùng frame] số con của Enemies", enemyParent.childCount, V.Info, "Vẫn đếm cả Enemy vừa Destroy.");

        yield return null;

        DemoGui.Result("[frame sau] số con của Enemies", enemyParent.childCount, V.Info, "Giờ Enemy mới thật sự biến mất.");
        DemoGui.Result("enemy == null", DemoGui.YesNo(enemy == null), V.Good, "== do Unity viết lại: kiểm tra cả object bên C++.");
        DemoGui.Result("if (enemy)", DemoGui.YesNo(enemy), V.Good, "Ép sang bool cũng do Unity viết lại: an toàn.");
        DemoGui.Result("enemy is null", DemoGui.YesNo(enemy is null), V.Bad, "Cú pháp C#: chỉ thấy vỏ C# vẫn còn, nên ra False.");

        string attack;
        try
        {
            enemy?.Attack();
            attack = "chạy bình thường";
        }
        catch (Exception e)
        {
            attack = $"VẪN GỌI → {e.GetType().Name}";
        }
        DemoGui.Result("enemy?.Attack()", attack, V.Bad, "?. không biết object đã chết, vẫn gọi hàm và ném lỗi.");

        Enemy picked = enemy ?? _backup;
        DemoGui.Result("enemy ?? backup", ReferenceEquals(picked, enemy) ? "enemy ĐÃ CHẾT" : "backup", V.Bad, "?? cũng chỉ nhìn vỏ C#: không lấy backup.");
        Enemy safe = enemy != null ? enemy : _backup;
        DemoGui.Result("enemy != null ? enemy : backup", safe.name, V.Good, "Cách viết đúng: lấy được Backup.");
        _busy = false;
    }

    void InspectGetComponent()
    {
        DemoGui.ClearResults();
        var rb = GetComponent<Rigidbody>();
        DemoGui.Result("GetComponent<Rigidbody>() == null", DemoGui.YesNo(rb == null), V.Good, "Object này không có Rigidbody, == trả về đúng.");
        DemoGui.Result("GetComponent<Rigidbody>() is null", DemoGui.YesNo(rb is null), V.Bad, "Trong Editor ra False: Unity trả về object giả null (tạo rác). Bản build ra True.");
        bool found = TryGetComponent(out Rigidbody rb2);
        DemoGui.Result("TryGetComponent(out rb)", DemoGui.YesNo(found), V.Good, $"Trả về false, rb is null = {DemoGui.YesNo(rb2 is null)}. Không tạo object giả.");
    }

    void Respawn()
    {
        if (_enemy != null) Destroy(_enemy.gameObject);
        _enemy = Spawn("Enemy", new Vector3(-1.2f, 0f, 0f), enemyMaterial);
        DemoGui.ClearResults();
        DemoGui.Log("Đã tạo Enemy mới", DemoGui.Blue);
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("01 · Fake null: object đã Destroy có thật sự null?", "Sau Destroy(enemy), 5 cách kiểm tra null cho ra cùng kết quả không?");
        DemoGui.Section("Các bước");
        GUI.enabled = !_busy && _enemy != null;
        if (DemoGui.Step(1, "Destroy Enemy rồi kiểm tra bằng 5 cách", "== và if(enemy) báo đã chết; is null, ?. và ?? vẫn coi là còn sống.")) StartCoroutine(DestroyAndInspect());
        GUI.enabled = !_busy;
        if (DemoGui.Step(2, "GetComponent trên object không có Rigidbody", "Trong Editor: == null là True nhưng is null là False.")) InspectGetComponent();
        if (DemoGui.Step(3, "Tạo lại Enemy", "Khối đỏ xuất hiện lại, có thể làm lại bước 1.")) Respawn();
        GUI.enabled = true;
        DemoGui.Takeaway("Với GameObject, Component, ScriptableObject, Material: chỉ dùng <b>if (obj)</b> hoặc <b>obj != null</b>. Không dùng <b>?.  ??  is null</b>. Kiểm tra có component: <b>TryGetComponent</b>.");
        DemoGui.End();

        if (_enemy != null) DemoGui.WorldLabel(_enemy.transform.position + Vector3.up * 0.9f, "Enemy (sẽ bị Destroy)");
        if (_backup != null) DemoGui.WorldLabel(_backup.transform.position + Vector3.up * 0.9f, "Backup");
    }

    #endregion
}
