import base64
import unittest

from app.server import pdf_json_payload


class PdfTransportTests(unittest.TestCase):
    def test_json_transport_round_trips_pdf_bytes(self):
        source = b"%PDF-1.7\nexample"
        payload = pdf_json_payload(source, "report.pdf")

        self.assertEqual(payload["filename"], "report.pdf")
        self.assertEqual(payload["contentType"], "application/pdf")
        self.assertEqual(base64.b64decode(payload["base64"]), source)

    def test_json_transport_rejects_non_pdf_bytes(self):
        with self.assertRaises(ValueError):
            pdf_json_payload(b"403 Forbidden", "report.pdf")


if __name__ == "__main__":
    unittest.main()
