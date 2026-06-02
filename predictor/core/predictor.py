import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from .model_loader import ModelLoader, ELO_BASE, HOME_ADV, expected_elo


# ── Feature helpers ──────────────────────────────────────────

def _form(df, team, before, n=8, side=None):
    DEF = {'form_pts':0.45,'scored':1.3,'conceded':1.1,
           'trend':0.0,'cs':0.2,'win_rate':0.40}
    try:
        if side == 'home':
            tm = df[(df['home_team']==team)&(df['date']<before)].tail(n).copy()
            if not len(tm): return DEF
            tm = tm.assign(pts_=tm['home_pts'],sc_=tm['home_goals'],
                           con_=tm['away_goals'],cs_=tm['home_cs'],
                           won_=(tm['result']=='H').astype(int))
        elif side == 'away':
            tm = df[(df['away_team']==team)&(df['date']<before)].tail(n).copy()
            if not len(tm): return DEF
            tm = tm.assign(pts_=tm['away_pts'],sc_=tm['away_goals'],
                           con_=tm['home_goals'],cs_=tm['away_cs'],
                           won_=(tm['result']=='A').astype(int))
        else:
            h = df[(df['home_team']==team)&(df['date']<before)].copy()
            a = df[(df['away_team']==team)&(df['date']<before)].copy()
            h = h.assign(pts_=h['home_pts'],sc_=h['home_goals'],con_=h['away_goals'],
                         cs_=h['home_cs'],won_=(h['result']=='H').astype(int))
            a = a.assign(pts_=a['away_pts'],sc_=a['away_goals'],con_=a['home_goals'],
                         cs_=a['away_cs'],won_=(a['result']=='A').astype(int))
            tm = pd.concat([h,a]).sort_values('date').tail(n)
            if not len(tm): return DEF
        m = len(tm)
        w = np.exp(0.3*np.arange(m)); w/=w.sum()
        p  = float(np.average(tm['pts_'].values/3, weights=w))
        s  = float(np.average(tm['sc_'].values,    weights=w))
        c  = float(np.average(tm['con_'].values,   weights=w))
        wr = float(np.average(tm['won_'].values,   weights=w))
        cs = float(tm['cs_'].mean())
        if m>=6: tr = tm['pts_'].values[-3:].mean()/3 - tm['pts_'].values[-6:-3].mean()/3
        elif m>=2:
            h2=m//2; tr=tm['pts_'].values[-h2:].mean()/3-tm['pts_'].values[:h2].mean()/3
        else: tr=0.0
        return {'form_pts':p,'scored':s,'conceded':c,'trend':float(tr),'cs':cs,'win_rate':wr}
    except: return DEF


def _h2h(df, home, away, before, n=10):
    DEF={'hw':0.33,'dr':0.28,'aw':0.39,'hg':1.4,'ag':1.2,
         'o25':0.52,'btts':0.48,'n':0,'dom':0.0}
    try:
        h2h = df[
            (((df['home_team']==home)&(df['away_team']==away))|
             ((df['home_team']==away)&(df['away_team']==home)))&
            (df['date']<before)
        ].tail(n)
        if not len(h2h): return DEF
        tot=len(h2h)
        hw=(((h2h['home_team']==home)&(h2h['result']=='H'))|
            ((h2h['away_team']==home)&(h2h['result']=='A'))).sum()
        dr=(h2h['result']=='D').sum(); aw=tot-hw-dr
        hg,ag=[],[]
        for _,r in h2h.iterrows():
            if r['home_team']==home: hg.append(r['home_goals']); ag.append(r['away_goals'])
            else: hg.append(r['away_goals']); ag.append(r['home_goals'])
        return {'hw':hw/tot,'dr':dr/tot,'aw':aw/tot,
                'hg':float(np.mean(hg)),'ag':float(np.mean(ag)),
                'o25':float(h2h['over_25'].mean()),'btts':float(h2h['btts'].mean()),
                'n':tot,'dom':(hw-aw)/tot}
    except: return DEF


def _league_pos(df, team, league, season, before):
    try:
        sd=df[(df['league']==league)&(df['season']==season)&(df['date']<before)]
        if not len(sd): return {'pos':0.5,'pts':30,'gms':15}
        pts,gms={},{}
        for _,r in sd.iterrows():
            ht,at=r['home_team'],r['away_team']
            pts[ht]=pts.get(ht,0)+r['home_pts']; pts[at]=pts.get(at,0)+r['away_pts']
            gms[ht]=gms.get(ht,0)+1; gms[at]=gms.get(at,0)+1
        if team not in pts: return {'pos':0.5,'pts':25,'gms':15}
        srt=sorted(pts.items(),key=lambda x:x[1],reverse=True)
        pos=next((i+1 for i,(t,_) in enumerate(srt) if t==team),10)
        return {'pos':pos/max(len(srt),1),'pts':pts[team],'gms':gms.get(team,15)}
    except: return {'pos':0.5,'pts':25,'gms':15}


def _build_features(home, away, league, matchday, use_date):
    """Build feature dict — consistent with training"""
    df = ModelLoader.get_training_data()
    fc = ModelLoader.get_features()

    h_elo = ModelLoader.get_elo(home)
    a_elo = ModelLoader.get_elo(away)
    diff  = h_elo - a_elo
    h_adj = h_elo + HOME_ADV
    exp_h = expected_elo(h_adj, a_elo)

    # Form from full dataset (cross-league, V3-consistent)
    if df is not None and len(df) > 0:
        hf  = _form(df, home, use_date, 8)
        af  = _form(df, away, use_date, 8)
        hhf = _form(df, home, use_date, 6, 'home')
        aaf = _form(df, away, use_date, 6, 'away')
        hs  = _form(df, home, use_date, 3)
        as_ = _form(df, away, use_date, 3)
        h2h = _h2h(df, home, away, use_date, 10)
        hp  = _league_pos(df, home, league, 2024, use_date)
        ap  = _league_pos(df, away, league, 2024, use_date)
    else:
        # ELO-based defaults (no random!)
        base = 0.45 + (diff / 4000)
        hf  = {'form_pts': min(0.9, max(0.1, base)), 'scored':1.5, 'conceded':1.0,
                'trend':0, 'cs':0.2, 'win_rate': min(0.85, max(0.1, base))}
        af  = {'form_pts': min(0.9, max(0.1, 0.45-diff/4000)), 'scored':1.2,
                'conceded':1.3, 'trend':0, 'cs':0.15, 'win_rate': 0.35}
        hhf = hf; aaf = af; hs = hf; as_ = af
        h2h = {'hw': exp_h, 'dr':0.27, 'aw':1-exp_h, 'hg':1.4, 'ag':1.1,
                'o25':0.52, 'btts':0.48, 'n':0, 'dom': diff/400}
        hp  = {'pos':0.4, 'pts':35, 'gms':15}
        ap  = {'pos':0.6, 'pts':28, 'gms':15}

    hxg = hf['scored']*0.6 + hhf['scored']*0.4
    axg = af['scored']*0.6 + aaf['scored']*0.4

    feat = {
        'home_elo':h_elo/1500, 'away_elo':a_elo/1500,
        'elo_diff':diff/400, 'exp_home':exp_h, 'exp_away':1-exp_h,
        'elo_fav_home':1 if diff>150 else 0,
        'elo_fav_away':1 if diff<-150 else 0,
        'elo_balanced':1 if abs(diff)<50 else 0,
        'h_pts':hf['form_pts'], 'h_scored':hf['scored'], 'h_conceded':hf['conceded'],
        'h_trend':hf['trend'], 'h_cs':hf['cs'], 'h_wr':hf['win_rate'],
        'hh_pts':hhf['form_pts'], 'hh_scored':hhf['scored'], 'hh_conceded':hhf['conceded'],
        'hh_wr':hhf['win_rate'], 'hh_cs':hhf['cs'],
        'a_pts':af['form_pts'], 'a_scored':af['scored'], 'a_conceded':af['conceded'],
        'a_trend':af['trend'], 'a_cs':af['cs'], 'a_wr':af['win_rate'],
        'aa_pts':aaf['form_pts'], 'aa_scored':aaf['scored'], 'aa_conceded':aaf['conceded'],
        'aa_wr':aaf['win_rate'], 'aa_cs':aaf['cs'],
        'h_short':hs['form_pts'], 'a_short':as_['form_pts'],
        'momentum_diff':hs['form_pts']-as_['form_pts'],
        'trend_diff':hf['trend']-af['trend'],
        'h2h_hw':h2h['hw'], 'h2h_dr':h2h['dr'],
        'h2h_hg':h2h['hg'], 'h2h_ag':h2h['ag'],
        'h2h_o25':h2h['o25'], 'h2h_btts':h2h['btts'],
        'h2h_dom':h2h['dom'], 'h2h_n':min(h2h['n']/10,1.0),
        'h_pos':hp['pos'], 'a_pos':ap['pos'],
        'pos_diff':hp['pos']-ap['pos'],
        'form_diff':hf['form_pts']-af['form_pts'],
        'scored_diff':hf['scored']-af['scored'],
        'conceded_diff':hf['conceded']-af['conceded'],
        'atk_vs_def':hf['scored']-af['conceded'],
        'away_atk_h_def':af['scored']-hf['conceded'],
        'home_xg':hxg, 'away_xg':axg, 'xg_diff':hxg-axg, 'total_xg':hxg+axg,
        'matchday':matchday/38, 'season_prog':matchday/38,
    }

    row = {k: feat.get(k, 0.0) for k in (fc or list(feat.keys()))}
    X = pd.DataFrame([row]).fillna(0.0).replace([float('inf'), float('-inf')], 0.0)
    return X


def predict_match(
    home_team: str, away_team: str,
    league: str = 'EPL', matchday: int = 20,
    date=None,
) -> dict:
    """V4 per-league prediction"""
    df   = ModelLoader.get_training_data()
    models = ModelLoader.get_league_models(league)
    le   = ModelLoader.get_le()

    use_date = date or (
        df['date'].max() + pd.Timedelta(days=1) if df is not None else
        pd.Timestamp.now()
    )

    # ELO fallback if no model for this league
    if not ModelLoader.is_loaded() or models is None or le is None:
        h_elo = ModelLoader.get_elo(home_team)
        a_elo = ModelLoader.get_elo(away_team)
        diff  = h_elo - a_elo
        h_adj = h_elo + HOME_ADV
        h_p   = expected_elo(h_adj, a_elo)
        d_p   = 0.26
        a_p   = max(0.05, 1 - h_p - d_p)
        best  = 'H' if h_p > a_p else 'A'
        conf  = max(h_p, a_p) * 100
        sig   = "⚡ MEDIUM" if abs(diff) > 100 else "⏭️ SKIP"
        return {
            'home_win_prob': round(h_p, 4), 'draw_prob': round(d_p, 4),
            'away_win_prob': round(a_p, 4), 'over_25_prob': 0.52, 'btts_prob': 0.48,
            'value_bet': f'{home_team} WIN' if best=='H' else f'{away_team} WIN',
            'confidence': round(conf, 1), 'signal_category': sig,
            'separation': round(abs(h_p - a_p)*100, 1), 'over_signal': '❓ NO EDGE',
            'elo_aligned': True, 'h2h_aligned': False,
            'home_elo': round(h_elo), 'away_elo': round(a_elo),
            'elo_diff': round(diff), 'model_used': 'elo_fallback',
        }

    try:
        X = _build_features(home_team, away_team, league, matchday, use_date)

        probs = models['outcome'].predict_proba(X)[0]
        cls   = list(le.classes_)  # ['A','D','H']
        pm    = {c: float(probs[i]) for i,c in enumerate(cls)}

        h_p = pm.get('H', 0.40)
        d_p = pm.get('D', 0.27)
        a_p = pm.get('A', 0.33)

        op  = float(models['over25'].predict_proba(X)[0][1])
        bp  = float(models['btts'].predict_proba(X)[0][1])

        best = max(pm, key=pm.get)
        conf = pm[best] * 100
        bet  = {'H':f'{home_team} WIN','A':f'{away_team} WIN','D':'DRAW'}[best]
        sep  = (max(h_p,d_p,a_p) - sorted([h_p,d_p,a_p])[-2]) * 100

        h_elo = ModelLoader.get_elo(home_team)
        a_elo = ModelLoader.get_elo(away_team)
        elo_d = h_elo - a_elo

        h2h_dom = 0.0
        if df is not None:
            h2h_data = _h2h(df, home_team, away_team, use_date, 10)
            h2h_dom  = h2h_data.get('dom', 0.0)

        elo_ok = ((elo_d > 50 and best=='H') or (elo_d < -50 and best=='A'))
        h2h_ok = ((h2h_dom > 0.2 and best=='H') or (h2h_dom < -0.2 and best=='A'))

        if conf >= 65 and sep >= 20:   sig = "🔥 STRONG"
        elif conf >= 50 and sep >= 12: sig = "⚡ MEDIUM"
        elif conf >= 42 and sep >= 8:  sig = "👀 WEAK"
        else:                          sig = "⏭️ SKIP"

        if op >= 0.70:    o_sig = "🔥 STRONG OVER"
        elif op >= 0.60:  o_sig = "⚡ OVER"
        elif op <= 0.30:  o_sig = "🔥 STRONG UNDER"
        elif op <= 0.40:  o_sig = "⚡ UNDER"
        else:             o_sig = "❓ NO EDGE"

        return {
            'home_win_prob': round(h_p, 4), 'draw_prob': round(d_p, 4),
            'away_win_prob': round(a_p, 4), 'over_25_prob': round(op, 4),
            'btts_prob':     round(bp, 4),  'value_bet':    bet,
            'confidence':    round(conf, 1), 'signal_category': sig,
            'separation':    round(sep, 1), 'over_signal':   o_sig,
            'elo_aligned':   elo_ok, 'h2h_aligned': h2h_ok,
            'home_elo':      round(h_elo), 'away_elo': round(a_elo),
            'elo_diff':      round(elo_d), 'model_used': f'{league}_v4',
        }

    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback; traceback.print_exc()
        return {
            'home_win_prob':0.42,'draw_prob':0.27,'away_win_prob':0.31,
            'over_25_prob':0.55,'btts_prob':0.48,'value_bet':f'{home_team} WIN',
            'confidence':42.0,'signal_category':'⏭️ SKIP','separation':11.0,
            'over_signal':'❓ NO EDGE','elo_aligned':False,'h2h_aligned':False,
            'home_elo':1500,'away_elo':1500,'elo_diff':0,'model_used':'error_fallback',
        }