import unittest
from datetime import datetime, timedelta
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import SimpleNamespace


FORMULA_PATH = Path(__file__).parents[1] / 'app' / 'services' / 'creator_score_formula.py'
FORMULA_SPEC = spec_from_file_location('creator_score_formula', FORMULA_PATH)
formula = module_from_spec(FORMULA_SPEC)
FORMULA_SPEC.loader.exec_module(formula)

activity_dimension = formula.activity_dimension
engagement_dimension = formula.engagement_dimension
final_creator_score = formula.final_creator_score
follower_dimension = formula.follower_dimension
profile_quality_dimension = formula.profile_quality_dimension
reach_dimension = formula.reach_dimension
sentiment_dimension = formula.sentiment_dimension
normalize_sentiment = formula.normalize_sentiment
normalize_platform_name = formula.normalize_platform_name
select_primary_platform = formula.select_primary_platform


class CreatorScoreFormulaTests(unittest.TestCase):
    def test_engagement_is_normalized_and_capped(self):
        self.assertEqual(engagement_dimension(-1), 0)
        self.assertEqual(engagement_dimension(5), 50)
        self.assertEqual(engagement_dimension(10), 100)
        self.assertEqual(engagement_dimension(15), 100)

    def test_reach_uses_product_thresholds(self):
        self.assertEqual(reach_dimension(None, False), 0)
        self.assertEqual(reach_dimension(0.03), 10)
        self.assertEqual(reach_dimension(0.10), 25)
        self.assertEqual(reach_dimension(0.30), 50)
        self.assertEqual(reach_dimension(0.50), 70)
        self.assertEqual(reach_dimension(1.00), 100)
        self.assertEqual(reach_dimension(2.00), 100)

    def test_followers_use_dynamic_log_scale(self):
        self.assertEqual(follower_dimension(0, 1_000_000), 0)
        self.assertAlmostEqual(follower_dimension(1_000_000, 1_000_000), 100)
        self.assertAlmostEqual(follower_dimension(10_000, 1_000_000), 66.6667, places=3)

    def test_sentiment_normalizes_and_applies_penalties(self):
        self.assertEqual(sentiment_dimension(0.8), 80)
        self.assertEqual(normalize_sentiment(75), 75)
        self.assertEqual(sentiment_dimension(80, negative_percentage=11), 60)
        self.assertEqual(sentiment_dimension(80, critical_percentage=11), 40)
        self.assertEqual(sentiment_dimension(80, negative_percentage=20), 0)

    def test_activity_uses_sessions_and_inactivity_penalties(self):
        now = datetime.utcnow()
        self.assertEqual(activity_dimension(10, now, now), 10)
        self.assertEqual(activity_dimension(20, now, now), 40)
        self.assertEqual(activity_dimension(40, now, now), 60)
        self.assertEqual(activity_dimension(80, now, now), 80)
        self.assertEqual(activity_dimension(100, now, now), 100)
        self.assertEqual(activity_dimension(80, now - timedelta(days=31), now), 60)
        self.assertEqual(activity_dimension(80, now - timedelta(days=61), now), 40)

    def test_profile_quality_awards_each_element_equally(self):
        self.assertEqual(profile_quality_dimension(False, False, False, False, False), 0)
        self.assertEqual(profile_quality_dimension(True, True, True, True, True), 100)
        self.assertEqual(profile_quality_dimension(True, True, False, False, False), 40)

    def test_final_score_weights_each_raw_dimension_once(self):
        dimensions = {
            'engagement': 100,
            'reach': 80,
            'followers': 60,
            'sentiment': 50,
            'activity': 40,
            'profile_quality': 100,
        }
        self.assertEqual(final_creator_score(dimensions), 80)

    def test_primary_platform_uses_highest_connected_follower_count(self):
        platforms = [
            SimpleNamespace(id=1, platform='Instagram', followers=5000, is_connected=True),
            SimpleNamespace(id=2, platform='TikTok', followers=12000, is_connected=True),
            SimpleNamespace(id=3, platform='YouTube', followers=50000, is_connected=False),
        ]
        self.assertEqual(select_primary_platform(platforms).platform, 'TikTok')
        self.assertEqual(normalize_platform_name('X/Twitter'), 'twitter')


if __name__ == '__main__':
    unittest.main()
