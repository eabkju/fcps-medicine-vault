/**
 * Sample Demo Questions for initial preview when no folder is yet loaded
 */
export const DEMO_DATA = {
  topics: [
    {
      num: "01",
      title: "Clinical Decision-Making",
      count: 4,
      bankCounts: { GENESIS: 2, BCPS_FCPS: 1, MHS: 1 },
      formatCounts: { MCQ: 2, SBA: 2 }
    },
    {
      num: "25",
      title: "Cardiovascular Disease",
      count: 3,
      bankCounts: { GENESIS: 2, MHS: 1 },
      formatCounts: { MCQ: 1, SBA: 2 }
    },
    {
      num: "07",
      title: "Poisoning & Toxicology",
      count: 3,
      bankCounts: { GENESIS: 2, BCPS_FCPS: 1 },
      formatCounts: { MCQ: 2, SBA: 1 }
    }
  ],
  questions: [
    {
      id: "DEMO_GENESIS_MCQ_01_1",
      topicNum: "01",
      topicTitle: "Clinical Decision-Making",
      bank: "GENESIS",
      format: "MCQ",
      fileName: "[GENESIS]_16_MCQ_Toxicology_Acute_and_Basic_Sciences.txt",
      qNum: 1,
      stem: "Which of the following are characteristics of Type 2 thinking?",
      options: [
        { letter: "A", text: "Analytical and deliberative", val: "True" },
        { letter: "B", text: "Systematic and rule-based", val: "True" },
        { letter: "C", text: "Effortless and automatic", val: "False" },
        { letter: "D", text: "High/consistent cognitive reliability", val: "True" },
        { letter: "E", text: "Subconscious intuition", val: "False" }
      ],
      correctOption: null,
      officialKeys: "A: True, B: True, C: False, D: True, E: False",
      explanation: "[Ref: Davidson's Principles and Practice of Medicine 24th/P-7]\nType 1 thinking is fast, intuitive, subconscious, and effortless, but prone to cognitive bias. Type 2 thinking is slow, analytical, methodical, deliberate, and carries high reliability.",
      provenance: "GENESIS Online Exam Archive (Clinical Decision-Making Master Series)"
    },
    {
      id: "DEMO_BCPS_SBA_01_2",
      topicNum: "01",
      topicTitle: "Clinical Decision-Making",
      bank: "BCPS_FCPS",
      format: "SBA",
      fileName: "[BCPS_FCPS]_01_SBA_Comprehensive_Recalls_All_Chapters.txt",
      qNum: 2,
      stem: "A 17-year-old girl presents with primary amenorrhoea. Clinical examination reveals normal breast development, absent or scanty axillary and pubic hair, and a blind-ending vagina. Chromosomal karyotype shows 46,XY. What is the most likely diagnosis?",
      options: [
        { letter: "A", text: "Complete androgen insensitivity syndrome (CAIS)", val: null },
        { letter: "B", text: "Müllerian agenesis (Mayer-Rokitansky-Küster-Hauser syndrome)", val: null },
        { letter: "C", text: "Turner syndrome", val: null },
        { letter: "D", text: "Polycystic ovary syndrome", val: null },
        { letter: "E", text: "Congenital adrenal hyperplasia", val: null }
      ],
      correctOption: "A",
      officialKeys: null,
      explanation: "High-Yield Clinical SBA Pearl: Complete androgen insensitivity syndrome (CAIS) presents with female external phenotype (due to peripheral aromatisation of testosterone to oestrogen), 46,XY karyotype, normal breast development, scanty pubic/axillary hair, and a blind vagina with absent uterus.",
      provenance: "BCPS Past Papers (Endocrinology & Genetics Module)"
    },
    {
      id: "DEMO_GENESIS_SBA_25_1",
      topicNum: "25",
      topicTitle: "Cardiovascular Disease",
      bank: "GENESIS",
      format: "SBA",
      fileName: "[GENESIS]_01_SBA_Cardiovascular_and_Respiratory.txt",
      qNum: 1,
      stem: "A 78-year-old man with non-valvular atrial fibrillation and severe chronic kidney disease (eGFR 18 mL/min/1.73m²) presents for anticoagulation review. He has no history of active bleeding. Which of the following is the most appropriate anticoagulant?",
      options: [
        { letter: "A", text: "Dabigatran", val: null },
        { letter: "B", text: "Rivaroxaban", val: null },
        { letter: "C", text: "Apixaban", val: null },
        { letter: "D", text: "Warfarin with regular INR monitoring", val: null },
        { letter: "E", text: "Edoxaban", val: null }
      ],
      correctOption: "D",
      officialKeys: null,
      explanation: "Memory Pearl:\nSevere CKD (eGFR < 15-30 mL/min) → Direct Oral Anticoagulants (DOACs) are either contraindicated or require extreme caution due to renal clearance → Warfarin (with target INR 2.0-3.0) remains the standard choice.",
      provenance: "Genesis (Chapter 25: Principles of management of cardiovascular disease)"
    },
    {
      id: "DEMO_MHS_MCQ_25_2",
      topicNum: "25",
      topicTitle: "Cardiovascular Disease",
      bank: "MHS",
      format: "MCQ",
      fileName: "[MHS]_02_MCQ_Cardiovascular_and_Respiratory.txt",
      qNum: 2,
      stem: "Regarding the autonomic nerve supply to the cardiovascular system, which of the following statements are true?",
      options: [
        { letter: "A", text: "Sympathetic stimulation increases sinoatrial node automaticity", val: "True" },
        { letter: "B", text: "Parasympathetic stimulation (Vagus nerve) exerts negative dromotropic effect on AV node", val: "True" },
        { letter: "C", text: "Ventricular myocardium is densely innervated by parasympathetic postganglionic fibers", val: "False" },
        { letter: "D", text: "Sympathetic postganglionic fibers predominantly release acetylcholine at vascular smooth muscle", val: "False" },
        { letter: "E", text: "Carotid sinus baroreceptor activation causes reflex bradycardia", val: "True" }
      ],
      correctOption: null,
      officialKeys: "A: True, B: True, C: False, D: False, E: True",
      explanation: "Ventricular myocardium has sparse parasympathetic innervation compared to atria and conduction nodes. Postganglionic sympathetic fibers release noradrenaline (norepinephrine).",
      provenance: "MHS Question Bank Archive (Autonomic Cardiovascular Physiology)"
    },
    {
      id: "DEMO_GENESIS_MCQ_07_1",
      topicNum: "07",
      topicTitle: "Poisoning & Toxicology",
      bank: "GENESIS",
      format: "MCQ",
      fileName: "[GENESIS]_16_MCQ_Toxicology_Acute_and_Basic_Sciences.txt",
      qNum: 1,
      stem: "Which of the following drugs exhibit a narrow therapeutic index (therapeutic index < 10)?",
      options: [
        { letter: "A", text: "Barbiturates", val: "False" },
        { letter: "B", text: "Opioids", val: "True" },
        { letter: "C", text: "Benzodiazepines", val: "False" },
        { letter: "D", text: "Phenytoin", val: "True" },
        { letter: "E", text: "Lithium", val: "True" }
      ],
      correctOption: null,
      officialKeys: "A: False, B: True, C: False, D: True, E: True",
      explanation: "[Ref: Davidson's Principles and Practice of Medicine 24th/P-16]\nDrugs with low therapeutic ratio require therapeutic drug monitoring. Examples include: Lithium, Digoxin, Theophylline, Phenytoin, Carbamazepine, Aminoglycosides, and Opioids.",
      provenance: "GENESIS Online Exam Archive (Toxicology and Pharmacology Core Batch)"
    }
  ]
};
