"""
Offline training script for VerifyNews ML Model.
Run this script to generate model.pkl before starting the Flask API.
"""

import os
import pickle
import logging

import json

try:
    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    import numpy as np
except ImportError as e:
    raise ImportError("Please install dependencies: pip install -r requirements.txt") from e

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

# ------------------------------------------------------------------
# Built-in training corpus (minimal – keeps the service self-contained)
# Real deployment should load from CSV/DB instead.
# ------------------------------------------------------------------
TRAINING_DATA = [
    # --- FAKE ---
    ("BREAKING: Scientists SHOCKED as vaccines cause autism in new study!!!", "fake"),
    ("You WON'T BELIEVE what the government is hiding from you about 5G towers!", "fake"),
    ("EXPOSED: Mainstream media LIES about COVID cure that doctors don't want you to know", "fake"),
    ("Shocking truth revealed: chemtrails are poisoning our water supply", "fake"),
    ("10 reasons why the moon landing was FAKED by NASA – share before deleted!", "fake"),
    ("Bill Gates planning microchip implant in every human using vaccine rollout", "fake"),
    ("URGENT: Deep state operatives caught rigging election in secret footage", "fake"),
    ("Doctors HATE this one weird trick that cures cancer overnight", "fake"),
    ("WAKE UP SHEEPLE: The elite are poisoning your food to control you", "fake"),
    ("Anonymous sources reveal shocking secret plot to destroy America", "fake"),
    ("Alien beings meeting with world leaders to establish new world order", "fake"),
    ("Celebrity DIES after taking experimental drug – media blackout!", "fake"),
    ("Exposed: How the banking cartel controls every government on Earth", "fake"),
    ("Scientists baffled as man cures diabetes with this bizarre fruit", "fake"),
    ("ALERT: New law will ban free speech and imprison patriots by 2025", "fake"),
    ("Insider reveals jaw-dropping secret that will make you question everything", "fake"),
    ("The shocking truth about what is REALLY in your tap water", "fake"),
    ("Outraged citizens demand justice after government cover-up scandal exposed", "fake"),
    ("Amazing discovery: ancient remedy destroys cancer cells instantly", "fake"),
    ("Bombshell revelation: global warming is a complete hoax invented by elites", "fake"),
    # --- REAL ---
    ("The Federal Reserve raised interest rates by 25 basis points on Wednesday, according to official statements.", "real"),
    ("Researchers at Stanford University published a peer-reviewed study on climate change impacts in Nature journal.", "real"),
    ("The World Health Organization confirmed that global vaccination rates have increased by 12% this year.", "real"),
    ("Parliament passed the infrastructure bill with a bipartisan majority of 68 votes to 32.", "real"),
    ("NASA's James Webb Space Telescope captured new images of a distant galaxy 13.4 billion light years away.", "real"),
    ("The unemployment rate fell to 3.7% in March, according to the Bureau of Labor Statistics report.", "real"),
    ("Scientists at MIT developed a new battery technology that could double electric vehicle range.", "real"),
    ("The Supreme Court ruled 6-3 in favor of the plaintiffs in the landmark environmental case.", "real"),
    ("European Union lawmakers approved new regulations on artificial intelligence development and deployment.", "real"),
    ("The Centers for Disease Control confirmed three cases of bird flu in the midwest region.", "real"),
    ("According to a report by the International Monetary Fund, global GDP growth is projected at 3.2%.", "real"),
    ("University of Oxford researchers identified a new protein linked to Alzheimer's disease progression.", "real"),
    ("The State Department issued a travel advisory for citizens visiting the affected region.", "real"),
    ("Federal investigators confirmed the arrest of three individuals in connection with the fraud case.", "real"),
    ("The annual report from Transparency International ranked corruption levels across 180 countries.", "real"),
    ("Local authorities confirmed road closures due to flooding after heavy rainfall this weekend.", "real"),
    ("Apple reported quarterly earnings of $90 billion, beating analyst expectations by 4%.", "real"),
    ("The United Nations Security Council voted unanimously to extend the peacekeeping mission.", "real"),
    ("Pharmaceutical company submitted clinical trial results to the FDA for review and approval.", "real"),
    ("The city council approved a $50 million budget for public transit improvements next year.", "real"),
]

def train_and_save():
    """
    Train TF-IDF + Logistic Regression on the dataset, evaluate, and save.
    """
    logger.info("Training new model...")
    texts = [t for t, _ in TRAINING_DATA]
    labels = [l for _, l in TRAINING_DATA]

    le = LabelEncoder()
    y = le.fit_transform(labels)  # fake=0, real=1 (alphabetical)

    # 80/20 Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(texts, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True,
            stop_words="english",
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=1.0,
            class_weight="balanced",
            random_state=42,
        )),
    ])

    pipeline.fit(X_train, y_train)

    # Evaluate the model
    y_pred = pipeline.predict(X_test)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
    }

    logger.info("--- Evaluation Metrics ---")
    logger.info(f"Accuracy:  {metrics['accuracy']}")
    logger.info(f"Precision: {metrics['precision']}")
    logger.info(f"Recall:    {metrics['recall']}")
    logger.info(f"F1-score:  {metrics['f1_score']}")
    logger.info("--------------------------")

    # Save metrics to JSON
    metrics_path = os.path.join(os.path.dirname(__file__), "metrics.json")
    with open(metrics_path, "w") as mf:
        json.dump(metrics, mf, indent=4)
    logger.info(f"Metrics saved to {metrics_path}")

    # Extract top feature names for explanation
    feature_names = pipeline.named_steps["tfidf"].get_feature_names_out().tolist()

    model_data = {
        "pipeline": pipeline,
        "label_encoder": le,
        "feature_names": feature_names,
    }

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_data, f)

    logger.info("Model trained and saved to %s", MODEL_PATH)

if __name__ == "__main__":
    train_and_save()
