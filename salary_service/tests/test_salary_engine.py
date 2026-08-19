import unittest
from decimal import Decimal

from app.salary_engine import SalaryInput, ValidationError, analyze_salary, calculate_salary, predict_salary


class SalaryEngineTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "employee_name": "Aye Aye",
            "employee_id": "EMP-001",
            "job_title": "Claims Officer",
            "currency": "MMK",
            "base_salary": 500000,
            "allowances": 50000,
            "overtime_hours": 10,
            "overtime_rate": 5000,
            "bonus": 25000,
            "deductions": 10000,
            "tax_rate": 5,
            "pension_rate": 2,
            "annual_growth_rate": 6,
            "performance_score": 4,
            "months_to_predict": 6,
        }

    def test_calculation_uses_expected_formula(self):
        data = SalaryInput.from_dict(self.payload)
        result = calculate_salary(data)
        self.assertEqual(result["gross_salary"], 625000.0)
        self.assertEqual(result["tax"], 31250.0)
        self.assertEqual(result["pension"], 10000.0)
        self.assertEqual(result["net_salary"], 573750.0)

    def test_scenario_prediction_returns_requested_months(self):
        result = analyze_salary(self.payload)
        self.assertEqual(result["forecast"]["method"], "growth_scenario")
        self.assertEqual(len(result["forecast"]["months"]), 6)
        self.assertGreater(result["forecast"]["months"][-1]["predicted_net_salary"], result["calculation"]["net_salary"])

    def test_historical_values_use_linear_regression(self):
        payload = dict(self.payload, historical_net_salaries=[500000, 510000, 520000, 530000])
        result = analyze_salary(payload)
        self.assertEqual(result["forecast"]["method"], "linear_regression")
        self.assertEqual(result["forecast"]["months"][0]["predicted_net_salary"], 540000.0)
        self.assertEqual(result["forecast"]["confidence_r_squared"], 1.0)

    def test_invalid_percent_is_rejected(self):
        with self.assertRaises(ValidationError):
            SalaryInput.from_dict(dict(self.payload, tax_rate=101))

    def test_net_salary_never_becomes_negative(self):
        data = SalaryInput.from_dict(dict(self.payload, deductions=9999999))
        self.assertEqual(calculate_salary(data)["net_salary"], 0.0)


if __name__ == "__main__":
    unittest.main()

