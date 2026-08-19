import csv
import json
import tempfile
import unittest
from pathlib import Path

from data_generator.evaluate_revenue_dataset import evaluate
from data_generator.generate_insurance_data import SCALABLE_TABLES, generate_profile


class DataGeneratorTests(unittest.TestCase):
    def test_balanced_profile_has_exact_total_and_valid_model_data(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            manifest = generate_profile("balanced", output, size=150)
            self.assertEqual(manifest["business_database_total"], 150)
            self.assertTrue((output / "synthetic_seed.sql").exists())
            result = evaluate(output / "revenue_monthly.csv", output / "model_evaluation.json", months=2)
            self.assertEqual(len(result["history"]), 60)
            self.assertEqual(len(result["predictions"]), 2)

    def test_revenue_profile_has_exact_payment_count(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            manifest = generate_profile("revenue", output, size=150)
            self.assertEqual(manifest["counts"]["payments"], 150)
            with (output / "payments_ml_15000.csv").open(encoding="utf-8", newline="") as handle:
                self.assertEqual(sum(1 for _ in csv.DictReader(handle)), 150)

    def test_full_profile_has_requested_count_for_every_scalable_table(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = generate_profile("full", Path(directory), size=20)
            for table in SCALABLE_TABLES:
                self.assertEqual(manifest["counts"][table], 20)
            self.assertEqual(manifest["counts"]["salary_training"], 20)

    def test_manifest_marks_everything_as_synthetic(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            generate_profile("balanced", output, size=100)
            manifest = json.loads((output / "dataset_manifest.json").read_text(encoding="utf-8"))
            self.assertTrue(manifest["synthetic"])
            self.assertFalse(manifest["contains_real_personal_data"])


if __name__ == "__main__":
    unittest.main()
