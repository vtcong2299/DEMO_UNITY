using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class DemoGui
{
    public const string Green = "#7CFC9A";
    public const string Red = "#FF7B72";
    public const string Yellow = "#F2CC60";
    public const string Blue = "#79B8FF";
    public const string Gray = "#9AA4B1";

    const float RefHeight = 1080f;
    const int MaxLines = 18;

    static readonly List<string> Lines = new();
    static GUIStyle _title, _subtitle, _section, _label, _button, _log, _panel;
    static Texture2D _panelTexture;
    static Vector2 _scroll;
    static float _width, _height;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    static void ResetStatics()
    {
        Lines.Clear();
        _scroll = Vector2.zero;
        SceneManager.sceneLoaded -= OnSceneLoaded;
        SceneManager.sceneLoaded += OnSceneLoaded;
    }

    static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        Lines.Clear();
        _scroll = Vector2.zero;
    }

    public static void Log(string message, string color = null)
    {
        Debug.Log(message);
        Lines.Add(color == null ? message : $"<color={color}>{message}</color>");
        if (Lines.Count > MaxLines) Lines.RemoveAt(0);
    }

    public static void ClearLog() => Lines.Clear();

    public static void Begin(string title, string subtitle)
    {
        EnsureStyles();
        float scale = Screen.height / RefHeight;
        _width = Screen.width / scale;
        _height = RefHeight;
        GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));

        GUI.Box(new Rect(0, 0, _width, 110), GUIContent.none, _panel);
        GUI.Label(new Rect(24, 10, _width - 48, 56), title, _title);
        GUI.Label(new Rect(24, 64, _width - 48, 40), subtitle, _subtitle);

        GUILayout.BeginArea(new Rect(16, 122, 760, _height - 210), _panel);
        _scroll = GUILayout.BeginScrollView(_scroll);
    }

    public static void End()
    {
        GUILayout.EndScrollView();
        GUILayout.EndArea();
        DrawLog();
        DrawNavigation();
        GUI.matrix = Matrix4x4.identity;
    }

    public static void Section(string text) => GUILayout.Label(text, _section);

    public static void Label(string text) => GUILayout.Label(text, _label);

    public static void Value(string name, object value, string color = null)
    {
        string shown = color == null ? $"{value}" : $"<color={color}><b>{value}</b></color>";
        GUILayout.Label($"{name}: {shown}", _label);
    }

    public static bool Button(string text) => GUILayout.Button(text, _button, GUILayout.Height(52));

    public static bool Toggle(bool value, string text) =>
        GUILayout.Toggle(value, value ? $"  [x] {text}" : $"  [  ] {text}", _button, GUILayout.Height(52));

    public static int Choice(int selected, string[] options, int columns = 4)
    {
        columns = Mathf.Min(options.Length, columns);
        float height = 50 * Mathf.CeilToInt(options.Length / (float)columns);
        return GUILayout.SelectionGrid(selected, options, columns, _button, GUILayout.Height(height));
    }

    public static void Space() => GUILayout.Space(12);

    public static string YesNo(bool value) => value ? $"<color={Green}>True</color>" : $"<color={Red}>False</color>";

    static void DrawLog()
    {
        var rect = new Rect(_width - 720, _height - 520, 704, 432);
        GUILayout.BeginArea(rect, _panel);
        GUILayout.Label("<b>Log</b>  (cũng in ra Console)", _section);
        foreach (string line in Lines) GUILayout.Label(line, _log);
        GUILayout.EndArea();
    }

    static void DrawNavigation()
    {
        int index = SceneManager.GetActiveScene().buildIndex;
        int count = SceneManager.sceneCountInBuildSettings;
        var rect = new Rect(16, _height - 78, _width - 32, 66);
        GUILayout.BeginArea(rect, _panel);
        GUILayout.BeginHorizontal();
        GUI.enabled = index > 0;
        if (GUILayout.Button("◀  Scene trước", _button, GUILayout.Width(260), GUILayout.Height(50))) SceneManager.LoadScene(index - 1);
        GUI.enabled = true;
        GUILayout.Label($"Scene {index + 1} / {count}  ·  {SceneManager.GetActiveScene().name}", _subtitle, GUILayout.Height(50));
        GUI.enabled = index >= 0 && index < count - 1;
        if (GUILayout.Button("Scene sau  ▶", _button, GUILayout.Width(260), GUILayout.Height(50))) SceneManager.LoadScene(index + 1);
        GUI.enabled = true;
        GUILayout.EndHorizontal();
        GUILayout.EndArea();
    }

    static void EnsureStyles()
    {
        if (_title != null && _panelTexture != null) return;
        _panelTexture = new Texture2D(1, 1) { hideFlags = HideFlags.HideAndDontSave };
        _panelTexture.SetPixel(0, 0, new Color(0.07f, 0.08f, 0.1f, 0.88f));
        _panelTexture.Apply();

        _panel = new GUIStyle(GUI.skin.box) { padding = new RectOffset(14, 14, 10, 10) };
        _panel.normal.background = _panelTexture;
        _title = new GUIStyle(GUI.skin.label) { fontSize = 40, fontStyle = FontStyle.Bold, richText = true };
        _title.normal.textColor = Color.white;
        _subtitle = new GUIStyle(GUI.skin.label) { fontSize = 22, richText = true, alignment = TextAnchor.MiddleLeft };
        _subtitle.normal.textColor = new Color(0.8f, 0.82f, 0.86f);
        _section = new GUIStyle(GUI.skin.label) { fontSize = 24, fontStyle = FontStyle.Bold, richText = true };
        _section.normal.textColor = new Color(1f, 0.75f, 0.55f);
        _label = new GUIStyle(GUI.skin.label) { fontSize = 21, richText = true, wordWrap = true };
        _label.normal.textColor = new Color(0.92f, 0.93f, 0.95f);
        _log = new GUIStyle(_label) { fontSize = 19 };
        _button = new GUIStyle(GUI.skin.button) { fontSize = 21, richText = true, wordWrap = true };
    }
}
