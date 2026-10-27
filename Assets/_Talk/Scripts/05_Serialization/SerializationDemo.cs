using UnityEngine;
using V = DemoGui.Verdict;
#if UNITY_EDITOR
using UnityEditor;
using UnityEditorInternal;
#endif

public class SerializationDemo : MonoBehaviour
{
    const string PlayerPrefabPath = "Assets/_Talk/Prefabs/Player.prefab";

    [SerializeField] PlayerStats player;
    [SerializeField] PlayerConfig config;
    [SerializeField] SkillBook skillBook;

    PlayerConfig _runtimeConfig;
    float _codeDefaultSpeed;

    void Start()
    {
        var probe = new GameObject("Probe");
        _codeDefaultSpeed = probe.AddComponent<PlayerStats>().speed;
        Destroy(probe);

        string missing = MissingReferences();
        if (missing != null)
        {
            Debug.LogError($"[SerializationDemo] Thiếu reference: {missing}. Chạy menu Talk → Dựng lại toàn bộ scene demo.", this);
            return;
        }
        _runtimeConfig = Instantiate(config);
    }

    void OnDestroy()
    {
        if (_runtimeConfig != null) Destroy(_runtimeConfig);
    }

    #region Logic

    string MissingReferences()
    {
        var names = new System.Collections.Generic.List<string>();
        if (player == null) names.Add(nameof(player));
        if (config == null) names.Add(nameof(config));
        if (skillBook == null) names.Add(nameof(skillBook));
        return names.Count == 0 ? null : string.Join(", ", names);
    }

    static string Describe(Skill skill) => skill switch
    {
        null => "null",
        FireSkill fire => $"FireSkill (damage = {fire.damage})",
        _ => "Skill (mất kiểu con, mất damage)",
    };

    void ShowValues()
    {
        DemoGui.ClearResults();
        DemoGui.Result("speed viết trong code", _codeDefaultSpeed, V.Info, "Giá trị khởi tạo trong PlayerStats.cs.");
        DemoGui.Result("speed trong prefab Player", player.speed, V.Good, "Giá trị đã lưu trong file .prefab: đây là giá trị game dùng.");
        DemoGui.Result("[HideInInspector] hiddenButSaved", player.hiddenButSaved, V.Bad, "Gán 42 lúc dựng → vẫn 42: chỉ ẩn khỏi Inspector, VẪN được lưu.");
        DemoGui.Result("[NonSerialized] notSaved", player.notSaved, V.Good, "Gán 42 lúc dựng → về 0: không được lưu.");
    }

    void ShowSkills()
    {
        DemoGui.ClearResults();
        var plain = skillBook.plainSkills.Count > 0 ? skillBook.plainSkills[0] : null;
        var reference = skillBook.referenceSkills.Count > 0 ? skillBook.referenceSkills[0] : null;
        DemoGui.Result("List<Skill> thường [0]", Describe(plain), V.Bad, "Lúc dựng đã gán FireSkill(damage 10). Serializer chỉ lưu field của kiểu khai báo.");
        DemoGui.Result("[SerializeReference] List<Skill> [0]", Describe(reference), V.Good, "Lưu cả kiểu thật nên giữ được FireSkill.");
        DemoGui.Result("Skill thường, gán null khi dựng", skillBook.plainEmptySlot == null ? "null" : "object rỗng", V.Bad, "Field class thường không lưu được null: load lại thành object rỗng.");
        DemoGui.Result("[SerializeReference] Skill, gán null", skillBook.referenceEmptySlot == null ? "null" : "object", V.Good, "Giữ đúng null.");
    }

    void AddToAsset()
    {
        config.startCoins += 100;
        DemoGui.Result("+100 vào asset", $"config.startCoins = {config.startCoins}", V.Bad, "Sửa thẳng file asset. Bấm Stop rồi chọn PlayerConfig.asset: giá trị KHÔNG quay về 100.");
    }

    void AddToCopy()
    {
        _runtimeConfig.startCoins += 100;
        DemoGui.Result("+100 vào bản sao", $"bản sao = {_runtimeConfig.startCoins}, asset = {config.startCoins}", V.Good, "Asset không đổi.");
    }

    void ResetAsset()
    {
        config.startCoins = 100;
#if UNITY_EDITOR
        EditorUtility.SetDirty(config);
        AssetDatabase.SaveAssetIfDirty(config);
#endif
        DemoGui.Result("Đặt lại asset", config.startCoins, V.Info);
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("05 · Unity lưu dữ liệu thế nào?", "Vì sao sửa code mà prefab không đổi? Vì sao config tự đổi? Vì sao mất kiểu con?");
        if (MissingReferences() != null || _runtimeConfig == null)
        {
            DemoGui.Label($"<color={DemoGui.Red}><b>Scene thiếu reference: {MissingReferences() ?? "config"}.</b></color>");
            DemoGui.Label("Thoát Play, chạy menu <b>Talk → Dựng lại toàn bộ scene demo</b>.");
            DemoGui.End();
            return;
        }

        DemoGui.Section("A. Inspector thắng code");
        if (DemoGui.Step(1, "Xem giá trị trong code và trong prefab", "speed trong prefab là giá trị thật; [HideInInspector] vẫn 42, [NonSerialized] về 0.")) ShowValues();

        DemoGui.Section("B. ScriptableObject là asset");
        if (DemoGui.Step(2, "+100 vào asset (cách sai)", "Bấm vài lần → Stop → chọn PlayerConfig.asset: giá trị không quay về 100.")) AddToAsset();
        if (DemoGui.Step(3, "+100 vào bản sao Instantiate (cách đúng)", "Bản sao tăng, asset giữ nguyên.")) AddToCopy();
        if (DemoGui.Button("Đặt lại asset = 100 (làm sau khi demo)")) ResetAsset();

        DemoGui.Section("C. Giới hạn của serializer");
        if (DemoGui.Step(4, "Xem kiểu của Skill sau khi load", "List thường ra Skill (mất damage); SerializeReference giữ FireSkill.")) ShowSkills();

#if UNITY_EDITOR
        DemoGui.Section("D. Reference = GUID");
        string swordPath = AssetDatabase.GetAssetPath(player.weapon);
        if (DemoGui.Step(5, "Mở Player.prefab dạng text", "Dòng weapon có guid giống hệt GUID trong Sword.prefab.meta.")) InternalEditorUtility.OpenFileAtLineExternal(PlayerPrefabPath, 1);
        if (DemoGui.Button("Mở Sword.prefab.meta")) InternalEditorUtility.OpenFileAtLineExternal(swordPath + ".meta", 1);
        DemoGui.Live("GUID của Sword.prefab", AssetDatabase.AssetPathToGUID(swordPath), V.Info, "So với dòng weapon: {fileID: …, guid: …} trong Player.prefab.");
#endif
        DemoGui.Takeaway("Đổi số cân bằng ở <b>prefab/Inspector</b>, không ở code. Đổi tên field: <b>[FormerlySerializedAs]</b>. Không lưu: <b>[NonSerialized]</b>. Dữ liệu runtime: <b>bản sao</b>, không sửa asset. Đa hình/null: <b>[SerializeReference]</b>.");
        DemoGui.Live("config.startCoins (file asset)", config.startCoins, config.startCoins == 100 ? V.Info : V.Bad);
        DemoGui.Live("Bản sao runtime", _runtimeConfig.startCoins, V.Good);
        DemoGui.End();
        DemoGui.WorldLabel(player.transform.position + Vector3.up * 1.4f, "Player (instance của prefab)");
    }

    #endregion
}
