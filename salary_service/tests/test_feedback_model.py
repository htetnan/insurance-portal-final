from app.feedback_model import analyze_feedback

def test_feedback_analysis_summary():
    r = analyze_feedback({"feedbacks":[
        {"id":1,"rating":5,"category":"Support","message":"Great fast helpful support"},
        {"id":2,"rating":1,"category":"Payments","message":"Payment is slow and bad problem"},
    ]})
    assert r["summary"]["total_feedback"] == 2
    assert r["summary"]["positive"] >= 1
    assert r["summary"]["negative"] >= 1
