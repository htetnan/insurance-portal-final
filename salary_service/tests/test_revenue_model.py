import unittest

from app.revenue_model import predict_revenue
from app.salary_engine import ValidationError


class RevenueModelTests(unittest.TestCase):
    def test_linear_model_predicts_next_months(self):
        result = predict_revenue({
            "currency": "MMK",
            "months_to_predict": 3,
            "points": [
                {"month": "2026-01", "revenue": 100000},
                {"month": "2026-02", "revenue": 120000},
                {"month": "2026-03", "revenue": 140000},
            ],
        })
        self.assertEqual(result["model"]["name"], "linear_regression_time_series")
        self.assertEqual(result["model"]["library"], "scikit-learn")
        self.assertEqual(result["predictions"][0]["predicted_revenue"], 160000.0)
        self.assertEqual(len(result["predictions"]), 3)
        self.assertEqual(result["evaluation"]["method"], "chronological_one_step_holdout")

    def test_preprocessing_merges_duplicates_and_fills_gaps(self):
        result = predict_revenue({"points": [
            {"month": "2026-01", "revenue": 100},
            {"month": "2026-01", "revenue": 50},
            {"month": "2026-03", "revenue": 200},
        ]})
        self.assertEqual(result["preprocessing"]["duplicates_merged"], 1)
        self.assertEqual(result["preprocessing"]["missing_months_filled"], 1)
        self.assertEqual(result["history"], [
            {"month": "2026-01", "revenue": 150.0},
            {"month": "2026-02", "revenue": 0.0},
            {"month": "2026-03", "revenue": 200.0},
        ])

    def test_evaluation_uses_time_order_and_baseline(self):
        points = [
            {"month": f"2025-{month:02d}", "revenue": 100000 + month * 10000}
            for month in range(1, 13)
        ]
        result = predict_revenue({"points": points})
        evaluation = result["evaluation"]
        self.assertEqual(evaluation["train_records"] + evaluation["test_records"], 12)
        self.assertEqual(evaluation["baseline"], "previous_month_revenue")
        self.assertIn("mae", evaluation)
        self.assertIn("rmse", evaluation)
        self.assertIn("beats_baseline", evaluation)
        candidate_features = [
            feature
            for candidate in evaluation["model_comparison"]
            for feature in candidate["features"]
        ]
        self.assertIn("previous_month_revenue", candidate_features)
        self.assertEqual(result["model"]["selection_metric"], "holdout_mae")

    def test_prediction_has_uncertainty_bounds(self):
        points = [
            {"month": f"2025-{month:02d}", "revenue": 50000 + (month % 3) * 1000}
            for month in range(1, 13)
        ]
        prediction = predict_revenue({"points": points})["predictions"][0]
        self.assertLessEqual(prediction["lower_bound"], prediction["predicted_revenue"])
        self.assertGreaterEqual(prediction["upper_bound"], prediction["predicted_revenue"])

    def test_rejects_negative_revenue(self):
        with self.assertRaises(ValidationError):
            predict_revenue({"points": [
                {"month": "2026-01", "revenue": 1},
                {"month": "2026-02", "revenue": -2},
                {"month": "2026-03", "revenue": 3},
            ]})


if __name__ == "__main__":
    unittest.main()
