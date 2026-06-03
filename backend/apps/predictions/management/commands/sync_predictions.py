from django.core.management.base import BaseCommand
from django.utils import timezone
import requests
from apps.predictions.models import Match
from django.conf import settings

PREDICTOR_URL = getattr(settings, 'PREDICTOR_URL', 'http://localhost:8001')
LEAGUES = ['EPL', 'LA_LIGA', 'BUNDESLIGA']


class Command(BaseCommand):
    help = 'Sync predictions from FastAPI V4 predictor'

    def handle(self, *args, **kwargs):
        self.stdout.write('🔄 Syncing predictions from V4 predictor...')

        for league in LEAGUES:
            self.stdout.write(f'\n  📊 {league}...')
            try:
                r = requests.get(
                    f'{PREDICTOR_URL}/matches/upcoming',
                    params={'league': league}, timeout=30,
                )
                if r.status_code != 200:
                    self.stdout.write(f'  ⚠️ {r.status_code}')
                    continue

                matches = r.json().get('matches', [])
                synced = 0

                for m in matches:
                    pred_r = requests.get(
                        f'{PREDICTOR_URL}/predictions/predict',
                        params={
                            'home_team': m['home_team'],
                            'away_team': m['away_team'],
                            'league': league,
                            'matchday': m.get('matchday', 20),
                        },
                        timeout=15,
                    )
                    if pred_r.status_code != 200:
                        continue

                    pred = pred_r.json()
                    dt = m.get('scheduled_at', timezone.now().isoformat())

                    try:
                        from django.utils.dateparse import parse_datetime
                        sched = parse_datetime(dt) or timezone.now()
                    except:
                        sched = timezone.now()

                    Match.objects.update_or_create(
                        external_id=m['external_id'],
                        defaults={
                            'league':        league,
                            'home_team':     m['home_team'],
                            'away_team':     m['away_team'],
                            'home_team_logo': m.get('home_team_logo'),
                            'away_team_logo': m.get('away_team_logo'),
                            'scheduled_at':  sched,
                            'home_win_prob': pred.get('home_win_prob'),
                            'draw_prob':     pred.get('draw_prob'),
                            'away_win_prob': pred.get('away_win_prob'),
                            'over_25_prob':  pred.get('over_25_prob'),
                            'btts_prob':     pred.get('btts_prob'),
                            'value_bet':     pred.get('value_bet'),
                            'confidence':    pred.get('confidence'),
                        }
                    )
                    synced += 1
                    self.stdout.write(f'    ✅ {m["home_team"]} vs {m["away_team"]} | {pred.get("value_bet")} | {pred.get("signal_category")}')

                self.stdout.write(f'  ✅ {league}: {synced} synced')

            except Exception as e:
                self.stdout.write(f'  ❌ {league} error: {e}')

        self.stdout.write('\n✅ Sync complete!')