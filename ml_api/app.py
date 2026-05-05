"""
VerifyNews ML Microservice
Flask API wrapping a scikit-learn TF-IDF + Logistic Regression model
for fake news detection with confidence scores and explanations.
"""

import os
import re
import pickle
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

# ---------------------------------------------------------------------------
# Global model holder
# ---------------------------------------------------------------------------
model_data = None  # dict: {pipeline, label_encoder, feature_names}


def load_model():
    """Load a pre-trained model from disk. Fails if missing."""
    global model_data

    if not os.path.exists(MODEL_PATH):
        error_msg = "model.pkl is missing. Please run train.py to generate the model before starting the API."
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    try:
        with open(MODEL_PATH, "rb") as f:
            model_data = pickle.load(f)
        logger.info("Model loaded successfully from %s", MODEL_PATH)
    except Exception as e:
        logger.error("Failed to load model: %s", e)
        raise RuntimeError(f"Failed to load model.pkl: {e}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SUSPICIOUS_WORDS = [
    "shocking", "unbelievable", "exposed", "bombshell", "secret", "hoax",
    "scam", "conspiracy", "cover-up", "coverup", "wake up", "sheeple",
    "elite", "mainstream media", "fake", "urgent", "alert", "breaking",
    "deleted", "banned", "censored", "they don't want you to know",
    "doctors hate", "one weird trick", "you won't believe", "share before",
    "mind-blowing", "incredible", "amazing cure", "miracle",
]

CREDIBILITY_WORDS = [
    "according to", "study", "research", "published", "university",
    "professor", "peer-reviewed", "journal", "official", "confirmed",
    "report", "data", "statistics", "survey", "institute", "department",
    "spokesperson", "agency", "verified", "corroborated",
]


def highlight_sentences(text: str, label: str, threshold: float = 0.5) -> list:
    """Return sentences tagged as suspicious or credible."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    results = []

    for sent in sentences:
        if len(sent.strip()) < 10:
            continue
        sent_lower = sent.lower()
        susp_hits = [w for w in SUSPICIOUS_WORDS if w in sent_lower]
        cred_hits = [w for w in CREDIBILITY_WORDS if w in sent_lower]

        if susp_hits:
            tag = "suspicious"
            reason = f"Contains: {', '.join(susp_hits[:3])}"
        elif cred_hits:
            tag = "credible"
            reason = f"Contains: {', '.join(cred_hits[:3])}"
        else:
            tag = "neutral"
            reason = ""

        results.append({
            "text": sent.strip(),
            "tag": tag,
            "reason": reason,
        })

    return results


def get_top_influential_words(text: str, predicted_label: str, pipeline, label_encoder, feature_names: list, n: int = 5) -> list:
    """
    Return the top 5 words/bigrams contributing to the predicted label.
    """
    try:
        import numpy as np
        tfidf = pipeline.named_steps["tfidf"]
        clf = pipeline.named_steps["clf"]

        X = tfidf.transform([text])
        X_arr = X.toarray()[0]
        coef = clf.coef_[0]  # Positive values push towards 'real', negative towards 'fake'
        
        contributions = X_arr * coef
        
        if predicted_label == "fake":
            top_indices = np.argsort(contributions)[:n]
            top_words = [feature_names[i] for i in top_indices if contributions[i] < 0 and X_arr[i] > 0]
        else:
            top_indices = np.argsort(contributions)[::-1][:n]
            top_words = [feature_names[i] for i in top_indices if contributions[i] > 0 and X_arr[i] > 0]

        return top_words[:n]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": model_data is not None,
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    """
    if model_data is None:
        return jsonify({"error": "Model not available"}), 503

    data = request.get_json(silent=True)
    if not data or not data.get("text"):
        return jsonify({"error": "No text provided"}), 400

    text = str(data["text"])[:10000]  # cap length

    pipeline = model_data["pipeline"]
    le = model_data["label_encoder"]
    feature_names = model_data["feature_names"]

    proba = pipeline.predict_proba([text])[0]  # [P(fake), P(real)] alphabetical
    fake_idx = list(le.classes_).index("fake")
    real_idx = list(le.classes_).index("real")

    fake_prob = float(proba[fake_idx])
    real_prob = float(proba[real_idx])

    predicted_label = le.classes_[proba.argmax()]
    confidence = float(proba.max())

    # Suspicious words found in text
    text_lower = text.lower()
    found_suspicious = [w for w in SUSPICIOUS_WORDS if w in text_lower]
    found_credible = [w for w in CREDIBILITY_WORDS if w in text_lower]

    top_influential_words = get_top_influential_words(text, predicted_label, pipeline, le, feature_names, n=5)
    highlighted = highlight_sentences(text, predicted_label)

    reasons = []
    
    # Generate the human-readable explanation
    if top_influential_words:
        word_list = ", ".join([f"'{w}'" for w in top_influential_words])
        if predicted_label == "fake":
            reason_str = f"This article is classified as FAKE because it contains highly weighted terms such as {word_list}, which are commonly associated with misinformation."
            if found_suspicious:
                reason_str += f" It also uses suspicious phrases like '{found_suspicious[0]}'."
        else:
            reason_str = f"This article is classified as REAL because it contains informative terms such as {word_list}, matching standard reporting patterns."
            if found_credible:
                reason_str += f" It properly attributes sources (e.g., '{found_credible[0]}')."
        reasons.append(reason_str)
    else:
        if predicted_label == "fake":
            reasons.append("This article is classified as FAKE due to structural patterns commonly found in misinformation.")
        else:
            reasons.append("This article is classified as REAL based on standard linguistic patterns.")

    return jsonify({
        "label": predicted_label,
        "confidence": round(confidence, 4),
        "fake_probability": round(fake_prob, 4),
        "real_probability": round(real_prob, 4),
        "suspicious_words": found_suspicious[:10],
        "credible_words": found_credible[:10],
        "top_influential_words": top_influential_words,
        "highlighted_sentences": highlighted,
        "reasons": reasons,
        "model_used": "TF-IDF + Logistic Regression",
    })


@app.route("/metrics", methods=["GET"])
def get_metrics():
    """
    Return model evaluation metrics generated during training.
    """
    metrics_path = os.path.join(os.path.dirname(__file__), "metrics.json")
    if not os.path.exists(metrics_path):
        return jsonify({"error": "Metrics not found. Please run train.py first."}), 404
    
    try:
        with open(metrics_path, "r") as f:
            metrics = json.load(f)
        return jsonify(metrics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Global Startup
# ---------------------------------------------------------------------------
try:
    load_model()
except FileNotFoundError:
    pass # Logged inside load_model, will fail gracefully on /predict

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    logger.info("Starting ML API on port %d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
