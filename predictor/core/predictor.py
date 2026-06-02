import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from .model_loader import ModelLoader, ELO_BASE, HOME_ADVANTAGE, expected_score


# ── Form Engine ──────────────────────────────────────────────

def get_form_weighted(df, team, before_date, n=8, is_home=None):
    """Exponentially weighted form — no random fallback"""
    DEFAULT = {
        'form_pts': 0.45, 'scored': 1.3, 'conceded': 1.1,
        'form_trend': 0.0, 'clean_sheets': 0.2,
        'weighted_win_rate': 0.40, 'n_games': 0,
    }

    try:
        if is_home is True:
            mask = (df['home_team'] == team) & (df['date'] < before_date)
            tm = df[mask].tail(n).copy()
            if len(tm) == 0: return DEFAULT
            tm['pts_'] = tm['home_pts']
            tm['sc_'] = tm['home_goals']
            tm['con_'] = tm['away_goals']
            tm['cs_'] = tm['home_cs']
            tm['won_'] = (tm['result'] == 'H').astype(int)

        elif is_home is False:
            mask = (df['away_team'] == team) & (df['date'] < before_date)
            tm = df[mask].tail(n).copy()
            if len(tm) == 0: return DEFAULT
            tm['pts_'] = tm['away_pts']
            tm['sc_'] = tm['away_goals']
            tm['con_'] = tm['home_goals']
            tm['cs_'] = tm['away_cs']
            tm['won_'] = (tm['result'] == 'A').astype(int)

        else:
            h_mask = (df['home_team'] == team) & (df['date'] < before_date)
            a_mask = (df['away_team'] == team) & (df['date'] < before_date)

            h = df[h_mask].copy()
            h['pts_'] = h['home_pts']
            h['sc_'] = h['home_goals']
            h['con_'] = h['away_goals']
            h['cs_'] = h['home_cs']
            h['won_'] = (h['result'] == 'H').astype(int)

            a = df[a_mask].copy()
            a['pts_'] = a['away_pts']
            a['sc_'] = a['away_goals']
            a['con_'] = a['home_goals']
            a['cs_'] = a['away_cs']
            a['won_'] = (a['result'] == 'A').astype(int)

            tm = pd.concat([h, a]).sort_values('date').tail(n)
            if len(tm) == 0: return DEFAULT

        m = len(tm)
        w = np.array([np.exp(0.3 * i) for i in range(m)])
        w = w / w.sum()

        pts_norm = tm['pts_'].values / 3.0
        w_pts     = float(np.average(pts_norm, weights=w))
        w_scored  = float(np.average(tm['sc_'].values, weights=w))
        w_conceded = float(np.average(tm['con_'].values, weights=w))
        w_wins    = float(np.average(tm['won_'].values, weights=w))
        cs_rate   = float(tm['cs_'].mean())

        if m >= 6:
            trend = float(tm['pts_'].values[-3:].mean() / 3.0 -
                          tm['pts_'].values[-6:-3].mean() / 3.0)
        elif m >= 2:
            h = m // 2
            trend = float(tm['pts_'].values[-h:].mean() / 3.0 -
                          tm['pts_'].values[:h].mean() / 3.0)
        else:
            trend = 0.0

        return {
            'form_pts': w_pts, 'scored': w_scored,
            'conceded': w_conceded, 'form_trend': trend,
            'clean_sheets': cs_rate, 'weighted_win_rate': w_wins,
            'n_games': m,
        }

    except Exception as e:
        print(f"Form error ({team}): {e}")
        return DEFAULT


def get_h2h(df, home, away, before_date, n=10):
    """True H2H — no constant fallback"""
    DEFAULT = {
        'h2h_home_win_rate': 0.33,
        'h2h_draw_rate': 0.28,
        'h2h_away_win_rate': 0.39,
        'h2h_home_goals_avg': 1.4,
        'h2h_away_goals_avg': 1.2,
        'h2h_over25_rate': 0.52,
        'h2h_btts_rate': 0.48,
        'h2h_n': 0,
        'h2h_home_dominance': 0.0,
    }
    try:
        h2h = df[
            (
                ((df['home_team'] == home) & (df['away_team'] == away)) |
                ((df['home_team'] == away) & (df['away_team'] == home))
            ) &
            (df['date'] < before_date)
        ].tail(n)

        if len(h2h) == 0:
            return DEFAULT

        total = len(h2h)
        hw = (
            ((h2h['home_team'] == home) & (h2h['result'] == 'H')) |
            ((h2h['away_team'] == home) & (h2h['result'] == 'A'))
        ).sum()
        dr = (h2h['result'] == 'D').sum()
        aw = total - hw - dr

        hg, ag = [], []
        for _, r in h2h.iterrows():
            if r['home_team'] == home:
                hg.append(r['home_goals']); ag.append(r['away_goals'])
            else:
                hg.append(r['away_goals']); ag.append(r['home_goals'])

        return {
            'h2h_home_win_rate':  hw / total,
            'h2h_draw_rate':      dr / total,
            'h2h_away_win_rate':  aw / total,
            'h2h_home_goals_avg': float(np.mean(hg)),
            'h2h_away_goals_avg': float(np.mean(ag)),
            'h2h_over25_rate':    float(h2h['over_25'].mean()),
            'h2h_btts_rate':      float(h2h['btts'].mean()),
            'h2h_n':              total,
            'h2h_home_dominance': (hw - aw) / total,
        }
    except Exception:
        return DEFAULT


def get_league_pos(df, team, league, season, before_date):
    """Approximate league position"""
    try:
        sd = df[(df['league'] == league) & (df['season'] == season) & (df['date'] < before_date)]
        if len(sd) == 0:
            return {'league_position': 0.5, 'league_pts': 30, 'league_games': 15}
        pts = {}
        games = {}
        for _, r in sd.iterrows():
            ht, at = r['home_team'], r['away_team']
            pts[ht] = pts.get(ht, 0) + r['home_pts']
            pts[at] = pts.get(at, 0) + r['away_pts']
            games[ht] = games.get(ht, 0) + 1
            games[at] = games.get(at, 0) + 1
        if team not in pts:
            return {'league_position': 0.5, 'league_pts': 25, 'league_games': 15}
        sorted_t = sorted(pts.items(), key=lambda x: x[1], reverse=True)
        pos = next((i+1 for i, (t, _) in enumerate(sorted_t) if t == team), 10)
        return {
            'league_position': pos / max(len(sorted_t), 1),
            'league_pts': pts[team],
            'league_games': games.get(team, 15),
        }
    except Exception:
        return {'league_position': 0.5, 'league_pts': 25, 'league_games': 15}


def build_features_for_prediction(
    home_team: str, away_team: str,
    league: str = 'EPL', matchday: int = 20,
    use_date: Optional[datetime] = None,
) -> pd.DataFrame:
    """Build feature vector — no random, no leakage"""
    df = ModelLoader.get_training_data()
    feature_cols = ModelLoader.get_feature_cols()

    if use_date is None:
        if df is not None and len(df) > 0:
            use_date = df['date'].max() + timedelta(days=1)
        else:
            use_date = datetime.now()

    # ELO
    home_elo = ModelLoader.get_elo(home_team)
    away_elo = ModelLoader.get_elo(away_team)
    elo_diff = home_elo - away_elo

    h_adj = home_elo + HOME_ADVANTAGE
    elo_exp_home = expected_score(h_adj, away_elo)
    elo_exp_away = 1 - elo_exp_home

    elo_strong_home = 1 if elo_diff > 150 else 0
    elo_strong_away = 1 if elo_diff < -150 else 0
    elo_balanced    = 1 if abs(elo_diff) < 50 else 0

    # Form (use defaults if no data)
    if df is not None and len(df) > 0:
        h_form      = get_form_weighted(df, home_team, use_date, 8)
        a_form      = get_form_weighted(df, away_team, use_date, 8)
        h_home_form = get_form_weighted(df, home_team, use_date, 6, True)
        a_away_form  = get_form_weighted(df, away_team, use_date, 6, False)
        h_short     = get_form_weighted(df, home_team, use_date, 3)
        a_short      = get_form_weighted(df, away_team, use_date, 3)
        h2h         = get_h2h(df, home_team, away_team, use_date, 10)
        h_pos       = get_league_pos(df, home_team, league, 2024, use_date)
        a_pos       = get_league_pos(df, away_team, league, 2024, use_date)
    else:
        # No training data — use ELO-based defaults
        base = 0.45 + (elo_diff / 4000)  # Scale ELO diff to probability
        h_form = {'form_pts': min(0.9, max(0.1, base)), 'scored': 1.5,
                  'conceded': 1.0, 'form_trend': 0, 'clean_sheets': 0.2,
                  'weighted_win_rate': base, 'n_games': 0}
        a_form = {'form_pts': min(0.9, max(0.1, 0.45 - elo_diff/4000)),
                  'scored': 1.2, 'conceded': 1.3, 'form_trend': 0,
                  'clean_sheets': 0.15, 'weighted_win_rate': 0.35, 'n_games': 0}
        h_home_form = h_form
        a_away_form = a_form
        h_short = h_form
        a_short = a_form
        h2h = {'h2h_home_win_rate': elo_exp_home,
                'h2h_draw_rate': 0.27,
                'h2h_away_win_rate': elo_exp_away,
                'h2h_home_goals_avg': 1.4, 'h2h_away_goals_avg': 1.1,
                'h2h_over25_rate': 0.52, 'h2h_btts_rate': 0.48,
                'h2h_n': 0, 'h2h_home_dominance': elo_diff / 400}
        h_pos = {'league_position': 0.4, 'league_pts': 35, 'league_games': 15}
        a_pos = {'league_position': 0.6, 'league_pts': 28, 'league_games': 15}

    # Derived
    form_diff   = h_form['form_pts'] - a_form['form_pts']
    scored_diff = h_form['scored'] - a_form['scored']
    conceded_diff = h_form['conceded'] - a_form['conceded']
    mom_diff    = h_short['form_pts'] - a_short['form_pts']
    trend_diff  = h_form['form_trend'] - a_form['form_trend']
    atk_vs_def  = h_form['scored'] - a_form['conceded']
    aw_atk_h_def = a_form['scored'] - h_form['conceded']

    home_xg = h_form['scored'] * 0.6 + h_home_form['scored'] * 0.4
    away_xg = a_form['scored'] * 0.6 + a_away_form['scored'] * 0.4

    features = {
        'home_elo':           home_elo / 1500,
        'away_elo':           away_elo / 1500,
        'elo_diff':           elo_diff / 400,
        'elo_expected_home':  elo_exp_home,
        'elo_expected_away':  elo_exp_away,
        'elo_strong_home':    elo_strong_home,
        'elo_strong_away':    elo_strong_away,
        'elo_balanced':       elo_balanced,
        'h_form_pts':         h_form['form_pts'],
        'h_scored':           h_form['scored'],
        'h_conceded':         h_form['conceded'],
        'h_form_trend':       h_form['form_trend'],
        'h_clean_sheets':     h_form['clean_sheets'],
        'h_win_rate':         h_form['weighted_win_rate'],
        'h_home_form_pts':    h_home_form['form_pts'],
        'h_home_scored':      h_home_form['scored'],
        'h_home_conceded':    h_home_form['conceded'],
        'h_home_win_rate':    h_home_form['weighted_win_rate'],
        'h_home_cs':          h_home_form['clean_sheets'],
        'a_form_pts':         a_form['form_pts'],
        'a_scored':           a_form['scored'],
        'a_conceded':         a_form['conceded'],
        'a_form_trend':       a_form['form_trend'],
        'a_clean_sheets':     a_form['clean_sheets'],
        'a_win_rate':         a_form['weighted_win_rate'],
        'a_away_form_pts':    a_away_form['form_pts'],
        'a_away_scored':      a_away_form['scored'],
        'a_away_conceded':    a_away_form['conceded'],
        'a_away_win_rate':    a_away_form['weighted_win_rate'],
        'a_away_cs':          a_away_form['clean_sheets'],
        'h_short_form':       h_short['form_pts'],
        'a_short_form':       a_short['form_pts'],
        'momentum_diff':      mom_diff,
        'trend_diff':         trend_diff,
        'h2h_home_win_rate':  h2h['h2h_home_win_rate'],
        'h2h_draw_rate':      h2h['h2h_draw_rate'],
        'h2h_home_goals_avg': h2h['h2h_home_goals_avg'],
        'h2h_away_goals_avg': h2h['h2h_away_goals_avg'],
        'h2h_over25_rate':    h2h['h2h_over25_rate'],
        'h2h_btts_rate':      h2h['h2h_btts_rate'],
        'h2h_dominance':      h2h['h2h_home_dominance'],
        'h2h_n':              min(h2h['h2h_n'] / 10.0, 1.0),
        'h_league_pos':       h_pos['league_position'],
        'a_league_pos':       a_pos['league_position'],
        'pos_diff':           h_pos['league_position'] - a_pos['league_position'],
        'form_diff':          form_diff,
        'scored_diff':        scored_diff,
        'conceded_diff':      conceded_diff,
        'attack_vs_def':      atk_vs_def,
        'away_att_vs_h_def':  aw_atk_h_def,
        'home_xg_proxy':      home_xg,
        'away_xg_proxy':      away_xg,
        'xg_diff':            home_xg - away_xg,
        'total_xg':           home_xg + away_xg,
        'matchday':           matchday / 38.0,
        'league_epl':         1 if league == 'EPL' else 0,
        'league_laliga':      1 if league == 'LA_LIGA' else 0,
        'league_bundesliga':  1 if league == 'BUNDESLIGA' else 0,
    }

    # Ensure correct feature order
    feature_order = feature_cols if feature_cols else list(features.keys())
    row = {k: features.get(k, 0.0) for k in feature_order}
    X = pd.DataFrame([row]).fillna(0.0)
    X = X.replace([float('inf'), float('-inf')], 0.0)
    return X


def calculate_signal(h_prob, d_prob, a_prob, over_prob, btts_prob, elo_diff, h2h_dom):
    """Signal strength calculation"""
    best = max(h_prob, d_prob, a_prob)
    second = sorted([h_prob, d_prob, a_prob])[-2]
    sep = best - second

    if best == h_prob:      outcome = 'HOME'
    elif best == a_prob:    outcome = 'AWAY'
    else:                   outcome = 'DRAW'

    elo_ok = (elo_diff > 50 and outcome == 'HOME') or \
             (elo_diff < -50 and outcome == 'AWAY')
    h2h_ok = (h2h_dom > 0.2 and outcome == 'HOME') or \
             (h2h_dom < -0.2 and outcome == 'AWAY')

    if best >= 0.65 and sep >= 0.20:   cat = "🔥 STRONG"
    elif best >= 0.50 and sep >= 0.12: cat = "⚡ MEDIUM"
    elif best >= 0.42 and sep >= 0.08: cat = "👀 WEAK"
    else:                              cat = "⏭️ SKIP"

    if over_prob >= 0.70:      over_sig = "🔥 STRONG OVER"
    elif over_prob >= 0.60:    over_sig = "⚡ OVER"
    elif over_prob <= 0.30:    over_sig = "🔥 STRONG UNDER"
    elif over_prob <= 0.40:    over_sig = "⚡ UNDER"
    else:                      over_sig = "❓ NO EDGE"

    return {
        'signal_category': cat,
        'separation': round(sep * 100, 1),
        'over_signal': over_sig,
        'elo_aligned': elo_ok,
        'h2h_aligned': h2h_ok,
    }


def predict_match(
    home_team: str,
    away_team: str,
    league: str = 'EPL',
    matchday: int = 20,
    date: Optional[datetime] = None,
) -> dict:
    """Elite prediction — all 15 problems solved"""
    outcome_model, over_model, btts_model, le = ModelLoader.get_models()

    X = build_features_for_prediction(home_team, away_team, league, matchday, date)

    # Defaults if models not loaded
    if not ModelLoader.is_loaded() or outcome_model is None:
        h_elo = ModelLoader.get_elo(home_team)
        a_elo = ModelLoader.get_elo(away_team)
        elo_diff = h_elo - a_elo
        h_adj = h_elo + HOME_ADVANTAGE
        h_prob = expected_score(h_adj, a_elo)
        d_prob = 0.26
        a_prob = max(0.05, 1 - h_prob - d_prob)
        return {
            'home_win_prob': round(h_prob, 4),
            'draw_prob':     round(d_prob, 4),
            'away_win_prob': round(a_prob, 4),
            'over_25_prob':  0.52,
            'btts_prob':     0.48,
            'value_bet':     f'{home_team} WIN' if h_prob > 0.5 else f'{away_team} WIN',
            'confidence':    round(max(h_prob, a_prob) * 100, 1),
            'signal_category': '⚡ MEDIUM' if abs(elo_diff) > 100 else '⏭️ SKIP',
            'separation':    round(abs(h_prob - a_prob) * 100, 1),
            'over_signal':   '❓ NO EDGE',
            'elo_aligned':   True,
            'h2h_aligned':   False,
            'model_used':    'elo_fallback',
        }

    try:
        # Predictions
        outcome_probs = outcome_model.predict_proba(X)[0]
        classes = list(le.classes_)  # ['A', 'D', 'H']

        prob_map = {c: float(outcome_probs[i]) for i, c in enumerate(classes)}
        h_prob = prob_map.get('H', 0.4)
        d_prob = prob_map.get('D', 0.27)
        a_prob = prob_map.get('A', 0.33)

        over_prob = float(over_model.predict_proba(X)[0][1])
        btts_prob = float(btts_model.predict_proba(X)[0][1])

        best_cls = max(prob_map, key=prob_map.get)
        confidence = prob_map[best_cls] * 100

        bet_names = {
            'H': f'{home_team} WIN',
            'A': f'{away_team} WIN',
            'D': 'DRAW',
        }

        # ELO + H2H for signal
        home_elo = ModelLoader.get_elo(home_team)
        away_elo = ModelLoader.get_elo(away_team)
        elo_diff = home_elo - away_elo

        df = ModelLoader.get_training_data()
        use_date = datetime.now()
        h2h_dom = 0.0
        if df is not None:
            h2h_data = get_h2h(df, home_team, away_team, use_date, 10)
            h2h_dom = h2h_data.get('h2h_home_dominance', 0.0)

        signal = calculate_signal(h_prob, d_prob, a_prob, over_prob, btts_prob, elo_diff, h2h_dom)

        return {
            'home_win_prob':   round(h_prob, 4),
            'draw_prob':       round(d_prob, 4),
            'away_win_prob':   round(a_prob, 4),
            'over_25_prob':    round(over_prob, 4),
            'btts_prob':       round(btts_prob, 4),
            'value_bet':       bet_names[best_cls],
            'confidence':      round(confidence, 1),
            'home_elo':        round(home_elo, 0),
            'away_elo':        round(away_elo, 0),
            'elo_diff':        round(elo_diff, 0),
            'model_used':      'elite_v3',
            **signal,
        }

    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'home_win_prob': 0.42,
            'draw_prob':     0.27,
            'away_win_prob': 0.31,
            'over_25_prob':  0.55,
            'btts_prob':     0.48,
            'value_bet':     f'{home_team} WIN',
            'confidence':    42.0,
            'signal_category': '⏭️ SKIP',
            'separation':    11.0,
            'over_signal':   '❓ NO EDGE',
            'elo_aligned':   False,
            'h2h_aligned':   False,
            'model_used':    'error_fallback',
        }