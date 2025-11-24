import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import json
import pickle

# ==========================
#  LOAD DATASET
# ==========================
df = pd.read_csv("large_symptom_disease_dataset.csv")

if "disease" not in df.columns:
    raise ValueError("❌ ERROR: 'disease' column not found in dataset!")

X = df.drop("disease", axis=1)
y = df["disease"]

# ==========================
#  TRAIN / TEST SPLIT
# ==========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ==========================
#  TRAIN MODEL
# ==========================
model = RandomForestClassifier(n_estimators=300, random_state=42)
model.fit(X_train, y_train)

# Store feature names
model.feature_names_in_ = list(X.columns)

# ==========================
#  SAVE MODEL
# ==========================
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

print("✅ model.pkl saved!")


# =========================================
#  AUTO-GENERATE MEDICAL INFO FOR EACH DISEASE
# =========================================

SPECIALIST_MAP = {
    "fever": "General Physician",
    "cough": "Pulmonologist",
    "vomiting": "Gastroenterologist",
    "diarrhea": "Gastroenterologist",
    "rash": "Dermatologist",
    "headache": "Neurologist",
    "chest_pain": "Cardiologist",
    "joint_pain": "Orthopedic Surgeon",
    "shortness_of_breath": "Pulmonologist",
}

BASE_DESCRIPTION = {
    "general": "This condition may be caused by infection, inflammation, or lifestyle factors. Early detection and proper management can prevent complications.",
    "fever": "Fever is usually a sign of infection or inflammation in the body.",
    "cough": "Cough is commonly caused by respiratory infections, allergies, or irritants.",
    "vomiting": "Vomiting may occur due to food poisoning, stomach infection, or gastritis.",
    "diarrhea": "Diarrhea may result from infections, contaminated food, or digestive disorders.",
    "rash": "Skin rashes may be triggered by infections, allergies, or irritants.",
    "chest_pain": "Chest pain may be linked to cardiac or respiratory issues and requires careful evaluation."
}

MEDICINE_MAP = {
    "fever": ["Paracetamol 500 mg", "ORS"],
    "cough": ["Dextromethorphan", "Guaifenesin"],
    "vomiting": ["ORS", "Probiotics", "Ondansetron (if severe)"],
    "diarrhea": ["ORS", "Zinc tablets", "Probiotics"],
    "rash": ["Calamine lotion", "Cetirizine"],
    "headache": ["Paracetamol", "Ibuprofen"],
    "chest_pain": ["Immediate medical review required"],
}

ACTIONS_MAP = {
    "mild": ["Rest well", "Stay hydrated", "Monitor symptoms"],
    "moderate": ["Consult a doctor", "Take prescribed medicines", "Avoid physical strain"],
    "severe": ["Seek urgent medical care", "Call emergency services"]
}

# ----------------------------
# Extract all diseases
# ----------------------------
unique_diseases = sorted(df["disease"].unique())

disease_info = {}

for d in unique_diseases:

    # pick 1 best symptom keyword to map to specialist
    key = "general"
    for symptom in SPECIALIST_MAP.keys():
        if symptom in d.lower():
            key = symptom
            break

    disease_info[d] = {
        "description": BASE_DESCRIPTION.get(key, BASE_DESCRIPTION["general"]),
        "medicines": MEDICINE_MAP.get(key, ["Consult a doctor"]),
        "specialist": SPECIALIST_MAP.get(key, "General Physician"),
        "triage": "GENERAL_ADVICE",
        "actions": ACTIONS_MAP["mild"]
    }

# SAVE JSON
with open("disease_info.json", "w") as f:
    json.dump(disease_info, f, indent=4)

print("📁 disease_info.json created with", len(disease_info), "diseases!")
print("🎉 Training pipeline completed successfully.")
