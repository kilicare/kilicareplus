import os
import json
import joblib
import math
import numpy as np
import pandas as pd
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"

ELO_BASE = 1500
HOME_ADVANTAGE = 100


def expected_score(rating_a, rating_b):
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


class ModelLoader:
    _outcome_model = None
    _over25_model  = None
    _btts_model    = None
    _label_encoder = None
    _feature_cols  = None
    _metadata      = None
    _training_data = None
    _elo_ratings   = None
    _loaded        = False

    @classmethod
    def load(cls):
        if not MODELS_DIR.exists():
            print(f"⚠️ Models dir not found: {MODELS_DIR}")
            return False
        try:
            cls._outcome_model = joblib.load(MODELS_DIR / "outcome_model.pkl")
            cls._over25_model  = joblib.load(MODELS_DIR / "over25_model.pkl")
            cls._btts_model    = joblib.load(MODELS_DIR / "btts_model.pkl")
            cls._label_encoder = joblib.load(MODELS_DIR / "label_encoder.pkl")

            with open(MODELS_DIR / "features.json") as f:
                cls._feature_cols = json.load(f)

            with open(MODELS_DIR / "metadata.json") as f:
                cls._metadata = json.load(f)

            elo_path = MODELS_DIR / "elo_ratings.json"
            if elo_path.exists():
                with open(elo_path) as f:
                    cls._elo_ratings = json.load(f)
                print(f"   ELO ratings: {len(cls._elo_ratings)} teams")

            csv_path = MODELS_DIR / "training_data.csv"
            if csv_path.exists():
                cls._training_data = pd.read_csv(csv_path)
                cls._training_data['date'] = pd.to_datetime(
                    cls._training_data['date']
                )
                print(f"   Training data: {len(cls._training_data)} matches")

            cls._loaded = True
            meta = cls._metadata or {}
            print(f"   Version: {meta.get('version', 'unknown')}")
            print(f"   Outcome accuracy: {meta.get('outcome_accuracy', 0):.1%}")
            print(f"   Over 2.5 accuracy: {meta.get('over25_accuracy', 0):.1%}")
            return True

        except Exception as e:
            print(f"❌ Model loading error: {e}")
            import traceback
            traceback.print_exc()
            cls._loaded = False
            return False

    @classmethod
    def is_loaded(cls):
        return cls._loaded

    @classmethod
    def get_models(cls):
        return (
            cls._outcome_model,
            cls._over25_model,
            cls._btts_model,
            cls._label_encoder,
        )

    @classmethod
    def get_feature_cols(cls):
        return cls._feature_cols or []

    @classmethod
    def get_metadata(cls):
        return cls._metadata or {}

    @classmethod
    def get_training_data(cls):
        return cls._training_data

    @classmethod
    def get_elo_ratings(cls):
        return cls._elo_ratings or {}

    @classmethod
    def get_elo(cls, team: str) -> float:
        elo = cls._elo_ratings or {}
        return float(elo.get(team, ELO_BASE))