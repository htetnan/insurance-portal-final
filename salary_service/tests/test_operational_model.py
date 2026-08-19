import unittest

from app.operational_model import predict_operational
from app.salary_engine import ValidationError


class OperationalModelTest(unittest.TestCase):
    def test_forecast_returns_future_months_and_metrics(self):
        points = [
            {"month": f"2025-{month:02d}", "value": 100 + month * 3}
            for month in range(1, 13)
        ]
        result = predict_operational({"metric": "claims", "months_to_predict": 3, "points": points})
        self.assertEqual(result["metric"], "claims")
        self.assertEqual(len(result["predictions"]), 3)
        self.assertIn("mae", result["evaluation"])
        self.assertIn("selected_candidate", result["model"])
        self.assertGreaterEqual(result["predictions"][0]["rounded_count"], 0)

    def test_rejects_individual_decision_metric(self):
        with self.assertRaises(ValidationError):
            predict_operational({
                "metric": "claim_approval",
                "points": [
                    {"month": "2025-01", "value": 1},
                    {"month": "2025-02", "value": 2},
                    {"month": "2025-03", "value": 3},
                ],
            })


if __name__ == "__main__":
    unittest.main()
