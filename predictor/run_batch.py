import requests

matches = [
    ("Manchester City FC", "Arsenal FC", "EPL"),
    ("Liverpool FC", "Arsenal FC", "EPL"),
    ("Real Madrid CF", "FC Barcelona", "LA_LIGA"),
    ("Atletico de Madrid", "Villarreal CF", "LA_LIGA"),
    ("FC Bayern München", "Borussia Dortmund", "BUNDESLIGA"),
    ("Bayer 04 Leverkusen", "Borussia Dortmund", "BUNDESLIGA"),
    ("Bayer 04 Leverkusen", "RB Leipzig", "BUNDESLIGA"),
    ("Manchester City FC", "Manchester United FC", "EPL"),
    ("Liverpool FC", "Chelsea FC", "EPL"),
    ("Tottenham Hotspur FC", "Manchester United FC", "EPL")
]

print("🚀 KilicareGO Elite V4 - Batch Analysis\n" + "="*40)

for home, away, league in matches:
    url = f"http://localhost:8001/predictions/predict?home_team={home}&away_team={away}&league={league}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            d = response.json()
            # Convert probabilities to percentage string
            print(f"⚽ {home} vs {away} ({league})")
            print(f"💡 Value Bet: {d.get('value_bet')} | Signal: {d.get('signal_category')}")
            print(f"📊 PROBABILITIES: H:{d.get('home_win_prob')*100:.1f}% | D:{d.get('draw_prob')*100:.1f}% | A:{d.get('away_win_prob')*100:.1f}%")
            print(f"🔥 Confidence: {d.get('confidence')}% | Separation: {d.get('separation')}%")
            print(f"⚡ Over/Under: {d.get('over_signal')} ({d.get('over_25_prob')*100:.1f}%)")
            print(f"🧠 ELO: {d.get('home_elo')} vs {d.get('away_elo')} | Diff: {d.get('elo_diff')}")
            print("-" * 40)
        else:
            print(f"❌ Error {response.status_code} for {home} vs {away}")
    except Exception as e:
        print(f"⚠️ API Connection Error: {e}")