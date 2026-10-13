using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

public class RenderingDemo : MonoBehaviour
{
    enum Mode { SharedMaterial, MaterialCopy, PropertyBlock }

    static readonly string[] ModeLabels = { "sharedMaterial (dùng chung)", "renderer.material (bản sao)", "MaterialPropertyBlock" };

    [SerializeField] Material baseMaterial;
    [SerializeField] Transform gridRoot;
    [SerializeField] int gridSize = 10;

    readonly List<GameObject> _cubes = new();
    readonly List<Material> _copies = new();
    MaterialPropertyBlock _block;
    Mode _mode;
    bool _destroyCopies = true;
    int _baselineMaterials;
    int _colorId;

    void Start()
    {
        _block = new MaterialPropertyBlock();
        _colorId = Shader.PropertyToID(baseMaterial.HasProperty("_BaseColor") ? "_BaseColor" : "_Color");
        _baselineMaterials = Resources.FindObjectsOfTypeAll<Material>().Length;
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
            go.transform.localPosition = new Vector3(x * 0.6f, y * 0.6f, 0f);
            go.transform.localScale = Vector3.one * 0.45f;
            Destroy(go.GetComponent<Collider>());
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = baseMaterial;
            Color color = Color.HSVToRGB((x * gridSize + y) / (float)(gridSize * gridSize), 0.7f, 0.95f);
            Apply(r, color);
            _cubes.Add(go);
        }
        DemoGui.Log($"Tạo {_cubes.Count} khối với chế độ: {ModeLabels[(int)_mode]}", DemoGui.Yellow);
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

    #endregion

    #region UI

    void OnGUI()
    {
        DemoGui.Begin("07 · Rendering: những dòng code “vô hại”", "renderer.material tạo bản sao. Trong URP, MaterialPropertyBlock làm mất SRP Batcher.");

        DemoGui.Section("Pipeline");
        var pipeline = GraphicsSettings.currentRenderPipeline;
        DemoGui.Value("Render pipeline", pipeline != null ? pipeline.name : "Built-in", DemoGui.Blue);
        bool batcher = DemoGui.Toggle(GraphicsSettings.useScriptableRenderPipelineBatching, "SRP Batcher");
        if (batcher != GraphicsSettings.useScriptableRenderPipelineBatching)
        {
            GraphicsSettings.useScriptableRenderPipelineBatching = batcher;
            DemoGui.Log($"SRP Batcher = {batcher}", DemoGui.Yellow);
        }

        DemoGui.Section("Cách đổi màu từng khối");
        int selected = DemoGui.Choice((int)_mode, ModeLabels, 1);
        if (selected != (int)_mode)
        {
            _mode = (Mode)selected;
            Spawn();
        }
        _destroyCopies = DemoGui.Toggle(_destroyCopies, "Destroy bản sao material khi tạo lại");
        if (DemoGui.Button("Tạo lại lưới khối")) Spawn();

        DemoGui.Section("Số đo");
        int materials = Resources.FindObjectsOfTypeAll<Material>().Length - _baselineMaterials;
        DemoGui.Value("Material sinh thêm đang tồn tại", materials, materials > 0 ? DemoGui.Red : DemoGui.Green);
        DemoGui.Value("Bản sao đang giữ trong list", _copies.Count);
        DemoGui.Label("<color=#9AA4B1>Tắt “Destroy bản sao” rồi bấm Tạo lại nhiều lần: số material tăng mãi = rò rỉ.</color>");

        DemoGui.Section("Xem bằng mắt");
        DemoGui.Label("1. Game view → <b>Stats</b>: xem Batches / SetPass calls.");
        DemoGui.Label("2. Window → Analysis → <b>Frame Debugger</b> → Enable → mở các lần vẽ: SRP Batch hay không, và lý do.");
        DemoGui.End();
    }

    #endregion
}
