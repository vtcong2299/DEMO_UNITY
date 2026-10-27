const { H1, callout, image, item, demo, deep, seeAlso, summary, table } = require('./lib');

module.exports = function part3() {
  const C = [];
  C.push(H1('Phần 3. Unity lưu dữ liệu thế nào (Serialization)'));
  C.push(...callout('Ý chính của phần', 'Mọi thứ trong Inspector, prefab, scene, ScriptableObject đều được Unity **serialize**: chuyển thành văn bản YAML để lưu xuống file. Hiểu luật serialize sẽ giải thích lỗi mất dữ liệu, mất reference và “sửa code mà game không đổi”.', 'key'));

  C.push(...item({
    title: '3.1 Giá trị trong Inspector luôn thắng giá trị trong code', level: 'co_ban',
    situation: 'Tăng tốc độ nhân vật từ 5 lên 10 để cân bằng game.',
    bad: `public class Player : MonoBehaviour
{
    public float speed = 5f;   // sửa thành 10f, lưu lại... nhân vật vẫn chạy tốc độ 5
}`,
    api: [
      ['`public float speed = 5f;`', 'Khai báo field kèm **giá trị khởi tạo** (field initializer).', 'Chỉ có tác dụng khi component **mới** được tạo.'],
      ['Menu ⋮ → **Reset** của component', 'Đưa mọi field về giá trị khởi tạo trong code.', 'Mất mọi giá trị đã chỉnh trong Inspector.'],
    ],
    truth: [
      'Thứ tự khi load: Unity tạo object (lúc này `speed` = giá trị trong code), **rồi ghi đè** bằng giá trị đã lưu trong prefab/scene.',
      'Giá trị trong code chỉ được dùng khi component **mới được thêm vào**, hoặc khi bấm **Reset**.',
    ],
    effect: 'Đổi số cân bằng trong code nhưng prefab cũ vẫn giữ số cũ. Rất dễ tưởng code bị lỗi.',
    good: `// Đổi giá trị trong Inspector của prefab, hoặc
// đưa số liệu cân bằng ra một ScriptableObject config dùng chung cho mọi prefab.`,
    compare: [
      ['Sửa giá trị khởi tạo trong code', 'Thấy ngay trong code review.', 'Không ảnh hưởng prefab/scene đã có.', 'Chỉ đúng cho component tạo mới.'],
      ['Sửa trong Inspector của prefab', 'Có hiệu lực ngay cho mọi instance chưa override.', 'Khó review qua code; dễ sót instance đã override.', 'Chỉnh số cho một loại object.'],
      ['ScriptableObject config dùng chung', 'Một chỗ sửa cho nhiều prefab; designer tự chỉnh được.', 'Thêm một asset để quản lý.', 'Số cân bằng dùng ở nhiều nơi.'],
    ],
    remember: 'Số cân bằng nằm ở **prefab/asset**, không ở giá trị khởi tạo trong code.',
  }));

  C.push(...item({
    title: '3.2 Đổi tên field là mất dữ liệu', level: 'co_ban',
    situation: 'Đổi tên `spd` thành `moveSpeed` cho dễ đọc.',
    bad: `public float spd;   // đổi tên thành moveSpeed → mọi giá trị đã gán trong Inspector về 0`,
    api: [
      ['`[FormerlySerializedAs("spd")]`', 'Báo Unity: field này trước đây tên là `spd`, hãy đọc dữ liệu cũ từ khoá đó.', 'Namespace `UnityEngine.Serialization`.'],
    ],
    truth: 'File YAML lưu theo **tên field** (`spd: 7.5`). Đổi tên thì Unity không tìm thấy khoá cũ, field mới nhận giá trị mặc định.',
    good: `using UnityEngine.Serialization;

[FormerlySerializedAs("spd")]
public float moveSpeed;   // Unity đọc giá trị cũ từ khoá "spd"`,
    notes: [['Khi nào bỏ attribute', 'Giữ `FormerlySerializedAs` tới khi mọi prefab/scene đã được lưu lại với tên mới (mở và lưu lại, hoặc menu **Assets → Force Reserialize Assets**).', 'info']],
    remember: 'Đổi tên field đã serialize: thêm **`[FormerlySerializedAs("tênCũ")]`**.',
  }));

  C.push(...item({
    title: '3.3 public, [SerializeField], [HideInInspector] và [NonSerialized]', level: 'trung_binh',
    situation: 'Muốn một field hiện trong Inspector nhưng code khác không sửa được; muốn một field không bị lưu.',
    api: [
      ['`public`', 'Field ai cũng đọc/ghi được; Unity tự serialize.', 'Lộ field ra ngoài chỉ để hiện Inspector là phá đóng gói.'],
      ['`[SerializeField] private`', 'Field private nhưng vẫn hiện Inspector và được lưu.', 'Cách khuyến nghị cho field chỉnh trong Inspector.'],
      ['`[HideInInspector]`', 'Ẩn field khỏi Inspector.', '**Vẫn được lưu**. Không ai thấy giá trị cũ nằm đó.'],
      ['`[NonSerialized]`', 'Không serialize field (dù là public).', 'Không lưu, không hiện.'],
      ['Property `{ get; set; }`', 'Thuộc tính C#.', 'Unity không serialize property (trừ `[field: SerializeField]`).'],
    ],
    extra: table(['Khai báo', 'Hiện trong Inspector', 'Được lưu', 'Code khác truy cập'], [
      ['`public int a;`', 'Có', 'Có', 'Có'],
      ['`[SerializeField] private int a;`', 'Có', 'Có', '**Không**'],
      ['`[HideInInspector] public int a;`', 'Không', '**Vẫn có**', 'Có'],
      ['`[NonSerialized] public int a;`', 'Không', 'Không', 'Có'],
      ['`private int a;`', 'Không', 'Không', 'Không'],
      ['`public int A { get; set; }`', 'Không', 'Không', 'Có'],
    ], [34, 18, 22, 26]),
    compare: [
      ['`[HideInInspector]`', 'Ẩn khỏi Inspector nhưng vẫn giữ dữ liệu.', 'Giá trị cũ vẫn bị lưu và ghi đè giá trị trong code mà không ai thấy.', 'Dữ liệu cần lưu nhưng không cho chỉnh tay.'],
      ['`[NonSerialized]`', 'Chắc chắn không lưu; luôn lấy giá trị trong code.', 'Mất giá trị khi reload/vào Play.', 'Dữ liệu chỉ dùng lúc chạy.'],
    ],
    remember: 'Muốn hiện Inspector: **`[SerializeField] private`**. Muốn **không lưu**: **`[NonSerialized]`**, không phải `[HideInInspector]`.',
  }));

  C.push(...item({
    title: '3.4 Reference là GUID + fileID: vì sao bị “Missing”', level: 'trung_binh',
    situation: 'Chuyển thư mục asset bằng Explorer, hoặc kéo code từ Git về thì reference thành “Missing”.',
    api: [
      ['File `.meta`', 'File đi kèm mỗi asset, chứa **GUID** (mã định danh duy nhất) và cài đặt import.', 'Phải luôn commit cùng asset.'],
      ['`{fileID: …, guid: …}`', 'Cách prefab/scene ghi một reference: GUID của file asset + fileID của object bên trong.', 'Không ghi tên hay đường dẫn.'],
      ['`AssetDatabase.AssetPathToGUID(path)`', 'Lấy GUID của một asset theo đường dẫn (chỉ trong Editor).', 'Dùng trong demo 05 để hiển thị GUID.'],
      ['Asset Serialization = Force Text', 'Cài đặt lưu asset dạng văn bản (Project Settings → Editor).', 'Cần để đọc và merge được prefab/scene trên Git.'],
    ],
    extra: image('guid', 620, 'Hình 4. Prefab lưu reference bằng GUID của asset (nằm trong file .meta) và fileID của object bên trong'),
    truth: 'Đổi tên hoặc chuyển thư mục **bên trong Unity** thì file `.meta` đi theo, GUID giữ nguyên. Chuyển bằng Explorer mà quên `.meta`, hoặc quên commit `.meta`, thì Unity tạo GUID mới và mọi reference cũ thành **Missing**.',
    good: `// 1. Luôn di chuyển / đổi tên asset bên trong Unity (cửa sổ Project).
// 2. Luôn commit file .meta cùng file asset.
// 3. Project Settings → Editor → Asset Serialization = Force Text.`,
    remember: 'Reference đi theo **GUID trong .meta**: di chuyển asset trong Unity và **luôn commit .meta**.',
  }));

  C.push(...item({
    title: '3.5 Những thứ serializer của Unity không làm được', level: 'nang_cao',
    situation: 'Nhân vật có danh sách kỹ năng, mỗi loại kỹ năng có thêm dữ liệu riêng.',
    bad: `[Serializable] public class Skill { public string name; }
[Serializable] public class FireSkill : Skill { public int damage; }

public class Hero : MonoBehaviour
{
    public List<Skill> skills = new() { new FireSkill { name = "Fire", damage = 10 } };
    // Sau khi lưu và load lại: phần tử thành Skill thường, mất damage
}`,
    api: [
      ['`[Serializable]`', 'Cho phép Unity lưu một class/struct C# thường (lưu “nhúng” vào object chứa nó).', 'Lưu theo **kiểu khai báo**, không theo kiểu thật.'],
      ['`[SerializeReference]`', 'Lưu field theo **tham chiếu**, ghi cả kiểu thật của object.', 'Giữ được đa hình và null. Inspector mặc định chưa có nút chọn kiểu con.'],
      ['`ISerializationCallbackReceiver`', 'Interface cho class tự xử lý trước/sau khi Unity lưu.', '`OnBeforeSerialize()` chạy trước khi lưu, `OnAfterDeserialize()` chạy sau khi load.'],
      ['`Dictionary<K, V>`', 'Bảng tra khoá → giá trị của C#.', 'Unity **không** serialize Dictionary.'],
    ],
    truth: [
      '**Không lưu đa hình:** field kiểu `Skill` chỉ lưu field của `Skill`. Object kiểu con bị “cắt” thành kiểu cha.',
      '**Không lưu null cho class thường:** field class `[Serializable]` đang null, sau khi load lại thành **object rỗng**, nên `if (data == null)` không bao giờ đúng.',
      '**Không lưu:** `Dictionary`, property, field `static`, `readonly`, interface, mảng nhiều chiều. Lồng nhau tối đa khoảng 10 cấp.',
    ],
    good: `// Đa hình và null: [SerializeReference]
[SerializeReference] public List<Skill> skills = new();

// Dictionary: tự chuyển sang 2 list khi lưu
public class PriceTable : MonoBehaviour, ISerializationCallbackReceiver
{
    [SerializeField] List<string> keys = new();
    [SerializeField] List<int> values = new();
    public Dictionary<string, int> Prices = new();

    public void OnBeforeSerialize()          // trước khi Unity lưu
    {
        keys.Clear(); values.Clear();
        foreach (var kv in Prices) { keys.Add(kv.Key); values.Add(kv.Value); }
    }

    public void OnAfterDeserialize()         // sau khi Unity load
    {
        Prices = new Dictionary<string, int>();
        for (int i = 0; i < Mathf.Min(keys.Count, values.Count); i++) Prices[keys[i]] = values[i];
    }
}`,
    compare: [
      ['`[Serializable]` thường (lưu nhúng)', 'Inspector hiển thị và chỉnh dễ; nhẹ.', 'Mất kiểu con; null thành object rỗng.', 'Dữ liệu một kiểu cố định.'],
      ['`[SerializeReference]`', 'Giữ đa hình, giữ null, chia sẻ được cùng object.', 'Inspector không có sẵn nút chọn kiểu con; file nặng hơn chút.', 'Danh sách nhiều loại con (skill, item, hiệu ứng).'],
    ],
    remember: 'Cần **đa hình hoặc null**: `[SerializeReference]`. Cần **Dictionary**: tự chuyển qua 2 list.',
  }));

  C.push(...item({
    title: '3.6 Sửa ScriptableObject khi đang Play là sửa luôn file asset', level: 'nang_cao',
    situation: 'Dùng ScriptableObject `PlayerConfig` để lưu số coin ban đầu.',
    bad: `[CreateAssetMenu] public class PlayerConfig : ScriptableObject { public int startCoins = 100; }

public class Wallet : MonoBehaviour
{
    [SerializeField] PlayerConfig config;
    public void Earn(int v) => config.startCoins += v;   // dùng config như biến runtime
}`,
    api: [
      ['`ScriptableObject`', 'Class lưu dữ liệu dạng **asset** (file .asset), dùng chung cho nhiều object.', 'Là asset, không phải dữ liệu riêng của từng lần chơi.'],
      ['`[CreateAssetMenu]`', 'Thêm mục vào menu Assets → Create để tạo asset loại này.', '-'],
      ['`Instantiate(config)`', 'Tạo **bản sao** của một object (kể cả ScriptableObject).', 'Bản sao sống trong bộ nhớ; nên Destroy khi không dùng nữa.'],
    ],
    truth: [
      'Trong **Editor**, code đang sửa trực tiếp object asset trong bộ nhớ: thoát Play mode giá trị **không quay về**, và sẽ được ghi xuống file khi project được lưu.',
      'Trên **bản build** thì ngược lại: mỗi lần mở game lại về giá trị gốc.',
    ],
    effect: 'Bug kinh điển “config tự đổi”: test vài lần trong Editor, `startCoins` thành 2500 và bị commit lên Git. Bản build lại chạy đúng, nên càng khó hiểu.',
    good: `// Cách 1: tách cấu hình (chỉ đọc) và dữ liệu runtime
int _coins;
void Awake() => _coins = config.startCoins;

// Cách 2: cần sửa cả object → làm việc trên bản sao
PlayerConfig _runtime;
void Awake() => _runtime = Instantiate(config);
void OnDestroy() => Destroy(_runtime);`,
    compare: [
      ['Sửa thẳng ScriptableObject', 'Ít code.', 'Editor ghi đè file asset; build lại không giữ.', 'Không nên cho dữ liệu runtime.'],
      ['Copy giá trị ra biến', 'Đơn giản, rõ ràng, không đụng asset.', 'Phải copy từng field cần dùng.', 'Chỉ cần vài giá trị.'],
      ['`Instantiate(config)`', 'Có nguyên một object để sửa thoải mái.', 'Thêm một object trong bộ nhớ, cần Destroy.', 'Cần sửa nhiều field.'],
    ],
    remember: 'ScriptableObject là **dữ liệu cấu hình chỉ đọc**. Dữ liệu lúc chơi: **copy ra** hoặc **Instantiate bản sao**.',
  }));

  C.push(...deep('3.7 Phân tích sâu: prefab chỉ lưu phần khác biệt', [
    'Đặt một prefab vào scene, scene **không** lưu lại toàn bộ object. Nó chỉ lưu GUID của prefab và một danh sách **override** (`m_Modifications`): field nào khác prefab gốc, giá trị bao nhiêu.',
    [
      'Sửa prefab gốc thì mọi instance đổi theo, **trừ** field đã bị override (Inspector tô đậm, có vạch xanh bên trái).',
      'Lỡ override một field làm instance “không ăn” thay đổi của prefab gốc. Chuột phải field → **Revert** để bỏ.',
      'Prefab Variant cũng là prefab chỉ lưu override so với prefab cha.',
    ],
    'Serializer chỉ lưu field thoả **cùng lúc**: `public` hoặc `[SerializeField]`; không `static`, `const`, `readonly`; kiểu được hỗ trợ (kiểu nguyên thuỷ, enum, string, struct của Unity như Vector3/Color, `UnityEngine.Object`, class/struct `[Serializable]`, mảng hoặc `List<T>` của các kiểu đó).',
  ]));
  C.push(...seeAlso('3.8 Những chỗ Unity lưu theo TÊN, đổi tên là hỏng', [
    ['`UnityEvent` (Button.onClick gán trong Inspector)', 'Lưu **tên hàm dạng chuỗi** + object đích. Đổi tên hàm: listener mất âm thầm, không lỗi compile.', 'Gán listener bằng code, hoặc rà lại Inspector sau khi đổi tên.'],
    ['`[field: SerializeField]` trên auto-property', 'Tên lưu thật là `<Hp>k__BackingField`.', 'Đổi tên property phải dùng `[FormerlySerializedAs("<Hp>k__BackingField")]`.'],
    ['Tham số/state của Animator', 'Code gọi bằng chuỗi; Animator đổi tên thì code vẫn compile.', 'Gom tên vào hằng số + `Animator.StringToHash`.'],
    ['`Resources.Load("UI/Popup")`', 'Tìm asset theo đường dẫn chuỗi lúc chạy.', 'Kéo thả reference hoặc Addressables.'],
    ['`SendMessage("Die")`, `Invoke("Spawn", 1f)`', 'Gọi hàm bằng tên qua reflection: chậm và vỡ khi đổi tên.', 'Gọi trực tiếp, event, coroutine.'],
    ['`JsonUtility.ToJson/FromJson`', 'Dùng **đúng luật** của serializer Unity: không Dictionary, không property, không đa hình (trừ `[SerializeReference]`).', 'Cần linh hoạt hơn: Newtonsoft (xem 6.2 về stripping).'],
  ]));

  C.push(...demo({
    title: 'Unity lưu dữ liệu thế nào?', scene: '05_Serialization', slide: null, script: '05_Serialization/SerializationDemo.cs',
    goal: 'chứng minh Inspector thắng code, ScriptableObject bị ghi đè, serializer cắt kiểu con, và reference là GUID.',
    prepare: ['Cài Rider hoặc VS Code làm **External Script Editor** (Edit → Preferences → External Tools) để mở file .prefab ở bước 6–7.'],
    steps: [
      ['Bấm Play, bấm **1 · Xem giá trị trong code và trong prefab**.', '`speed viết trong code` = **5**; `speed trong prefab Player` = **7.5** (xanh: giá trị game thật sự dùng); `[HideInInspector] hiddenButSaved` = **42** (đỏ); `[NonSerialized] notSaved` = **0** (xanh).', 'Lúc dựng scene cả hai được gán 42: chỉ field được serialize còn giữ (3.3).'],
      ['Bấm **2 · +100 vào asset (cách sai)** 2–3 lần.', 'Dòng “config.startCoins (file asset)” tăng 200, 300… (đỏ).', 'Đang sửa thẳng asset.'],
      ['Bấm **Stop**. Trong cửa sổ Project chọn `Assets/_Talk/Data/PlayerConfig.asset`, xem Inspector.', '`Start Coins` vẫn là **200/300…**, không quay về 100.', 'ScriptableObject bị ghi đè (3.6).'],
      ['Play lại, bấm **3 · +100 vào bản sao Instantiate (cách đúng)** vài lần.', 'Dòng “bản sao = …” tăng, “asset = …” giữ nguyên.', 'Làm việc trên bản sao.'],
      ['Bấm **4 · Xem kiểu của Skill sau khi load**.', '`List<Skill> thường [0]` = **Skill (mất kiểu con, mất damage)** (đỏ); `[SerializeReference]` = **FireSkill (damage = 10)** (xanh); Skill thường gán null = **object rỗng** (đỏ); SerializeReference gán null = **null** (xanh).', 'Giới hạn của serializer (3.5).'],
      ['Bấm **5 · Mở Player.prefab dạng text**.', 'Rider/VS Code mở file. Tìm dòng `weapon: {fileID: …, guid: …}`.', 'Prefab là văn bản YAML.'],
      ['Bấm **Mở Sword.prefab.meta**, so `guid` với dòng weapon và với dòng “GUID của Sword.prefab” trên màn hình.', 'Ba giá trị **giống hệt nhau**.', 'Reference = GUID (3.4).'],
      ['Bấm **Đặt lại asset = 100**.', '“config.startCoins” = 100.', 'Bắt buộc làm sau khi test.'],
    ],
    after: [['Thử thêm (ngoài Play mode)', 'Mở `PlayerStats.cs`, đổi `speed = 5f` thành `10f`, lưu, quay lại Unity: prefab Player vẫn **7.5**. Chuột phải component PlayerStats trên prefab → **Reset**: thành **10** (3.1). Nhớ đổi lại sau khi thử.', 'info']],
  }));

  C.push(...summary(3, [
    ['Chỉnh số cân bằng', 'Sửa ở prefab/Inspector hoặc ScriptableObject config.', 'Sửa giá trị khởi tạo trong code rồi mong prefab đổi theo.'],
    ['Đổi tên field đã lưu', '`[FormerlySerializedAs("tênCũ")]`.', 'Đổi tên trần.'],
    ['Field chỉnh trong Inspector', '`[SerializeField] private`.', '`public` chỉ để hiện Inspector.'],
    ['Field không muốn lưu', '`[NonSerialized]`.', '`[HideInInspector]` (vẫn lưu).'],
    ['Di chuyển asset', 'Trong cửa sổ Project của Unity; commit `.meta`.', 'Kéo thả bằng Explorer; quên commit `.meta`.'],
    ['Danh sách nhiều kiểu con / cần null', '`[SerializeReference]`.', '`List<Base>` thường chứa kiểu con.'],
    ['Dictionary cần lưu', '`ISerializationCallbackReceiver` + 2 list.', 'Mong Unity tự lưu Dictionary.'],
    ['Dữ liệu lúc chơi lấy từ config', 'Copy giá trị ra, hoặc `Instantiate(config)`.', 'Sửa thẳng ScriptableObject.'],
  ]));
  return C;
};
