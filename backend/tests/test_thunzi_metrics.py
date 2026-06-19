import unittest
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


HELPER_PATH = Path(__file__).parents[1] / 'app' / 'utils' / 'thunzi_metrics.py'
HELPER_SPEC = spec_from_file_location('thunzi_metrics', HELPER_PATH)
helpers = module_from_spec(HELPER_SPEC)
HELPER_SPEC.loader.exec_module(helpers)


class ThunziMetricNormalizerTests(unittest.TestCase):
    def test_engagement_rate_normalizes_fraction_to_percent(self):
        self.assertEqual(helpers.normalize_engagement_rate_percent(0.052), 5.2)
        self.assertEqual(helpers.normalize_engagement_rate_percent(5.2), 5.2)
        self.assertEqual(helpers.normalize_engagement_rate_percent(0), 0)
        self.assertIsNone(helpers.normalize_engagement_rate_percent(None))

    def test_sentiment_fraction_normalizes_common_scales(self):
        self.assertEqual(helpers.normalize_sentiment_fraction(0.75), 0.75)
        self.assertEqual(helpers.normalize_sentiment_fraction(75), 0.75)
        self.assertEqual(helpers.normalize_sentiment_fraction(-50), 0.25)
        self.assertEqual(helpers.normalize_sentiment_0_100(0.75), 75)
        self.assertEqual(helpers.normalize_sentiment_0_100(75), 75)

    def test_post_sentiment_score_uses_negative_to_positive_scale(self):
        self.assertEqual(helpers.normalize_post_sentiment_score(0.75), 50)
        self.assertEqual(helpers.normalize_post_sentiment_score(75), 50)
        self.assertEqual(helpers.normalize_post_sentiment_score(-0.5), -50)
        self.assertEqual(helpers.normalize_post_sentiment_score(-50), -50)
        self.assertEqual(helpers.sentiment_label_from_score(50), 'positive')
        self.assertEqual(helpers.sentiment_label_from_score(0), 'neutral')
        self.assertEqual(helpers.sentiment_label_from_score(-50), 'negative')


if __name__ == '__main__':
    unittest.main()
