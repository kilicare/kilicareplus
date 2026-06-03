# KILICAREGO+ PRO MAX — AI BETTING ASSISTANT IMPLEMENTATION GUIDE

## OVERVIEW

This document outlines the complete implementation of the advanced AI Betting Assistant integrated with the KilicareGO+ predictions module.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TypeScript)                  │
│  Predictions Page → AI Chat Mode (Premium Users)                │
│  Natural Language Input → Match Prediction with Explanations    │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP POST/GET
┌────────────────▼────────────────────────────────────────────────┐
│                   BACKEND (Django/DRF)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AI Chat Module (apps/ai_chat/)                          │   │
│  │ - betting_utils.py: Fuzzy matching, explanations        │   │
│  │ - views.py: Prediction endpoints + stream chat          │   │
│  │ - services.py: Groq AI integration + betting prompts    │   │
│  │ - urls.py: API routes                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬───────────────────┬──────────────────────────────────┘
         │                   │
┌────────▼──────────┐  ┌─────▼───────────────┐
│  Predictor Engine │  │  Groq AI API        │
│  (Port 8001)      │  │  (llama-3.3-70b)    │
│  Football ML      │  │  Chat Completions   │
│  Predictions      │  │  + Whisper ASR      │
└───────────────────┘  └─────────────────────┘
```

---

## FILES CREATED/MODIFIED

### 1. **backend/apps/ai_chat/betting_utils.py** (NEW)

Core betting AI utilities:

- **Team Registry**: Fuzzy matchable team database (800+ teams)
- **Fuzzy Matching**: `find_team()` with typo tolerance
- **Query Parsing**: `find_teams_in_query()` extracts matches from natural language
- **Explanation Engine**: Human-readable metric explanations
- **Accumulator Builder**: Suggests multi-leg accumulators

### 2. **backend/apps/ai_chat/services.py** (MODIFIED)

Added:
- `BETTING_SYSTEM_PROMPT_EN`: Specialized betting AI instructions
- `BETTING_SYSTEM_PROMPT_SW`: Swahili betting AI instructions
- Updated `build_messages()` to accept `context` parameter ('tourism' or 'betting')

### 3. **backend/apps/ai_chat/views.py** (MODIFIED)

Updated:
- `chat_stream_view()`: Now accepts `context` parameter for different AI modes
- Added `/betting/predict/` endpoint: Match prediction with explanations
- Added `/betting/accumulator/` endpoint: Accumulator suggestions

### 4. **backend/apps/ai_chat/urls.py** (MODIFIED)

Added:
- `path('betting/predict/', views.betting_predict_view)`
- `path('betting/accumulator/', views.betting_accumulator_view)`

### 5. **backend/core/settings/base.py** (MODIFIED)

Added:
- `PREDICTOR_ENGINE_URL = env('PREDICTOR_ENGINE_URL', default='http://localhost:8001')`

### 6. **frontend/src/app/(betting)/predictions/page.tsx** (MODIFIED)

Replaced `AIChatMode()` component with:
- Natural language query parsing for match requests
- Call to `/api/ai-chat/betting/predict/` for predictions
- Inline explanation display
- Conversational memory within session
- Support for premium-only features

---

## ENVIRONMENT VARIABLES

Add to `.env` file:

```env
# Predictor Engine (internal service)
PREDICTOR_ENGINE_URL=http://localhost:8001

# Groq API (already exists)
GROQ_API_KEY=your_groq_api_key_here
```

---

## API ENDPOINTS

### 1. POST `/api/ai-chat/betting/predict/`

**Purpose**: Get prediction for a match with full explanations

**Request**:
```json
{
  "query": "Chelsea vs Arsenal",
  "league": "EPL"  // Optional
}
```

**Response**:
```json
{
  "home_team": "Chelsea",
  "away_team": "Arsenal",
  "league": "EPL",
  "prediction": {
    "home_win_prob": 0.52,
    "draw_prob": 0.25,
    "away_win_prob": 0.23,
    "over_25_prob": 0.48,
    "btts_prob": 0.62,
    "confidence": 0.78,
    "signal_category": "⚡ MEDIUM",
    "home_elo": 1650,
    "away_elo": 1580,
    "value_bet": "Chelsea WIN"
  },
  "explanations": {
    "match_analysis": "The model favors a home win.",
    "confidence_note": "Confidence: 78.0% — High confidence — the model strongly favors this outcome.",
    "elo_insight": "Home team is notably stronger (70 ELO difference).",
    "probability_summary": "Home win: High likelihood (52.0%) | Draw: Moderate possibility (25.0%) | Away win: Unlikely (23.0%)",
    "btts_outlook": "There is a relatively high chance that both teams will score at least one goal.",
    "over_goals_outlook": "The model sees almost equal chances of the match producing more than 2.5 goals.",
    "betting_signal": "Decent edge identified. Worth considering.",
    "best_market": "Best market: Home Win (1)",
    "risk_level": "Risk: MEDIUM — Reasonable edge, but hedge bets"
  }
}
```

### 2. POST `/api/ai-chat/betting/accumulator/`

**Purpose**: Build accumulator suggestions from matches

**Request**:
```json
{
  "matches": [
    {
      "home_team": "Chelsea",
      "away_team": "Arsenal",
      "home_win_prob": 0.52,
      "draw_prob": 0.25,
      "away_win_prob": 0.23,
      "confidence": 0.78,
      "value_bet": "Chelsea WIN"
    },
    // ... more matches
  ],
  "size": 3
}
```

**Response**:
```json
{
  "accumulators": [
    {
      "name": "Safest Accumulator",
      "type": "favorites",
      "legs": [
        {
          "match": "Chelsea vs Arsenal",
          "pick": "Chelsea Win",
          "confidence": 0.78
        }
        // ... more legs
      ],
      "combined_confidence": 0.72
    }
  ],
  "count": 1
}
```

### 3. POST `/api/ai-chat/chat/stream/`

**Purpose**: Streaming AI chat response

**Updated Request** (new parameter):
```json
{
  "message": "Explain how ELO ratings affect predictions",
  "thread_id": 123,
  "lang": "en",
  "context": "betting"  // NEW: "tourism" or "betting"
}
```

---

## FEATURES IMPLEMENTED

### ✅ Fuzzy Team Matching

```python
# Typo tolerance examples
find_team("Chelse")           → "Chelsea"
find_team("Man City")         → "Manchester City"
find_team("Barca")            → "Barcelona"
find_team("PSJ")              → "PSG"
```

### ✅ Natural Language Query Parsing

```python
# All these are understood
"Chelsea vs Arsenal"
"Man City - Liverpool"
"Who wins Real Madrid vs Barca?"
"Barcelona dhidi ya Real Madrid"
"Juventus against Inter"
```

### ✅ League Auto-Detection

```python
"Chelsea vs Arsenal"          → EPL (auto-detected)
"Real Madrid vs Barcelona"    → LA_LIGA (auto-detected)
"Bayern vs Dortmund"          → BUNDESLIGA (auto-detected)
```

### ✅ Explanation Engine

Every prediction metric includes:
- Raw value
- Human-readable explanation
- Betting interpretation
- Risk assessment

### ✅ Conversational Memory

Within a chat session:
- User can ask follow-ups about current prediction
- AI remembers match context
- No need to repeat team names

### ✅ Premium-Only Feature

- AI Chat mode locked for non-premium users
- Reuses existing subscription system
- Uses `request.user.subscriptions` filter

---

## TESTING CHECKLIST

### 1. Fuzzy Matching
```bash
# Test typo tolerance
curl -X POST http://localhost:8000/api/ai-chat/betting/predict/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Chelse vs Arsnal"}'
```

### 2. Natural Language
```bash
# Test match parsing
curl -X POST http://localhost:8000/api/ai-chat/betting/predict/ \
  -H "Authorization: Bearer TOKEN" \
  -d '{"query": "Who wins Barcelona vs Real Madrid?"}'
```

### 3. Explanation Engine
```bash
# Verify all explanations are generated
curl -X POST http://localhost:8000/api/ai-chat/betting/predict/ \
  -H "Authorization: Bearer TOKEN" \
  -d '{"query": "Chelsea vs Arsenal"}' | jq '.explanations'
```

### 4. Premium Access
```bash
# Non-premium user should see lock screen
# Premium user should see full AI chat
```

### 5. Predictor Integration
```bash
# Verify predictor engine is called correctly
# Check logs for predictor requests
tail -f /var/log/predictor.log
```

---

## CONFIGURATION

### Django Settings

```python
# core/settings/base.py

# Already configured:
GROQ_API_KEY = env('GROQ_API_KEY')

# Add this:
PREDICTOR_ENGINE_URL = env('PREDICTOR_ENGINE_URL', default='http://localhost:8001')
```

### Frontend Configuration

```typescript
// No special configuration needed
// Uses existing API service (axios instance)
// Automatically authenticated with JWT token
```

### Predictor Service

```bash
# Make sure predictor is running on port 8001
python predictor/main.py
# or
docker run -p 8001:8000 predictor-service
```

---

## TROUBLESHOOTING

### Issue: "Predictor engine unavailable"

**Cause**: PREDICTOR_ENGINE_URL not reachable

**Solution**:
1. Check predictor service is running: `curl http://localhost:8001/api/accuracy`
2. Verify PREDICTOR_ENGINE_URL in settings
3. Check network connectivity if remote service

### Issue: "Could not parse teams from query"

**Cause**: Team names not recognized

**Solution**:
1. Use full team names: "Chelsea FC" instead of "Che"
2. Use common aliases: "Man City" is understood
3. Add more aliases to TEAM_REGISTRY if needed

### Issue: "Prediction request blocked"

**Cause**: User not premium

**Solution**:
1. Verify user has active premium subscription
2. Check subscription status endpoint
3. Ensure JWT token is valid

### Issue: Slow prediction response

**Cause**: Multiple backend calls

**Solution**:
1. Add caching for repeated predictions (same team + league)
2. Check predictor engine performance
3. Consider async prediction calls

---

## FUTURE ENHANCEMENTS

### Suggested Improvements

1. **Caching**
   - Cache predictions for 1 hour
   - Reduce predictor engine load

2. **Live Odds Integration**
   - Fetch real odds from sportsbooks
   - Calculate edge vs market odds
   - Show "Value Bet" recommendations

3. **Bet Slip Integration**
   - Add predictions directly to bet slip
   - Multi-leg accumulator building
   - Odds calculation

4. **Historical Accuracy**
   - Track prediction accuracy per model
   - Show track record to users
   - Confidence calibration

5. **Team News Integration**
   - Auto-fetch injury news
   - Include in explanation
   - Adjust predictions

6. **Live Betting**
   - In-play prediction updates
   - Dynamic odds monitoring
   - Real-time AI analysis

---

## API INTEGRATION EXAMPLES

### JavaScript/TypeScript

```typescript
// Make a prediction request
const response = await fetch('/api/ai-chat/betting/predict/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'Chelsea vs Arsenal',
  }),
});

const data = await response.json();
console.log(data.explanations.best_market);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:8000/api/ai-chat/betting/predict/',
    headers={'Authorization': f'Bearer {token}'},
    json={'query': 'Man City vs Liverpool'},
)

prediction = response.json()
print(prediction['explanations']['confidence_note'])
```

---

## PERFORMANCE TARGETS

| Metric | Target | Notes |
|--------|--------|-------|
| Prediction API Response | < 5 seconds | Including predictor call |
| Fuzzy Matching | < 50ms | In-memory lookup |
| Explanation Generation | < 100ms | Text formatting only |
| Chat Stream Start | < 1 second | Groq API latency |

---

## MONITORING

Monitor these endpoints in production:

```bash
# Health check (predictor availability)
GET http://localhost:8001/api/accuracy

# AI Chat rate limiting
Check daily_message_count in UserAIPreference model

# Betting prediction popularity
SELECT COUNT(*) FROM ai_chat_aithreadmessage WHERE content LIKE '%vs%'
```

---

## SUPPORT

For issues or questions:

1. Check logs: `tail -f /var/log/gunicorn.log`
2. Test predictor: `curl http://localhost:8001/api/predict?home_team=Chelsea&away_team=Arsenal&league=EPL`
3. Verify Groq API: `curl -H "Authorization: Bearer $GROQ_KEY" https://api.groq.com/openai/v1/models`

---

## DEPLOYMENT CHECKLIST

- [ ] Environment variables set (.env)
- [ ] Predictor service running and accessible
- [ ] Groq API key configured and valid
- [ ] Django migrations run
- [ ] Static files collected (if needed)
- [ ] Frontend build successful
- [ ] Testing completed
- [ ] Premium feature flag working
- [ ] Rate limiting tested
- [ ] Error handling verified
