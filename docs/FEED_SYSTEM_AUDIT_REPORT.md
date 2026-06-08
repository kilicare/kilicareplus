# FEED SYSTEM AUDIT REPORT
## Dynamic Ranking Algorithm Implementation

---

## 1. CURRENT SYSTEM WEAKNESSES

### 1.1 Global Caching Problem
**Location**: `backend/apps/moments/views.py:21-58`

```python
cache_key = f"feed_page_{page}"  # Same for ALL users
cached_data = cache.get(cache_key)
if cached_data is not None:
    return Response(cached_data)
```

**Problem**: All users see identical feed content. No personalization or session diversity.

### 1.2 Static Ordering
**Location**: `backend/apps/moments/views.py:43`

```python
.order_by('-trending_score', '-created_at')
```

**Problem**: Same posts appear first every refresh. No controlled randomness or rotation.

### 1.3 Simple Trending Score
**Location**: `backend/apps/moments/tasks.py:14-19`

```python
score = (
    moment.likes.count() * 3 +
    moment.comments.count() * 2 +
    moment.views * 0.1 +
    moment.shares * 4
)
```

**Problem**: No time decay factor. Old viral posts stay at top forever.

### 1.4 No User Session Tracking
**Problem**: No tracking of which posts user has already seen. No anti-repetition system.

### 1.5 No Personalization
**Problem**: No consideration of:
- User interests
- View history
- Engagement patterns
- Location relevance
- Follow relationships

### 1.6 Frontend Caching Issues
**Location**: `frontend/src/app/(main)/feed/page.tsx:808-815`

```typescript
useInfiniteQuery({
  queryKey: ['feed'],  // Global cache key
  staleTime: 1000 * 60 * 2,  // 2 minutes
})
```

**Problem**: Frontend also uses global caching, reinforcing repetition.

---

## 2. IMPROVED ARCHITECTURE

### 2.1 Multi-Layer Ranking System

```
┌─────────────────────────────────────────┐
│         User Session Layer               │
│  - Track seen posts per session          │
│  - Apply exclusion list                  │
│  - Session-based diversity               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Personalization Layer               │
│  - User interest scoring                 │
│  - Location relevance                    │
│  - Follow graph boost                    │
│  - View history penalty                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│       Engagement Scoring Layer          │
│  - Time-decayed trending score           │
│  - Engagement velocity                   │
│  - Quality signals                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Diversity & Rotation Layer         │
│  - Controlled randomness                 │
│  - Content source diversity             │
│  - Anti-repetition buffer               │
└─────────────────────────────────────────┘
```

### 2.2 Per-User Caching Strategy

```python
# Instead of global cache:
cache_key = f"feed_page_{page}"

# Use per-user cache with session ID:
cache_key = f"feed_user_{user.id}_session_{session_id}_page_{page}"
```

### 2.3 Time-Decayed Trending Score

```
Trending Score = (Engagement Score × Time Decay) × Randomness Factor

Where:
- Engagement Score = likes×3 + comments×2 + views×0.1 + shares×4
- Time Decay = e^(-λ × age_in_hours)  # Exponential decay
- Randomness Factor = 0.8 to 1.2 (controlled jitter)
```

---

## 3. DATABASE SCHEMA CHANGES

### 3.1 New Models Required

```python
# backend/apps/moments/models.py additions

class UserFeedSession(models.Model):
    """Track user feed sessions for anti-repetition"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session_id = models.CharField(max_length=100)  # UUID
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    seen_posts = models.JSONField(default=list)  # List of moment IDs
    
    class Meta:
        unique_together = ('user', 'session_id')
        indexes = [
            models.Index(fields=['user', 'last_active']),
        ]

class MomentViewHistory(models.Model):
    """Track which posts user has viewed for personalization"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    moment = models.ForeignKey(Moment, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)
    view_duration = models.PositiveIntegerField(default=0)  # seconds
    engaged = models.BooleanField(default=False)  # liked/commented/saved
    
    class Meta:
        unique_together = ('user', 'moment')
        indexes = [
            models.Index(fields=['user', 'viewed_at']),
            models.Index(fields=['moment', 'viewed_at']),
        ]

class UserInterestProfile(models.Model):
    """Track user interests for personalization"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    location_preferences = models.JSONField(default=list)  # Preferred locations
    content_type_weights = models.JSONField(default=dict)  # {'image': 0.7, 'video': 0.3}
    engagement_patterns = models.JSONField(default=dict)  # Time of day, etc.
    updated_at = models.DateTimeField(auto_now=True)
```

### 3.2 Moment Model Enhancements

```python
# Add to existing Moment model
class Moment(models.Model):
    # ... existing fields ...
    
    # New fields for ranking
    engagement_velocity = models.FloatField(default=0.0)  # Engagement rate per hour
    quality_score = models.FloatField(default=0.0)  # AI-detected quality
    last_engagement_spike = models.DateTimeField(null=True, blank=True)
    
    # Indexes for ranking queries
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-trending_score', '-created_at']),
            models.Index(fields=['-engagement_velocity', '-created_at']),
            models.Index(fields=['visibility', '-created_at']),
        ]
```

---

## 4. IMPLEMENTATION CODE

### 4.1 Enhanced Ranking Algorithm

```python
# backend/apps/moments/ranking.py

import math
import random
from datetime import datetime, timedelta
from django.db.models import Q, Count, F, ExpressionWrapper, FloatField
from django.db.models.functions import Now
from .models import Moment, UserFeedSession, MomentViewHistory


class FeedRankingEngine:
    """TikTok-style dynamic ranking engine"""
    
    # Time decay parameters
    TIME_DECAY_LAMBDA = 0.05  # Decay rate per hour
    ENGAGEMENT_WINDOW_HOURS = 24  # Consider engagement in last 24h
    
    # Scoring weights
    WEIGHTS = {
        'likes': 3.0,
        'comments': 2.0,
        'views': 0.1,
        'shares': 4.0,
        'saves': 2.5,
    }
    
    # Diversity parameters
    RANDOMNESS_FACTOR = 0.2  # 20% controlled randomness
    SEEN_POST_PENALTY = 0.3  # Reduce score by 30% if seen before
    
    @staticmethod
    def calculate_time_decay(moment_age_hours):
        """Exponential time decay function"""
        return math.exp(-FeedRankingEngine.TIME_DECAY_LAMBDA * moment_age_hours)
    
    @staticmethod
    def calculate_engagement_score(moment):
        """Calculate base engagement score"""
        return (
            moment.likes.count() * FeedRankingEngine.WEIGHTS['likes'] +
            moment.comments.count() * FeedRankingEngine.WEIGHTS['comments'] +
            moment.views * FeedRankingEngine.WEIGHTS['views'] +
            moment.shares * FeedRankingEngine.WEIGHTS['shares'] +
            moment.saves.count() * FeedRankingEngine.WEIGHTS['saves']
        )
    
    @staticmethod
    def calculate_engagement_velocity(moment):
        """Calculate engagement rate per hour"""
        age_hours = (datetime.now() - moment.created_at).total_seconds() / 3600
        if age_hours < 1:
            age_hours = 1  # Avoid division by zero
        
        recent_engagement = (
            moment.likes.filter(created_at__gte=datetime.now() - timedelta(hours=FeedRankingEngine.ENGAGEMENT_WINDOW_HOURS)).count() * FeedRankingEngine.WEIGHTS['likes'] +
            moment.comments.filter(created_at__gte=datetime.now() - timedelta(hours=FeedRankingEngine.ENGAGEMENT_WINDOW_HOURS)).count() * FeedRankingEngine.WEIGHTS['comments']
        )
        
        return recent_engagement / age_hours
    
    @staticmethod
    def calculate_personalization_boost(user, moment):
        """Calculate personalization score based on user history"""
        boost = 1.0
        
        # Check if user has viewed this moment before
        try:
            view_history = MomentViewHistory.objects.get(user=user, moment=moment)
            if view_history.engaged:
                boost += 0.2  # Boost if user engaged before
            else:
                boost -= FeedRankingEngine.SEEN_POST_PENALTY  # Penalty if just viewed
        except MomentViewHistory.DoesNotExist:
            # New content - slight boost for discovery
            boost += 0.1
        
        # Location relevance
        if moment.location and user.profile and user.profile.location:
            if moment.location.lower() in user.profile.location.lower():
                boost += 0.15
        
        # Follow relationship boost
        if moment.posted_by in user.following.all():
            boost += 0.25
        
        return max(0.1, boost)  # Minimum boost of 0.1
    
    @staticmethod
    def calculate_final_score(user, moment, session_seen_posts=None):
        """Calculate final ranking score with all factors"""
        if session_seen_posts is None:
            session_seen_posts = []
        
        # Base engagement score
        engagement_score = FeedRankingEngine.calculate_engagement_score(moment)
        
        # Time decay
        age_hours = (datetime.now() - moment.created_at).total_seconds() / 3600
        time_decay = FeedRankingEngine.calculate_time_decay(age_hours)
        
        # Engagement velocity (recent activity boost)
        velocity = FeedRankingEngine.calculate_engagement_velocity(moment)
        velocity_boost = min(velocity * 0.5, 2.0)  # Cap at 2x boost
        
        # Personalization
        personalization = FeedRankingEngine.calculate_personalization_boost(user, moment)
        
        # Session-based penalty
        session_penalty = 1.0
        if moment.id in session_seen_posts:
            session_penalty = 1.0 - FeedRankingEngine.SEEN_POST_PENALTY
        
        # Controlled randomness
        randomness = random.uniform(
            1.0 - FeedRankingEngine.RANDOMNESS_FACTOR,
            1.0 + FeedRankingEngine.RANDOMNESS_FACTOR
        )
        
        # Final score calculation
        final_score = (
            engagement_score * 
            time_decay * 
            velocity_boost * 
            personalization * 
            session_penalty * 
            randomness
        )
        
        return final_score
    
    @staticmethod
    def rank_moments(user, moments, session_seen_posts=None, limit=20):
        """Rank moments using the algorithm and return top N"""
        scored_moments = []
        
        for moment in moments:
            score = FeedRankingEngine.calculate_final_score(
                user, moment, session_seen_posts
            )
            scored_moments.append((moment, score))
        
        # Sort by score descending
        scored_moments.sort(key=lambda x: x[1], reverse=True)
        
        # Return top N moments
        return [moment for moment, score in scored_moments[:limit]]
```

### 4.2 Updated Feed View

```python
# backend/apps/moments/views.py (updated)

import uuid
from django.utils import timezone
from .ranking import FeedRankingEngine
from .models import UserFeedSession

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feed_view(request):
    """Dynamic ranked feed with personalization and anti-repetition"""
    page = int(request.query_params.get('page', 1))
    page_size = 20
    offset = (page - 1) * page_size
    
    # Get or create user session
    session_id = request.headers.get('X-Session-ID', str(uuid.uuid4()))
    session, created = UserFeedSession.objects.get_or_create(
        user=request.user,
        session_id=session_id,
        defaults={
            'seen_posts': [],
            'last_active': timezone.now()
        }
    )
    
    # Update session activity
    session.last_active = timezone.now()
    session.save()
    
    # Per-user cache key
    cache_key = f"feed_user_{request.user.id}_session_{session_id}_page_{page}"
    cached_data = cache.get(cache_key)
    
    # Shorter TTL for dynamic feeds (1 minute instead of 5)
    if cached_data is not None:
        return Response(cached_data)
    
    # Get candidate moments (larger pool for ranking)
    candidate_moments = Moment.objects.filter(
        visibility='PUBLIC'
    ).select_related(
        'posted_by', 'posted_by__profile', 'posted_by__passport'
    ).prefetch_related(
        'likes', 'comments', 'saves'
    ).annotate(
        like_count=Count('likes', distinct=True),
        comment_count=Count('comments', distinct=True),
    )
    
    # Apply ranking algorithm
    ranked_moments = FeedRankingEngine.rank_moments(
        user=request.user,
        moments=candidate_moments,
        session_seen_posts=session.seen_posts,
        limit=page_size * 2  # Get more for pagination buffer
    )
    
    # Apply pagination
    paginated_moments = ranked_moments[offset:offset + page_size]
    
    # Update session seen posts
    new_seen_posts = [m.id for m in paginated_moments]
    session.seen_posts = list(set(session.seen_posts + new_seen_posts))
    session.save()
    
    total = Moment.objects.filter(visibility='PUBLIC').count()
    serializer = MomentSerializer(
        paginated_moments, many=True, context={'request': request}
    )
    
    response_data = {
        'results': serializer.data,
        'count': total,
        'page': page,
        'has_next': (offset + page_size) < total,
        'session_id': session_id,
    }
    
    # Cache with shorter TTL for dynamic feel
    cache.set(cache_key, response_data, 60)  # 1 minute
    return Response(response_data)
```

### 4.3 Frontend Session Management

```typescript
// frontend/src/hooks/useFeedSession.ts

import { useState, useEffect } from 'react'

export function useFeedSession() {
  const [sessionId, setSessionId] = useState<string>('')
  
  useEffect(() => {
    // Get existing session ID or create new one
    let sid = localStorage.getItem('feed_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('feed_session_id', sid)
    }
    setSessionId(sid)
  }, [])
  
  const resetSession = () => {
    const newSid = crypto.randomUUID()
    localStorage.setItem('feed_session_id', newSid)
    setSessionId(newSid)
  }
  
  return { sessionId, resetSession }
}
```

```typescript
// Updated feed page usage

import { useFeedSession } from '@/hooks/useFeedSession'

// In feed component:
const { sessionId } = useFeedSession()

// Update API call to include session ID
const { data } = await api.get<FeedResponse>(
  `/api/moments/feed/?page=${page}`,
  { headers: { 'X-Session-ID': sessionId } }
)
```

### 4.4 Async Trending Score Update

```python
# backend/apps/moments/tasks.py (enhanced)

@shared_task
def update_trending_score_task(moment_id):
    """Enhanced async task to update trending score with time decay"""
    from .models import Moment
    from .ranking import FeedRankingEngine
    
    try:
        moment = Moment.objects.get(pk=moment_id)
        
        # Calculate engagement score
        engagement_score = FeedRankingEngine.calculate_engagement_score(moment)
        
        # Calculate engagement velocity
        velocity = FeedRankingEngine.calculate_engagement_velocity(moment)
        
        # Apply time decay
        age_hours = (timezone.now() - moment.created_at).total_seconds() / 3600
        time_decay = FeedRankingEngine.calculate_time_decay(age_hours)
        
        # Final trending score
        final_score = engagement_score * time_decay * (1 + min(velocity, 2.0))
        
        Moment.objects.filter(pk=moment.pk).update(
            trending_score=final_score,
            engagement_velocity=velocity
        )
        
        logger.info(f"[Trending] Updated score for moment {moment_id}: {final_score}")
    except Moment.DoesNotExist:
        logger.error(f"[Trending] Moment {moment_id} not found for trending update")
    except Exception as e:
        logger.error(f"[Trending] Error updating trending score for moment {moment_id}: {e}")

@shared_task
def update_all_trending_scores():
    """Periodic task to update all trending scores (run every hour)"""
    from .models import Moment
    from .ranking import FeedRankingEngine
    
    moments = Moment.objects.filter(visibility='PUBLIC')
    for moment in moments:
        update_trending_score_task.delay(moment.pk)
```

---

## 5. MIGRATION STEPS

### 5.1 Database Migrations

```bash
# Create migrations for new models
python manage.py makemigrations moments

# Apply migrations
python manage.py migrate
```

### 5.2 Gradual Rollout Strategy

1. **Phase 1**: Add new models and tracking (no ranking changes)
2. **Phase 2**: Implement ranking engine but keep old ordering as fallback
3. **Phase 3**: Enable ranking for 10% of users (A/B test)
4. **Phase 4**: Monitor metrics and adjust weights
5. **Phase 5**: Full rollout to all users

### 5.3 Performance Considerations

- Add database indexes on new fields
- Use Redis for session storage (faster than DB)
- Consider materialized views for heavy ranking calculations
- Implement batch ranking updates instead of real-time for large datasets

---

## 6. MONITORING & METRICS

### 6.1 Key Metrics to Track

- Feed diversity (unique posts per session)
- User engagement rate after changes
- Time spent in feed
- Repeat post rate (should decrease)
- Ranking calculation performance
- Cache hit rate (should decrease due to per-user caching)

### 6.2 A/B Testing Framework

```python
# Simple A/B test integration
import random

def should_use_new_ranking(user):
    """Determine if user should see new ranking (30% rollout)"""
    return hash(user.id) % 100 < 30
```

---

## 7. EXPECTED OUTCOMES

### 7.1 Before Implementation
- Same posts appear first every refresh
- No personalization
- Static ordering
- Global caching causes repetition

### 7.2 After Implementation
- Dynamic feed on every refresh
- Personalized based on user history
- Time-decayed trending (fresh content prioritized)
- Session-based anti-repetition
- Controlled randomness for diversity
- Per-user caching for personalization

---

## 8. SUMMARY

The current feed system uses global caching and static ordering, causing repetitive content. The proposed solution implements:

1. **Multi-layer ranking algorithm** (engagement + time decay + personalization)
2. **Per-user session tracking** for anti-repetition
3. **Time-decayed trending scores** to prioritize fresh content
4. **Controlled randomness** for diversity
5. **Personalization engine** based on user history and preferences

This transforms the feed from a static, repetitive list into a dynamic, personalized experience similar to TikTok/Instagram.
