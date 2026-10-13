using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class Skill
{
    public string name;
}

[Serializable]
public class FireSkill : Skill
{
    public int damage;
}

public class SkillBook : MonoBehaviour
{
    public List<Skill> plainSkills = new();
    [SerializeReference] public List<Skill> referenceSkills = new();
    public Skill plainEmptySlot;
    [SerializeReference] public Skill referenceEmptySlot;
}
