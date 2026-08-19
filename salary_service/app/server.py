from __future__ import annotations

import base64
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from .pdf_report import build_salary_pdf
from .revenue_model import predict_revenue
from .operational_model import predict_operational
from .feedback_model import analyze_feedback
from .application_readiness import analyze_application_readiness
from .salary_engine import ValidationError, analyze_salary


MAX_BODY_BYTES = int(os.getenv("ANALYTICS_MAX_BODY_BYTES", str(1024 * 1024)))
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv("SALARY_ALLOWED_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000").split(",")
    if origin.strip()
}


def pdf_json_payload(pdf: bytes, filename: str) -> dict[str, str]:
    """Wrap PDF bytes in JSON so download managers cannot intercept the API."""
    if not pdf.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF bytes")
    return {
        "filename": filename,
        "contentType": "application/pdf",
        "base64": base64.b64encode(pdf).decode("ascii"),
    }


class SalaryRequestHandler(BaseHTTPRequestHandler):
    server_version = "InsuranceAnalytics/2.0"

    def _cors_origin(self) -> str | None:
        origin = self.headers.get("Origin")
        return origin if origin in ALLOWED_ORIGINS else None

    def _common_headers(self, content_type: str, content_length: int) -> None:
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(content_length))
        self.send_header("X-Content-Type-Options", "nosniff")
        origin = self._cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _json(self, status: int, body: dict) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._common_headers("application/json; charset=utf-8", len(encoded))
        self.end_headers()
        self.wfile.write(encoded)

    def _read_payload(self) -> dict:
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValidationError("Invalid Content-Length") from exc
        if size <= 0 or size > MAX_BODY_BYTES:
            raise ValidationError("Request body is empty or too large")
        try:
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("Request body must contain valid UTF-8 JSON") from exc
        if not isinstance(payload, dict):
            raise ValidationError("Request body must be a JSON object")
        return payload

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Content-Length", "0")
        origin = self._cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in {"/health", "/api/salary/health", "/api/prediction/health"}:
            self._json(200, {"status": "ok", "service": "insurance-analytics"})
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path not in {"/api/salary/analyze", "/api/salary/report", "/api/prediction/revenue", "/api/prediction/operations", "/api/prediction/feedback", "/api/prediction/application-readiness"}:
            self._json(404, {"error": "Not found"})
            return
        try:
            payload = self._read_payload()
            if path == "/api/prediction/revenue":
                self._json(200, predict_revenue(payload))
                return
            if path == "/api/prediction/operations":
                self._json(200, predict_operational(payload))
                return
            if path == "/api/prediction/feedback":
                self._json(200, analyze_feedback(payload))
                return
            if path == "/api/prediction/application-readiness":
                self._json(200, analyze_application_readiness(payload))
                return
            analysis = analyze_salary(payload)
            if path.endswith("/report"):
                pdf = build_salary_pdf(analysis)
                self._json(200, pdf_json_payload(pdf, "salary-report.pdf"))
            else:
                self._json(200, analysis)
        except ValidationError as exc:
            self._json(422, {"error": str(exc)})
        except Exception:
            self._json(500, {"error": "Unable to process the analytics request"})

    def log_message(self, fmt: str, *args) -> None:
        print(f"{self.address_string()} - {fmt % args}")


def run() -> None:
    host = os.getenv("SALARY_HOST", "0.0.0.0")
    port = int(os.getenv("SALARY_PORT", "8001"))
    server = ThreadingHTTPServer((host, port), SalaryRequestHandler)
    print(f"Insurance analytics service listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
