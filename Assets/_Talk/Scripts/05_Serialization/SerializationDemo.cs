using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
using UnityEditorInternal;
#endif

public class SerializationDemo : MonoBehaviour
{
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
        null => "<color=#FF7B72>null</color>",
        FireSkill fire => $"<color={DemoGui.Green}>FireSkill</color> (damage = {fire.damage})",
        _ => $"<color={DemoGui.Red}>Skill</color> (mất kiểu con)",
    };

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("05 · Serialization: Unity lưu dữ liệu thế nào", "Inspector thắng code. ScriptableObject là asset. Serializer có giới hạn.");
        string missing = MissingReferences();
        if (missing != null || _runtimeConfig == null)
        {
            DemoGui.Label($"<color={DemoGui.Red}><b>Scene thiếu reference: {missing ?? "config"}.</b></color>");
            DemoGui.Label("Thoát Play, chạy menu <b>Talk → Dựng lại toàn bộ scene demo</b>, hoặc kéo asset vào ô tương ứng của SerializationDemo trong Inspector.");
            DemoGui.End();
            return;
        }

        DemoGui.Section("A. Giá trị trong Inspector thắng giá trị trong code");
        DemoGui.Value("PlayerStats.speed viết trong code", _codeDefaultSpeed);
        DemoGui.Value("PlayerStats.speed trong prefab Player", player.speed, DemoGui.Yellow);
        DemoGui.Value("[HideInInspector] hiddenButSaved", player.hiddenButSaved, DemoGui.Green);
        DemoGui.Value("[NonSerialized] notSaved", player.notSaved, DemoGui.Red);
        DemoGui.Label("<color=#9AA4B1>Lúc dựng scene, cả hai field dưới đều được gán 42. Chỉ field được serialize còn giữ giá trị.</color>");

        DemoGui.Section("B. ScriptableObject = asset");
        DemoGui.Value("config.startCoins (file asset)", config.startCoins, DemoGui.Yellow);
        DemoGui.Value("Bản sao runtime (Instantiate)", _runtimeConfig.startCoins, DemoGui.Green);
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("+100 vào asset (sai)"))
        {
            config.startCoins += 100;
            DemoGui.Log($"config.startCoins = {config.startCoins}: thoát Play vẫn giữ!", DemoGui.Red);
        }
        if (DemoGui.Button("+100 vào bản sao (đúng)"))
        {
            _runtimeConfig.startCoins += 100;
            DemoGui.Log($"Bản sao = {_runtimeConfig.startCoins}: asset không đổi", DemoGui.Green);
        }
        GUILayout.EndHorizontal();
        if (DemoGui.Button("Đặt lại asset = 100"))
        {
            config.startCoins = 100;
#if UNITY_EDITOR
            EditorUtility.SetDirty(config);
            AssetDatabase.SaveAssetIfDirty(config);
#endif
        }

        DemoGui.Section("C. Giới hạn của serializer");
        DemoGui.Value("List<Skill> thường, phần tử [0]", Describe(skillBook.plainSkills.Count > 0 ? skillBook.plainSkills[0] : null));
        DemoGui.Value("[SerializeReference] List<Skill>, phần tử [0]", Describe(skillBook.referenceSkills.Count > 0 ? skillBook.referenceSkills[0] : null));
        DemoGui.Value("Skill thường, gán null khi dựng", skillBook.plainEmptySlot == null ? "null" : "<color=#FF7B72>object rỗng (không còn null!)</color>");
        DemoGui.Value("[SerializeReference] Skill, gán null", skillBook.referenceEmptySlot == null ? $"<color={DemoGui.Green}>null</color>" : "object");

#if UNITY_EDITOR
        DemoGui.Section("D. Reference = GUID + fileID");
        string swordPath = AssetDatabase.GetAssetPath(player.weapon);
        DemoGui.Value("Sword.prefab GUID", AssetDatabase.AssetPathToGUID(swordPath), DemoGui.Blue);
        string playerPath = "Assets/_Talk/Prefabs/Player.prefab";
        GUILayout.BeginHorizontal();
        if (DemoGui.Button("Mở Player.prefab dạng text")) InternalEditorUtility.OpenFileAtLineExternal(playerPath, 1);
        if (DemoGui.Button("Mở Sword.prefab.meta")) InternalEditorUtility.OpenFileAtLineExternal(swordPath + ".meta", 1);
        GUILayout.EndHorizontal();
#endif
        DemoGui.End();
    }

    #endregion
}
