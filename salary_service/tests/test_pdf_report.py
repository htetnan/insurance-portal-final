import unittest

from pypdf import PdfReader

from app.pdf_report import build_salary_pdf
from app.rabbit_converter import unicode_to_zawgyi
from app.salary_engine import analyze_salary


class PdfReportTests(unittest.TestCase):
    def test_report_is_a_readable_pdf(self):
        analysis = analyze_salary({"employee_name": "မောင်မောင်", "base_salary": 500000, "months_to_predict": 3})
        pdf = build_salary_pdf(analysis)
        self.assertTrue(pdf.startswith(b"%PDF"))
        reader = PdfReader(__import__("io").BytesIO(pdf))
        self.assertGreaterEqual(len(reader.pages), 1)
        text = reader.pages[0].extract_text()
        self.assertIn("Salary Calculation", text)
        self.assertIn(unicode_to_zawgyi("မောင်မောင်"), text)

        fonts = reader.pages[0]["/Resources"]["/Font"]
        base_fonts = {str(font.get_object().get("/BaseFont", "")) for font in fonts.values()}
        self.assertTrue(any("Zawgyi" in name for name in base_fonts), base_fonts)


if __name__ == "__main__":
    unittest.main()
