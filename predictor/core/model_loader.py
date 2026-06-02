import os, json, joblib
import numpy as np
import pandas as pd
from pathlib import Path

MODELS_DIR  = Path(__file__).parent.parent / "models"
ELO_BASE    = 1500
HOME_ADV    = 100
ELO_K       = 32

SUPPORTED_LEAGUES = ["EPL", "LA_LIGA", "BUNDESLIGA"]


def expected_elo(a, b):
    return 1 / (1 + 10 ** ((b - a) / 400))


class ModelLoader:
    _leagues     = {}      # {league: {outcome, over25, btts}}
    _le          = None
    _feature_cols = None
    _metadata    = None
    _training_data = None
    _elo_ratings = None
    _loaded      = False

    @classmethod
    def load(cls):
        if not MODELS_DIR.exists():
            print(f"⚠️ Models dir missing: {MODELS_DIR}")
            return False
        try:
            # Load shared components
            cls._le           = joblib.load(MODELS_DIR / "label_encoder.pkl")
            with open(MODELS_DIR / "features.json")  as f: cls._feature_cols = json.load(f)
            with open(MODELS_DIR / "metadata.json")  as f: cls._metadata      = json.load(f)
            with open(MODELS_DIR / "elo_ratings.json") as f: cls._elo_ratings  = json.load(f)

            csv = MODELS_DIR / "training_data.csv"
            if csv.exists():
                cls._training_data = pd.read_csv(csv)
                cls._training_data['date'] = pd.to_datetime(cls._training_data['date'])

            # Load per-league models
            for league in SUPPORTED_LEAGUES:
                o_path = MODELS_DIR / f"{league}_outcome.pkl"
                v_path = MODELS_DIR / f"{league}_over25.pkl"
                b_path = MODELS_DIR / f"{league}_btts.pkl"
                if o_path.exists() and v_path.exists() and b_path.exists():
                    cls._leagues[league] = {
                        'outcome': joblib.load(o_path),
                        'over25':  joblib.load(v_path),
                        'btts':    joblib.load(b_path),
                    }
                    print(f"  ✅ {league} models loaded")
                else:
                    print(f"  ⚠️ {league} models not found — will use fallback")

            cls._loaded = len(cls._leagues) > 0
            meta = cls._metadata or {}
            print(f"  Version: {meta.get('version', 'unknown')}")
            print(f"  Leagues: {list(cls._leagues.keys())}")
            print(f"  ELO teams: {len(cls._elo_ratings or {})}")
            return cls._loaded

        except Exception as e:
            print(f"❌ Load error: {e}")
            import traceback; traceback.print_exc()
            cls._loaded = False
            return False

    @classmethod
    def is_loaded(cls):      return cls._loaded
    @classmethod
    def get_le(cls):         return cls._le
    @classmethod
    def get_features(cls):   return cls._feature_cols or []
    @classmethod
    def get_metadata(cls):   return cls._metadata or {}
    @classmethod
    def get_training_data(cls): return cls._training_data
    @classmethod
    def get_league_models(cls, league): return cls._leagues.get(league)
    @classmethod
    def get_loaded_leagues(cls): return list(cls._leagues.keys())

    @classmethod
    def get_elo(cls, team: str) -> float:
        er = cls._elo_ratings or {}
        return float(er.get(team, ELO_BASE))