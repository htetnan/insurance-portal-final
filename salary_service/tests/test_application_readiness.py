from app.application_readiness import analyze_application_readiness

def test_application_readiness_never_approves():
    r = analyze_application_readiness({"application":{
        "id":7,"coverage_amount":1000000,"coverage_min":500000,"coverage_max":2000000,
        "duration":2,"min_policy_term":1,"policy_term":5,"required_document_count":2,
        "uploaded_document_count":2,"form_field_count":4,"completed_field_count":4,"risk_level":"LOW"
    }})
    assert r["recommendation"] == "READY_FOR_HUMAN_REVIEW"
    assert "approve" not in r["recommendation"].lower()
