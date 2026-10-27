using System.Collections;
using System.Collections.Generic;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.Rendering;
using V = DemoGui.Verdict;

public class RenderingDemo : MonoBehaviour
{
    enum Mode { SharedMaterial, MaterialCopy, PropertyBlock }

    static readonly string[] ModeLabels = { "sharedMaterial (dùng chung)", "renderer.material (bản sao)", "MaterialPropertyBlock" };
    static readonly WaitForSecondsRealtime SettleDelay = new(1f);

    [SerializeField] Material baseMaterial;
    [SerializeField] Transform gridRoot;
    [SerializeField] int gridSize = 10;

    readonly List<GameObject> _cubes = new();
    readonly List<Material> _copies = new();
    MaterialPropertyBlock _block;
    Mode _mode;
    bool _destroyCopies = true;
    int _colorId;
    Coroutine _snapshot;

    // Unity 6.4 splits draw calls by path; the old "Draw Calls Count" / "Batches Count" counters read 0
    ProfilerRecorder _srpDraws, _standardDraws, _instancedDraws, _setPass, _triangles, _vertices;

    void OnEnable()
    {
        _srpDraws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SRP Batcher Draw Calls Count");
        _standardDraws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Standard Draw Calls Count");
        _instancedDraws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Standard Instanced Draw Calls Count");
        _setPass = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count");
        _triangles = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");
        _vertices = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Vertices Count");
    }

    void OnDisable()
    {
        _srpDraws.Dispose();
        _standardDraws.Dispose();
        _instancedDraws.Dispose();
        _setPass.Dispose();
        _triangles.Dispose();
        _vertices.Dispose();
    }

    void Start()
    {
        _block = new MaterialPropertyBlock();
        _colorId = Shader.PropertyToID(baseMaterial.HasProperty("_BaseColor") ? "_BaseColor" : "_Color");
        Spawn();
    }

    void OnDestroy()
    {
        foreach (var m in _copies) Destroy(m);
    }

    #region Logic

    void Spawn()
    {
        foreach (var cube in _cubes) Destroy(cube);
        _cubes.Clear();
        if (_destroyCopies)
        {
            foreach (var m in _copies) Destroy(m);
            _copies.Clear();
        }

        for (int x = 0; x < gridSize; x++)
        for (int y = 0; y < gridSize; y++)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.transform.SetParent(gridRoot, false);
            go.transform.localPosition = new Vector3(x * 0.38f, y * 0.38f, 0f);
            go.transform.localScale = Vector3.one * 0.3f;
            Destroy(go.GetComponent<Collider>());
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = baseMaterial;
            Apply(r, Color.HSVToRGB((x * gridSize + y) / (float)(gridSize * gridSize), 0.7f, 0.95f));
            _cubes.Add(go);
        }
        TakeSnapshot(ModeLabels[(int)_mode]);
    }

    void Apply(Renderer r, Color color)
    {
        switch (_mode)
        {
            case Mode.SharedMaterial:
                break;
            case Mode.MaterialCopy:
                Material copy = r.material;
                copy.SetColor(_colorId, color);
                _copies.Add(copy);
                break;
            case Mode.PropertyBlock:
                _block.SetColor(_colorId, color);
                r.SetPropertyBlock(_block);
                break;
            default:
                throw new System.ArgumentOutOfRangeException(nameof(_mode), _mode, null);
        }
    }

    void SetMode(Mode mode)
    {
        _mode = mode;
        Spawn();
    }

    void TakeSnapshot(string title)
    {
        if (_snapshot != null) StopCoroutine(_snapshot);
        _snapshot = StartCoroutine(SnapshotAfterSettle(title));
    }

    IEnumerator SnapshotAfterSettle(string title)
    {
        yield return SettleDelay;
        string batcher = GraphicsSettings.useScriptableRenderPipelineBatching ? "SRP Batcher bật" : "SRP Batcher tắt";
        DemoGui.Result($"{title} · {batcher}", $"Draw {Read(_srpDraws, _standardDraws, _instancedDraws)} (SRP Batcher {Read(_srpDraws)}) · SetPass {Read(_setPass)}", V.Info,
            $"Material sinh thêm: {ExtraMaterials()}");
        _snapshot = null;
    }

    // renderer.material names its copies "<name> (Instance)"; leaked copies stay alive and keep being counted
    int ExtraMaterials()
    {
        string copyName = baseMaterial.name + " (Instance)";
        int count = 0;
        foreach (var m in Resources.FindObjectsOfTypeAll<Material>())
            if (m.name == copyName) count++;
        return count;
    }

    static string Read(params ProfilerRecorder[] recorders)
    {
        long total = 0;
        foreach (var recorder in recorders)
        {
            if (!recorder.Valid) return "-";
            total += recorder.LastValue;
        }
        return total.ToString("N0");
    }

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("07 · Đổi màu từng object: cách nào rẻ?", "renderer.material, sharedMaterial hay MaterialPropertyBlock? Số lần vẽ (draw call), batch, SetPass thay đổi ra sao?");

        DemoGui.Section("Chuẩn bị");
        DemoGui.Hint("Bật Game view → Stats để đối chiếu. Mở Window → Analysis → Frame Debugger để xem từng lần vẽ (nhớ Disable khi xong).");

        DemoGui.Section("Các bước (mỗi bước tự chụp số liệu sau 1 giây vào bảng Kết quả)");
        if (DemoGui.Step(1, "Chế độ sharedMaterial (dùng chung)", "Một màu, Material sinh thêm = 0. Ghi lại Draw / Batches / SetPass làm mốc.")) SetMode(Mode.SharedMaterial);
        if (DemoGui.Step(2, "Chế độ renderer.material (bản sao)", "Màu riêng, Material sinh thêm = 100. SetPass gần như không đổi: SRP Batcher vẫn gộp được (cùng shader).")) SetMode(Mode.MaterialCopy);
        bool leak = !_destroyCopies;
        if (DemoGui.Step(3, leak ? "Đang TẮT dọn bản sao: bấm Tạo lại lưới nhiều lần" : "Tắt dọn bản sao, rồi bấm Tạo lại lưới nhiều lần", "Material sinh thêm tăng 100 mỗi lần = rò rỉ bộ nhớ."))
        {
            _destroyCopies = false;
            Spawn();
        }
        if (DemoGui.Step(4, "Chế độ MaterialPropertyBlock", "Material sinh thêm = 0, nhưng qua SRP Batcher = 0 và SetPass tăng khoảng 200 (mỗi lần vẽ một SetPass). Frame Debugger ghi lý do.")) { _destroyCopies = true; SetMode(Mode.PropertyBlock); }

        bool batcher = DemoGui.Toggle(GraphicsSettings.useScriptableRenderPipelineBatching, "5 · Bật/tắt SRP Batcher rồi so SetPass ở bảng Kết quả");
        if (batcher != GraphicsSettings.useScriptableRenderPipelineBatching)
        {
            GraphicsSettings.useScriptableRenderPipelineBatching = batcher;
            TakeSnapshot(ModeLabels[(int)_mode]);
        }

        DemoGui.Takeaway("Đổi màu cả nhóm: <b>sharedMaterial</b>. Cần bản sao: lưu lại và <b>Destroy</b>. URP: nhiều material <b>cùng shader</b> vẫn rẻ; <b>MaterialPropertyBlock</b> làm mất SRP Batcher. Đo bằng <b>Stats/Frame Debugger</b>.");

        var pipeline = GraphicsSettings.currentRenderPipeline;
        int extra = ExtraMaterials();
        DemoGui.Live("Render pipeline", pipeline != null ? pipeline.name : "Built-in", V.Info);
        DemoGui.Live("Chế độ hiện tại", ModeLabels[(int)_mode], _mode == Mode.SharedMaterial ? V.Good : V.Info);
        DemoGui.Live("Draw Calls (tổng lệnh vẽ)", Read(_srpDraws, _standardDraws, _instancedDraws), V.Info, "100 khối vẽ 2 lần (bóng + màu) = 200. Khoảng 70 lần vẽ cố định là của giao diện demo.");
        DemoGui.Live("  · qua SRP Batcher (rẻ)", Read(_srpDraws), V.Good, "Gộp theo shader: đổi material cùng shader gần như không tốn SetPass.");
        DemoGui.Live("  · qua đường thường", Read(_standardDraws), V.Info, "Không vào được SRP Batcher: MaterialPropertyBlock, shader không tương thích, giao diện IMGUI.");
        DemoGui.Live("SetPass Calls (đổi shader/trạng thái)", Read(_setPass), V.Info, "Phần đắt nhất phía CPU. Khoảng 70 là của giao diện demo; so chênh lệch giữa các chế độ.");
        DemoGui.Live("Triangles / Vertices", $"{Read(_triangles)} / {Read(_vertices)}", V.Info);
        DemoGui.Live("Material sinh thêm đang tồn tại", extra, extra > 100 ? V.Bad : extra > 0 ? V.Info : V.Good, "renderer.material tạo 1 bản sao mỗi khối; bản sao không tự bị xoá.");
        DemoGui.End();
        if (gridRoot != null) DemoGui.WorldLabel(gridRoot.position + new Vector3(1.7f, 4.1f, 0f), "100 khối cùng shader URP/Lit");
    }

    #endregion
}
