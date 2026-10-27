using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class DemoGui
{
    public enum Verdict { Info, Good, Bad }

    public const string Green = "#7CFC9A";
    public const string Red = "#FF7B72";
    public const string Yellow = "#F2CC60";
    public const string Blue = "#79B8FF";
    public const string Gray = "#9AA4B1";

    const float RefHeight = 1080f;
    const float LeftWidth = 760f;
    const float RightWidth = 760f;
    const int MaxLogLines = 6;

    struct Row
    {
        public string Label, Value, Note;
        public Verdict Verdict;
    }

    static readonly List<Row> Rows = new();
    static readonly List<Row> LiveRows = new();
    static readonly List<string> Lines = new();
    static GUIStyle _title, _question, _section, _label, _hint, _button, _small, _value, _panel, _takeawayBox;
    static Texture2D _panelTexture, _takeawayTexture;
    static Vector2 _leftScroll, _rightScroll;
    static float _width, _scale;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    static void ResetStatics()
    {
        ClearAll();
        SceneManager.sceneLoaded -= OnSceneLoaded;
        SceneManager.sceneLoaded += OnSceneLoaded;
    }

    static void OnSceneLoaded(Scene scene, LoadSceneMode mode) => ClearAll();

    static void ClearAll()
    {
        Rows.Clear();
        LiveRows.Clear();
        Lines.Clear();
        _leftScroll = _rightScroll = Vector2.zero;
    }

    #region Results

    public static void Log(string message, string color = null)
    {
        Debug.Log(message);
        Lines.Add(color == null ? message : $"<color={color}>{message}</color>");
        if (Lines.Count > MaxLogLines) Lines.RemoveAt(0);
    }

    public static void ClearResults()
    {
        Rows.Clear();
        Lines.Clear();
    }

    public static void Result(string label, object value, Verdict verdict = Verdict.Info, string note = null) =>
        Rows.Add(new Row { Label = label, Value = $"{value}", Verdict = verdict, Note = note });

    public static void Live(string label, object value, Verdict verdict = Verdict.Info, string note = null) =>
        LiveRows.Add(new Row { Label = label, Value = $"{value}", Verdict = verdict, Note = note });

    public static string YesNo(bool value) => value ? "True" : "False";

    #endregion

    #region Layout

    public static void Begin(string title, string question)
    {
        EnsureStyles();
        LiveRows.Clear();
        _scale = Screen.height / RefHeight;
        _width = Screen.width / _scale;
        GUI.matrix = Matrix4x4.Scale(new Vector3(_scale, _scale, 1f));

        GUI.Box(new Rect(0, 0, _width, 112), GUIContent.none, _panel);
        GUI.Label(new Rect(24, 8, _width - 48, 56), title, _title);
        GUI.Label(new Rect(24, 64, _width - 48, 42), $"<color={Yellow}>Câu hỏi:</color> {question}", _question);

        GUILayout.BeginArea(new Rect(16, 124, LeftWidth, RefHeight - 212), _panel);
        _leftScroll = GUILayout.BeginScrollView(_leftScroll);
    }

    public static void End()
    {
        GUILayout.EndScrollView();
        GUILayout.EndArea();
        DrawResults();
        DrawNavigation();
        GUI.matrix = Matrix4x4.identity;
    }

    public static void Section(string text) => GUILayout.Label(text, _section);

    public static void Label(string text) => GUILayout.Label(text, _label);

    public static void Hint(string text) => GUILayout.Label(text, _hint);

    public static bool Button(string text) => GUILayout.Button(text, _button, GUILayout.Height(50));

    public static bool Step(int number, string text, string expect)
    {
        bool clicked = GUILayout.Button($"<b>{number}</b> · {text}", _button, GUILayout.Height(50));
        GUILayout.Label($"→ Kỳ vọng: {expect}", _hint);
        GUILayout.Space(6);
        return clicked;
    }

    public static bool Toggle(bool value, string text) =>
        GUILayout.Toggle(value, value ? $"  [x] {text}" : $"  [  ] {text}", _button, GUILayout.Height(50));

    public static int Choice(int selected, string[] options, int columns = 4)
    {
        columns = Mathf.Min(options.Length, columns);
        float height = 48 * Mathf.CeilToInt(options.Length / (float)columns);
        return GUILayout.SelectionGrid(selected, options, columns, _button, GUILayout.Height(height));
    }

    public static void Takeaway(string text)
    {
        GUILayout.Space(10);
        GUILayout.Label($"<b>Ghi nhớ:</b> {text}", _takeawayBox);
    }

    public static void Space() => GUILayout.Space(10);

    public static void WorldLabel(Vector3 worldPosition, string text)
    {
        var camera = Camera.main;
        if (camera == null) return;
        EnsureStyles();
        Vector3 screen = camera.WorldToScreenPoint(worldPosition);
        if (screen.z <= 0f) return;
        float scale = Screen.height / RefHeight;
        GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
        float x = screen.x / scale, y = (Screen.height - screen.y) / scale;
        GUI.Label(new Rect(x - 160, y - 18, 320, 36), text, _small);
        GUI.matrix = Matrix4x4.identity;
    }

    static void DrawResults()
    {
        var rect = new Rect(_width - RightWidth - 16, 124, RightWidth, RefHeight - 212);
        GUILayout.BeginArea(rect, _panel);
        _rightScroll = GUILayout.BeginScrollView(_rightScroll);
        GUILayout.Label("Kết quả", _section);
        if (LiveRows.Count == 0 && Rows.Count == 0) GUILayout.Label("Bấm các bước bên trái để xem kết quả.", _hint);
        foreach (var row in LiveRows) DrawRow(row);
        foreach (var row in Rows) DrawRow(row);
        if (Lines.Count > 0)
        {
            GUILayout.Space(10);
            GUILayout.Label("Log (cũng in ra Console)", _section);
            foreach (string line in Lines) GUILayout.Label(line, _small);
        }
        GUILayout.EndScrollView();
        GUILayout.EndArea();
    }

    static void DrawRow(Row row)
    {
        string color = row.Verdict switch { Verdict.Good => Green, Verdict.Bad => Red, _ => Blue };
        string marker = row.Verdict switch { Verdict.Good => $"<color={Green}>●</color> ", Verdict.Bad => $"<color={Red}>●</color> ", _ => "" };
        GUILayout.BeginHorizontal();
        GUILayout.Label($"{marker}{row.Label}", _label, GUILayout.Width(400));
        GUILayout.Label($"<color={color}><b>{row.Value}</b></color>", _value);
        GUILayout.EndHorizontal();
        if (!string.IsNullOrEmpty(row.Note)) GUILayout.Label(row.Note, _hint);
        GUILayout.Space(4);
    }

    static void DrawNavigation()
    {
        int index = SceneManager.GetActiveScene().buildIndex;
        int count = SceneManager.sceneCountInBuildSettings;
        var rect = new Rect(16, RefHeight - 80, _width - 32, 68);
        GUILayout.BeginArea(rect, _panel);
        GUILayout.BeginHorizontal();
        GUI.enabled = index > 0;
        if (GUILayout.Button("◀  Scene trước", _button, GUILayout.Width(260), GUILayout.Height(48))) SceneManager.LoadScene(index - 1);
        GUI.enabled = true;
        GUILayout.Label($"Scene {index + 1} / {count}  ·  {SceneManager.GetActiveScene().name}  ·  github.com/vtcong2299/DEMO_UNITY", _question, GUILayout.Height(48));
        GUI.enabled = index >= 0 && index < count - 1;
        if (GUILayout.Button("Scene sau  ▶", _button, GUILayout.Width(260), GUILayout.Height(48))) SceneManager.LoadScene(index + 1);
        GUI.enabled = true;
        GUILayout.EndHorizontal();
        GUILayout.EndArea();
    }

    #endregion

    #region Styles

    static Texture2D Solid(Color color)
    {
        var texture = new Texture2D(1, 1) { hideFlags = HideFlags.HideAndDontSave };
        texture.SetPixel(0, 0, color);
        texture.Apply();
        return texture;
    }

    static void EnsureStyles()
    {
        if (_title != null && _panelTexture != null) return;
        _panelTexture = Solid(new Color(0.07f, 0.08f, 0.1f, 0.9f));
        _takeawayTexture = Solid(new Color(0.12f, 0.3f, 0.2f, 0.95f));

        _panel = new GUIStyle(GUI.skin.box) { padding = new RectOffset(14, 14, 10, 10) };
        _panel.normal.background = _panelTexture;
        _title = new GUIStyle(GUI.skin.label) { fontSize = 38, fontStyle = FontStyle.Bold, richText = true };
        _title.normal.textColor = Color.white;
        _question = new GUIStyle(GUI.skin.label) { fontSize = 23, richText = true, alignment = TextAnchor.MiddleLeft };
        _question.normal.textColor = new Color(0.86f, 0.88f, 0.92f);
        _section = new GUIStyle(GUI.skin.label) { fontSize = 24, fontStyle = FontStyle.Bold, richText = true };
        _section.normal.textColor = new Color(1f, 0.75f, 0.55f);
        _label = new GUIStyle(GUI.skin.label) { fontSize = 21, richText = true, wordWrap = true };
        _label.normal.textColor = new Color(0.92f, 0.93f, 0.95f);
        _value = new GUIStyle(_label) { fontSize = 22 };
        _hint = new GUIStyle(_label) { fontSize = 18 };
        _hint.normal.textColor = new Color(0.65f, 0.69f, 0.75f);
        _small = new GUIStyle(_label) { fontSize = 18, alignment = TextAnchor.MiddleCenter };
        _button = new GUIStyle(GUI.skin.button) { fontSize = 21, richText = true, wordWrap = true, alignment = TextAnchor.MiddleLeft, padding = new RectOffset(14, 10, 6, 6) };
        _takeawayBox = new GUIStyle(_label) { padding = new RectOffset(14, 14, 10, 10) };
        _takeawayBox.normal.background = _takeawayTexture;
    }

    #endregion
}
