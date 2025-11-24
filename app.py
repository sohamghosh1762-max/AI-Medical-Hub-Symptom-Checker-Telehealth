from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import traceback
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------
# PATHS
# ---------------------------------------------------
MODEL_PATH = "model.pkl"
INFO_PATH = "disease_info.json"
HISTORY_PATH = "triage_history.json"

# Create history file if missing
if not os.path.exists(HISTORY_PATH):
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump([], f)

# ---------------------------------------------------
# LOAD MODEL
# ---------------------------------------------------
model = None
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print("✅ MODEL LOADED SUCCESSFULLY!")
except Exception as e:
    print("❌ MODEL LOAD ERROR:", e)

# ---------------------------------------------------
# LOAD DISEASE INFO (from train_model.py output)
# ---------------------------------------------------
try:
    with open(INFO_PATH, "r", encoding="utf-8") as f:
        DISEASE_INFO = json.load(f)
    print("📘 disease_info.json loaded successfully!")
except:
    DISEASE_INFO = {}
    print("⚠️ disease_info.json NOT FOUND — fallback to minimal response")

# ---------------------------------------------------
# SAFE PREDICTION + TOP 3 CONFIDENCE
# ---------------------------------------------------
def model_predict(symptom_vector):
    try:
        arr = np.array(symptom_vector).reshape(1, -1)

        pred = model.predict(arr)[0]

        # --- Confidence scores ---
        probs = model.predict_proba(arr)[0]
        classes = list(model.classes_)

        top3 = sorted(
            zip(classes, probs),
            key=lambda x: x[1],
            reverse=True
        )[:3]

        top3_list = [
            {"name": d, "confidence": float(round(p, 4))}
            for d, p in top3
        ]

        return pred, top3_list

    except Exception as e:
        print("Prediction Error:", e)
        return "Unknown Condition", []

# ---------------------------------------------------
# TEXT → ONE-HOT FEATURES
# ---------------------------------------------------
def text_to_features(text):
    text = text.lower()
    features = getattr(model, "feature_names_in_", [])
    return [1 if feature.lower() in text else 0 for feature in features]

# ---------------------------------------------------
# HISTORY HANDLING
# ---------------------------------------------------
def read_history():
    try:
        with open(HISTORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def append_history(entry):
    h = read_history()
    h.insert(0, entry)
    h = h[:200]
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(h, f, indent=2, ensure_ascii=False)

# ---------------------------------------------------
# MAIN CHAT ENDPOINT
# ---------------------------------------------------
@app.route("/api/chat", methods=["POST"])
def api_chat():
    try:
        data = request.get_json() or {}
        text = (data.get("text") or "").strip().lower()

        if not text:
            return jsonify({"error": "Please enter symptoms"}), 400

        # Emergency red flags
        RED_FLAGS = ["chest pain", "unconscious", "not breathing", "severe bleeding"]
        if any(flag in text for flag in RED_FLAGS):
            return jsonify({
                "disease": None,
                "answer": "⚠️ EMERGENCY detected. Call ambulance immediately.",
                "triage": "URGENT",
                "reason": "Life-threatening symptoms detected.",
                "actions": ["Call emergency services NOW"],
                "medicine": [],
                "doctor": "Emergency Department",
                "top_diseases": []
            })

        # -------------------------
        # ML PREDICTION
        # -------------------------
        vec = text_to_features(text)

        if sum(vec) == 0:
            main_disease = "Unknown Condition"
            top3 = []
        else:
            main_disease, top3 = model_predict(vec)

        # -------------------------
        # Fetch from disease_info.json
        # -------------------------
        info = DISEASE_INFO.get(main_disease, {})
        description = info.get("description", f"No details available for '{main_disease}'.")
        medicines = info.get("medicines", [])
        doctor = info.get("specialist", "General Physician")
        triage = info.get("triage", "GENERAL_ADVICE")
        actions = info.get("actions", ["Rest well", "Hydrate", "Consult if worsens"])

        # -------------------------
        # Save query in history
        # -------------------------
        entry = {
            "id": datetime.utcnow().isoformat() + "Z",
            "text": text,
            "disease": main_disease,
            "doctor": doctor,
            "medicine": medicines,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        append_history(entry)

        # -------------------------
        # FINAL RETURN JSON
        # -------------------------
        return jsonify({
            "disease": main_disease,
            "answer": description,
            "description": description,
            "triage": triage,
            "reason": "Symptom evaluation completed.",
            "actions": actions,
            "medicine": medicines,
            "doctor": doctor,
            "top_diseases": top3,       # ⭐ includes TOP 3 DISEASES
            "history_id": entry["id"]
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Server Error"}), 500

# ---------------------------------------------------
# BASIC ROUTES
# ---------------------------------------------------
@app.route("/")
def welcome(): return render_template("welcome.html")

@app.route("/select_role")
def select_role(): return render_template("role_select.html")

@app.route("/home")
def home(): return render_template("index.html")

@app.route("/chatbot")
def chatbot(): return render_template("chatbot.html")

@app.route("/admin_login")
def admin_login(): return render_template("admin_login.html")

@app.route("/admin_dashboard")
def admin_dashboard(): return render_template("admin_dashboard.html")

@app.route("/appointment_management")
def appointment_management(): return render_template("appointment_management.html")

@app.route("/doctor_management")
def doctor_management(): return render_template("doctor_management.html")

@app.route("/admin_settings")
def admin_settings(): return render_template("admin_settings.html")

@app.route("/api/ping")
def api_ping():
    return jsonify({"status": "ok", "model_loaded": model is not None})

# ---------------------------------------------------
# RUN APP
# ---------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
