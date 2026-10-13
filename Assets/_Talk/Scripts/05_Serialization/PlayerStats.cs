using System;
using UnityEngine;

public class PlayerStats : MonoBehaviour
{
    public float speed = 5f;
    public GameObject weapon;
    [HideInInspector] public int hiddenButSaved;
    [NonSerialized] public int notSaved;
}
