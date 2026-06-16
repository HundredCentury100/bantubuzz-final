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
profile_trust_dimension = formula.profile_trust_dimension
reach_dimension = formula.reach_dimension
reviews_dimension = formula.reviews_dimension
sentiment_dimension = formula.sentiment_dimension
normalize_sentiment = formula.normalize_sentiment
normalize_platform_name = formula.normalize_platform_name
order_completion_dimension = formula.order_completion_dimension
response_rate_dimension = formula.response_rate_dimension
on_time_delivery_dimension = formula.on_time_delivery_dimension
select_primary_platform = formula.select_primary_platform
weighted_average_score = formula.weighted_average_score


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
        self.assertEqual(profile_trust_dimension(True, True, True, True, True), 100)

    def test_reviews_score_uses_last_twenty_formula(self):
        self.assertIsNone(reviews_dimension(None, 0, 0, 0))
        self.assertAlmostEqual(reviews_dimension(4.8, 10, 10, 10), 87.2, places=1)

    def test_marketplace_reliability_dimensions_exclude_missing_data(self):
        self.assertIsNone(order_completion_dimension(0, 0))
        self.assertEqual(order_completion_dimension(8, 10), 80)
        self.assertIsNone(response_rate_dimension(0, 0))
        self.assertEqual(response_rate_dimension(9, 10), 90)
        self.assertIsNone(on_time_delivery_dimension(0, 0))
        self.assertEqual(on_time_delivery_dimension(9, 10), 90)

    def test_final_score_uses_v11_weights(self):
        dimensions = {
            'engagement': 100,
            'reach': 80,
            'followers': 60,
            'sentiment': 50,
            'order_completion': 90,
            'response_rate': 80,
            'on_time_delivery': 70,
            'reviews': 87.2,
            'profile_trust': 100,
            'activity': 40,
        }
        self.assertAlmostEqual(final_creator_score(dimensions), 82.24, places=2)

    def test_final_score_excludes_missing_reviews_and_normalizes(self):
        dimensions = {
            'engagement': 100,
            'reach': 100,
            'followers': 100,
            'sentiment': 100,
            'order_completion': None,
            'response_rate': None,
            'on_time_delivery': None,
            'reviews': None,
            'profile_trust': 100,
            'activity': 100,
        }
        self.assertEqual(weighted_average_score(dimensions), 100)

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
