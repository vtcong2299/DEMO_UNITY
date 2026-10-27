using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Object = UnityEngine.Object;

[InitializeOnLoad]
static class DemoSceneBuilder
{
    const string Root = "Assets/_Talk";
    const string ScenesFolder = Root + "/Scenes";
    const string DataFolder = Root + "/Data";
    const string PrefabsFolder = Root + "/Prefabs";
    const string RenderingFolder = Root + "/Rendering";

    static readonly string[] SceneNames =
    {
        "01_FakeNull", "02_NativeCost", "03_PlayerLoop", "04_Lifetime",
        "05_Serialization", "06_GarbageCollector", "07_Rendering", "08_EnterPlayMode",
    };

    static DemoSceneBuilder() => EditorApplication.delayCall += AutoBuild;

    // bump when the scene layout changes so every clone rebuilds once; a dot-file is invisible to the AssetDatabase
    const string SceneVersion = "2";
    const string VersionFile = ScenesFolder + "/.build_version";

    static string ScenePath(string sceneName) => $"{ScenesFolder}/{sceneName}.unity";

    static void AutoBuild()
    {
        if (EditorApplication.isPlayingOrWillChangePlaymode) return;
        if (File.Exists(VersionFile) && File.ReadAllText(VersionFile).Trim() == SceneVersion) return;
        if (EditorApplication.isCompiling || EditorApplication.isUpdating)
        {
            EditorApplication.delayCall += AutoBuild;
            return;
        }
        BuildAll();
    }

    [MenuItem("Talk/Dựng lại toàn bộ scene demo")]
    public static void BuildAll()
    {
        bool onlyUntitled = string.IsNullOrEmpty(SceneManager.GetActiveScene().path) && SceneManager.sceneCount == 1;
        if (!onlyUntitled && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
        EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        foreach (string folder in new[] { ScenesFolder, DataFolder, PrefabsFolder, RenderingFolder })
            Directory.CreateDirectory(folder);
        AssetDatabase.Refresh();

        bool urp = EnsureUrp();
        EnsureMaterial("Talk_White", new Color(0.9f, 0.9f, 0.92f), urp);
        EnsureMaterial("Talk_Red", new Color(0.9f, 0.3f, 0.3f), urp);
        EnsureMaterial("Talk_Green", new Color(0.3f, 0.8f, 0.45f), urp);
        EnsureMaterial("Talk_Blue", new Color(0.3f, 0.55f, 0.95f), urp);
        EnsureMaterial("Talk_Yellow", new Color(0.95f, 0.8f, 0.3f), urp);
        AssetDatabase.SaveAssets();
        EnsureConfig();
        EnsurePrefabs(Mat("Talk_Blue"), Mat("Talk_Yellow"));

        BuildFakeNull();
        BuildNativeCost();
        BuildPlayerLoop();
        BuildLifetime();
        BuildSerialization();
        BuildGarbageCollector();
        BuildRendering();
        BuildEnterPlayMode();

        EditorBuildSettings.scenes = SceneNames.Select(n => new EditorBuildSettingsScene(ScenePath(n), true)).ToArray();
        AssetDatabase.SaveAssets();
        File.WriteAllText(VersionFile, SceneVersion);
        EditorSceneManager.OpenScene(ScenePath(SceneNames[0]));
        Debug.Log($"[Talk] Đã dựng {SceneNames.Length} scene demo trong {ScenesFolder}. Mở 01_FakeNull và bấm Play.");
    }

    #region Assets

    static bool EnsureUrp()
    {
        if (GraphicsSettings.defaultRenderPipeline != null) return true;
        const string ns = "UnityEngine.Rendering.Universal.";
        const string asm = ", Unity.RenderPipelines.Universal.Runtime";
        var assetType = Type.GetType(ns + "UniversalRenderPipelineAsset" + asm);
        var dataType = Type.GetType(ns + "UniversalRendererData" + asm);
        var create = assetType?.GetMethods(BindingFlags.Public | BindingFlags.Static)
            .FirstOrDefault(m => m.Name == "Create" && m.GetParameters().Length == 1);
        if (dataType == null || create == null)
        {
            Debug.LogWarning("[Talk] Không tìm thấy URP. Demo 07 (SRP Batcher) cần package com.unity.render-pipelines.universal.");
            return false;
        }

        var rendererData = ScriptableObject.CreateInstance(dataType);
        AssetDatabase.CreateAsset(rendererData, $"{RenderingFolder}/Talk_Renderer.asset");
        var pipeline = (RenderPipelineAsset)create.Invoke(null, new object[] { rendererData });
        AssetDatabase.CreateAsset(pipeline, $"{RenderingFolder}/Talk_URP.asset");
        GraphicsSettings.defaultRenderPipeline = pipeline;
        AssetDatabase.SaveAssets();
        Debug.Log("[Talk] Đã tạo URP Asset và gán vào Graphics Settings.");
        return true;
    }

    static Material EnsureMaterial(string assetName, Color color, bool urp)
    {
        string path = $"{RenderingFolder}/{assetName}.mat";
        var shader = Shader.Find(urp ? "Universal Render Pipeline/Lit" : "Standard");
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(shader);
            AssetDatabase.CreateAsset(material, path);
        }
        material.shader = shader;
        material.color = color;
        EditorUtility.SetDirty(material);
        return material;
    }

    const string ConfigPath = DataFolder + "/PlayerConfig.asset";
    const string PlayerPrefabPath = PrefabsFolder + "/Player.prefab";

    // load assets only after NewDemoScene: opening a scene in Single mode unloads unreferenced assets and leaves held references as fake nulls
    static T LoadAsset<T>(string path) where T : Object
    {
        var asset = AssetDatabase.LoadAssetAtPath<T>(path);
        if (asset == null) throw new FileNotFoundException($"[Talk] Không load được {typeof(T).Name} ở {path}");
        return asset;
    }

    static Material Mat(string assetName) => LoadAsset<Material>($"{RenderingFolder}/{assetName}.mat");

    static void EnsureConfig()
    {
        var config = AssetDatabase.LoadAssetAtPath<PlayerConfig>(ConfigPath);
        if (config == null)
        {
            config = ScriptableObject.CreateInstance<PlayerConfig>();
            AssetDatabase.CreateAsset(config, ConfigPath);
        }
        config.startCoins = 100;
        EditorUtility.SetDirty(config);
        AssetDatabase.SaveAssetIfDirty(config);
    }

    static GameObject EnsurePrefabs(Material playerMaterial, Material swordMaterial)
    {
        var sword = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        sword.name = "Sword";
        sword.transform.localScale = new Vector3(0.15f, 0.8f, 0.15f);
        sword.GetComponent<Renderer>().sharedMaterial = swordMaterial;
        var swordPrefab = PrefabUtility.SaveAsPrefabAsset(sword, $"{PrefabsFolder}/Sword.prefab");
        Object.DestroyImmediate(sword);

        var player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        player.name = "Player";
        player.GetComponent<Renderer>().sharedMaterial = playerMaterial;
        var stats = player.AddComponent<PlayerStats>();
        stats.weapon = swordPrefab;
        stats.speed = 7.5f;
        stats.hiddenButSaved = 42;
        var playerPrefab = PrefabUtility.SaveAsPrefabAsset(player, $"{PrefabsFolder}/Player.prefab");
        Object.DestroyImmediate(player);
        return playerPrefab;
    }

    #endregion

    #region Scenes

    static Scene NewDemoScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
        var camera = Camera.main;
        if (camera != null)
        {
            camera.transform.SetPositionAndRotation(new Vector3(0f, 1.5f, -10f), Quaternion.Euler(4f, 0f, 0f));
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.11f, 0.12f, 0.15f);
        }
        return scene;
    }

    static T AddDemo<T>(string objectName) where T : Component => new GameObject(objectName).AddComponent<T>();

    static GameObject Primitive(PrimitiveType type, string objectName, Vector3 position, Material material)
    {
        var go = GameObject.CreatePrimitive(type);
        go.name = objectName;
        go.transform.position = position;
        go.GetComponent<Renderer>().sharedMaterial = material;
        return go;
    }

    static void Set(Object target, string property, Object value)
    {
        var so = new SerializedObject(target);
        var prop = so.FindProperty(property);
        if (prop == null) throw new ArgumentException($"{target.GetType().Name} không có field '{property}'");
        // an asset reimported mid-build turns the held reference into a fake null and the scene would save {fileID: 0}
        if (value == null) throw new ArgumentNullException(property, $"Giá trị gán cho {target.GetType().Name}.{property} đang null");
        prop.objectReferenceValue = value;
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    static void Save(Scene scene, int index) => EditorSceneManager.SaveScene(scene, ScenePath(SceneNames[index]));

    static void BuildFakeNull()
    {
        var scene = NewDemoScene();
        Material red = Mat("Talk_Red"), green = Mat("Talk_Green");
        var demo = AddDemo<FakeNullDemo>("FakeNullDemo");
        var parent = new GameObject("Enemies").transform;
        parent.position = new Vector3(0f, 1.5f, 0f);
        Set(demo, "enemyMaterial", red);
        Set(demo, "backupMaterial", green);
        Set(demo, "enemyParent", parent);
        Save(scene, 0);
    }

    static void BuildNativeCost()
    {
        var scene = NewDemoScene();
        var blue = Mat("Talk_Blue");
        var demo = AddDemo<NativeCostDemo>("NativeCostDemo");
        demo.gameObject.tag = "Player";
        var body = demo.gameObject.AddComponent<Rigidbody>();
        body.isKinematic = true;
        body.useGravity = false;
        var mover = Primitive(PrimitiveType.Sphere, "Mover", new Vector3(0f, 2.5f, 0f), blue);
        new GameObject("Target");
        Set(demo, "mover", mover.transform);
        Save(scene, 1);
    }

    static void BuildPlayerLoop()
    {
        var scene = NewDemoScene();
        Material red = Mat("Talk_Red"), green = Mat("Talk_Green");
        var demo = AddDemo<PlayerLoopDemo>("PlayerLoopDemo");
        var scaled = Primitive(PrimitiveType.Cube, "Xoay theo deltaTime", new Vector3(-1.1f, 2.5f, 0f), red);
        var unscaled = Primitive(PrimitiveType.Cube, "Xoay theo unscaledDeltaTime", new Vector3(1.1f, 2.5f, 0f), green);
        Set(demo, "scaledCube", scaled.transform);
        Set(demo, "unscaledCube", unscaled.transform);
        Save(scene, 2);
    }

    static void BuildLifetime()
    {
        var scene = NewDemoScene();
        var yellow = Mat("Talk_Yellow");
        var demo = AddDemo<LifetimeDemo>("LifetimeDemo");
        Set(demo, "workerMaterial", yellow);
        Save(scene, 3);
    }

    static void BuildSerialization()
    {
        var scene = NewDemoScene();
        var config = LoadAsset<PlayerConfig>(ConfigPath);
        var playerPrefab = LoadAsset<GameObject>(PlayerPrefabPath);
        var demo = AddDemo<SerializationDemo>("SerializationDemo");
        var player = (GameObject)PrefabUtility.InstantiatePrefab(playerPrefab);
        player.transform.position = new Vector3(0f, 1.5f, 0f);
        var stats = player.GetComponent<PlayerStats>();
        stats.notSaved = 42;

        var book = AddDemo<SkillBook>("SkillBook");
        book.plainSkills.Clear();
        book.plainSkills.Add(new FireSkill { name = "Fire", damage = 10 });
        book.referenceSkills.Clear();
        book.referenceSkills.Add(new FireSkill { name = "Fire", damage = 10 });
        book.plainEmptySlot = null;
        book.referenceEmptySlot = null;
        EditorUtility.SetDirty(book);

        Set(demo, "player", stats);
        Set(demo, "config", config);
        Set(demo, "skillBook", book);
        Save(scene, 4);
    }

    static void BuildGarbageCollector()
    {
        var scene = NewDemoScene();
        AddDemo<GcDemo>("GcDemo");
        Save(scene, 5);
    }

    static void BuildRendering()
    {
        var scene = NewDemoScene();
        var white = Mat("Talk_White");
        var demo = AddDemo<RenderingDemo>("RenderingDemo");
        var grid = new GameObject("Grid").transform;
        grid.position = new Vector3(-1.7f, -0.5f, 0f);
        Set(demo, "baseMaterial", white);
        Set(demo, "gridRoot", grid);
        Save(scene, 6);
    }

    static void BuildEnterPlayMode()
    {
        var scene = NewDemoScene();
        AddDemo<EnterPlayModeDemo>("EnterPlayModeDemo");
        AddDemo<PingListenerBad>("Listener A");
        AddDemo<PingListenerGood>("Listener B");
        Save(scene, 7);
    }

    #endregion
}
