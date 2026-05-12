# Verify platform analytics calculations
platforms = [
    {
        'platform': 'facebook',
        'account_name': 'Hundred Tech Academy',
        'followers': 1164,
        'total_posts': 25,
        'metrics': {
            'avg_engagement_rate': 0.0,
            'avg_views': 0,
            'avg_reach': 0,
            'avg_likes': 0
        }
    },
    {
        'platform': 'instagram',
        'account_name': 'hundredtechacademy',
        'followers': 9,
        'total_posts': 20,
        'metrics': {
            'avg_engagement_rate': 34.64,
            'avg_views': 2194,
            'avg_reach': 9,
            'avg_likes': 1
        }
    },
    {
        'platform': 'instagram',
        'account_name': 'hundred100group',
        'followers': 10,
        'total_posts': 16,
        'metrics': {
            'avg_engagement_rate': 0.0,
            'avg_views': 0,
            'avg_reach': 0,
            'avg_likes': 0
        }
    },
    {
        'platform': 'tiktok',
        'account_name': 'hundredtechacademy',
        'followers': 8,
        'total_posts': 2,
        'metrics': {
            'avg_engagement_rate': 0.0,
            'avg_views': 0,
            'avg_likes': 0
        }
    },
    {
        'platform': 'youtube',
        'account_name': '@hundredtechacademy',
        'followers': 39,
        'total_posts': 24,
        'metrics': {
            'avg_engagement_rate': 0.0,
            'avg_views': 610,
            'avg_likes': 9
        }
    }
]

print("=" * 80)
print("PLATFORM ANALYTICS CALCULATION BREAKDOWN")
print("=" * 80)

# 1. Total Followers
total_followers = sum(p['followers'] for p in platforms)
print(f'\n1. TOTAL FOLLOWERS: {total_followers:,}')
for p in platforms:
    print(f'   {p["platform"]:15} ({p["account_name"]:25}): {p["followers"]:5,} followers')

# 2. Total Views (avg_views * total_posts)
print(f'\n2. TOTAL VIEWS CALCULATION:')
total_views = 0
views_count = 0
for p in platforms:
    avg_views = p['metrics'].get('avg_views', 0)
    total_posts = p['total_posts']
    if avg_views > 0:
        platform_total = avg_views * total_posts
        total_views += platform_total
        views_count += 1
        print(f'   {p["platform"]:15} ({p["account_name"]:25}): {avg_views:6,} avg_views × {total_posts:2} posts = {platform_total:8,}')
print(f'   TOTAL VIEWS: {total_views:,}')

# 3. Total Reach (avg_reach * total_posts)
print(f'\n3. TOTAL REACH CALCULATION:')
total_reach = 0
reach_count = 0
for p in platforms:
    avg_reach = p['metrics'].get('avg_reach', 0)
    total_posts = p['total_posts']
    if avg_reach > 0:
        platform_total = avg_reach * total_posts
        total_reach += platform_total
        reach_count += 1
        print(f'   {p["platform"]:15} ({p["account_name"]:25}): {avg_reach:6,} avg_reach × {total_posts:2} posts = {platform_total:8,}')
print(f'   TOTAL REACH: {total_reach:,}')

# 4. Total Likes (avg_likes * total_posts)
print(f'\n4. TOTAL LIKES CALCULATION:')
total_likes = 0
for p in platforms:
    avg_likes = p['metrics'].get('avg_likes', 0)
    total_posts = p['total_posts']
    platform_total = avg_likes * total_posts
    if avg_likes > 0:
        total_likes += platform_total
        print(f'   {p["platform"]:15} ({p["account_name"]:25}): {avg_likes:6,} avg_likes × {total_posts:2} posts = {platform_total:8,}')
print(f'   TOTAL LIKES: {total_likes:,}')

# 5. Weighted Average Engagement Rate
print(f'\n5. AVERAGE ENGAGEMENT RATE CALCULATION (Weighted by Followers):')
weighted_engagement_sum = 0
total_followers_with_engagement = 0
for p in platforms:
    eng_rate = p['metrics'].get('avg_engagement_rate', 0)
    followers = p['followers']
    if eng_rate > 0 and followers > 0:
        weighted = eng_rate * followers
        weighted_engagement_sum += weighted
        total_followers_with_engagement += followers
        print(f'   {p["platform"]:15} ({p["account_name"]:25}): {eng_rate:6.2f}% × {followers:5,} followers = {weighted:10.2f}')

avg_engagement_rate = weighted_engagement_sum / total_followers_with_engagement if total_followers_with_engagement > 0 else 0
print(f'   Weighted Sum: {weighted_engagement_sum:.2f}')
print(f'   Total Followers with Engagement: {total_followers_with_engagement:,}')
print(f'   AVERAGE ENGAGEMENT RATE: {weighted_engagement_sum:.2f} ÷ {total_followers_with_engagement:,} = {avg_engagement_rate:.2f}%')

# 6. Platform Count
platform_count = len(platforms)
print(f'\n6. PLATFORMS: {platform_count}')

print("\n" + "=" * 80)
print("SUMMARY (What You Should See in UI):")
print("=" * 80)
print(f'Total Followers:          {total_followers:,}')
print(f'Total Views:              {total_views:,}')
print(f'Total Reach:              {total_reach:,}')
print(f'Total Likes:              {total_likes:,}')
print(f'Avg Engagement Rate:      {avg_engagement_rate:.2f}%')
print(f'Platforms:                {platform_count}')
print("=" * 80)

print("\n" + "=" * 80)
print("WHAT YOU REPORTED SEEING:")
print("=" * 80)
print(f'Total Followers:          1.2K    (Expected: {total_followers:,})')
print(f'Total Views:              58.5K   (Expected: {total_views:,})')
print(f'Total Reach:              180     (Expected: {total_reach:,})')
print(f'Total Likes:              236     (Expected: {total_likes:,})')
print(f'Avg Engagement Rate:      34.64%  (Expected: {avg_engagement_rate:.2f}%)')
print(f'Platforms:                5       (Expected: {platform_count})')
print("=" * 80)
