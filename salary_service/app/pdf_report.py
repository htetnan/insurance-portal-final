from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from io import BytesIO
from pathlib import Path
import re
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .rabbit_converter import unicode_to_zawgyi


ROOT = Path(__file__).resolve().parents[1]
MYANMAR_FONT = ROOT / "assets" / "Zawgyi-One.ttf"
LATIN_FONT = ROOT / "assets" / "DejaVuSans.ttf"
LATIN_BOLD_FONT = ROOT / "assets" / "DejaVuSans-Bold.ttf"
MYANMAR_RUN = re.compile(r"[\u1000-\u109f\uaa60-\uaa7f]+")


def _register_fonts() -> str:
    if LATIN_FONT.exists() and LATIN_BOLD_FONT.exists():
        pdfmetrics.registerFont(TTFont("PortalSans", str(LATIN_FONT)))
        pdfmetrics.registerFont(TTFont("PortalSans-Bold", str(LATIN_BOLD_FONT)))
    if MYANMAR_FONT.exists():
        try:
            pdfmetrics.registerFont(TTFont("ZawgyiOne", str(MYANMAR_FONT)))
            return "ZawgyiOne"
        except Exception:
            pass
    return "Helvetica"


def _money(value: float, currency: str) -> str:
    return f"{value:,.2f} {currency}"


def _mixed_text(value: Any, my_font: str) -> str:
    """Convert Unicode Myanmar runs with Rabbit and render them in Zawgyi-One."""
    text = str(value)
    pieces = []
    position = 0
    for match in MYANMAR_RUN.finditer(text):
        pieces.append(escape(text[position:match.start()]))
        zawgyi = unicode_to_zawgyi(match.group(0)) or ""
        pieces.append(f'<font name="{my_font}">{escape(zawgyi)}</font>')
        position = match.end()
    pieces.append(escape(text[position:]))
    return "".join(pieces)


def build_salary_pdf(analysis: dict[str, Any]) -> bytes:
    my_font = _register_fonts()
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Bilingual Salary Report",
        author="Insurance Portal Salary Service",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleCustom", parent=styles["Title"], fontName="PortalSans-Bold", fontSize=19, leading=24, textColor=colors.HexColor("#16324F"), alignment=TA_CENTER)
    my_title = ParagraphStyle("MyanmarTitle", parent=styles["Normal"], fontName=my_font, fontSize=13, leading=22, textColor=colors.HexColor("#2D5B76"), alignment=TA_CENTER)
    section = ParagraphStyle("Section", parent=styles["Heading2"], fontName="PortalSans-Bold", fontSize=11, leading=15, textColor=colors.white, backColor=colors.HexColor("#2D6A8A"), borderPadding=6, spaceBefore=10, spaceAfter=7)
    my_text = ParagraphStyle("MyanmarText", parent=styles["Normal"], fontName=my_font, fontSize=9, leading=16)
    small = ParagraphStyle("Small", parent=styles["Normal"], fontName="PortalSans", fontSize=8, leading=11, textColor=colors.HexColor("#52606D"))

    employee = analysis["employee"]
    calc = analysis["calculation"]
    forecast = analysis["forecast"]
    currency = calc["currency"]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    story = [
        Paragraph("Salary Calculation & Forecast Report", title),
        Paragraph(_mixed_text("လစာတွက်ချက်မှုနှင့် ခန့်မှန်းအစီရင်ခံစာ", my_font), my_title),
        Spacer(1, 4 * mm),
        Paragraph(f"Generated: {generated}", small),
        Paragraph(_mixed_text("Employee Information / ဝန်ထမ်းအချက်အလက်", my_font), section),
    ]

    employee_rows = [
        ["Name / အမည်", employee.get("name") or "-"],
        ["Employee ID / ဝန်ထမ်းအမှတ်", employee.get("id") or "-"],
        ["Job title / ရာထူး", employee.get("job_title") or "-"],
    ]
    story.append(_styled_table(employee_rows, [55 * mm, 101 * mm], my_font))
    story.append(Paragraph(_mixed_text("Monthly Salary Calculation / လစဉ်လစာတွက်ချက်မှု", my_font), section))
    calculation_rows = [
        ["Item / အမျိုးအစား", "Amount / ပမာဏ"],
        ["Base salary / အခြေခံလစာ", _money(calc["base_salary"], currency)],
        ["Allowances / ထောက်ပံ့ကြေး", _money(calc["allowances"], currency)],
        ["Overtime pay / အချိန်ပိုကြေး", _money(calc["overtime_pay"], currency)],
        ["Bonus / အပိုဆု", _money(calc["bonus"], currency)],
        ["Gross salary / စုစုပေါင်းလစာ", _money(calc["gross_salary"], currency)],
        ["Tax / အခွန်", _money(calc["tax"], currency)],
        ["Pension / ပင်စင်ထည့်ဝင်ငွေ", _money(calc["pension"], currency)],
        ["Other deductions / အခြားနုတ်ယူငွေ", _money(calc["other_deductions"], currency)],
        ["Net salary / အသားတင်လစာ", _money(calc["net_salary"], currency)],
    ]
    story.append(_styled_table(calculation_rows, [93 * mm, 63 * mm], my_font, header=True, highlight_last=True))
    story.append(Paragraph(_mixed_text("Salary Forecast / လစာခန့်မှန်းချက်", my_font), section))
    story.append(Paragraph(f"Method: {forecast['method']} - {forecast['explanation']}", small))
    prediction_rows = [["Month / လ", "Predicted net salary / ခန့်မှန်းအသားတင်လစာ"]]
    prediction_rows.extend([[str(row["month"]), _money(row["predicted_net_salary"], currency)] for row in forecast["months"]])
    story.append(Spacer(1, 2 * mm))
    story.append(_styled_table(prediction_rows, [45 * mm, 111 * mm], my_font, header=True))
    story.extend([
        Spacer(1, 4 * mm),
        Paragraph(_mixed_text("Planning note / စီမံကိန်းမှတ်ချက်", my_font), section),
        Paragraph("Forecasts are estimates for planning and must not replace approved payroll records.", small),
        Paragraph(_mixed_text("ခန့်မှန်းချက်များသည် စီမံကိန်းရေးဆွဲရန်အတွက်သာဖြစ်ပြီး အတည်ပြုထားသော လစာစာရင်းကို အစားမထိုးပါ။", my_font), my_text),
    ])

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("PortalSans", 8)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawString(18 * mm, 9 * mm, "Insurance Portal - Salary Service")
        canvas.drawRightString(192 * mm, 9 * mm, f"Page {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()


def _styled_table(rows, widths, my_font, header=False, highlight_last=False):
    converted = []
    style = ParagraphStyle("Cell", fontName="PortalSans", fontSize=8.4, leading=13, textColor=colors.HexColor("#243B53"))
    for row in rows:
        converted.append([Paragraph(_mixed_text(cell, my_font), style) for cell in row])
    table = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
    ]
    if header:
        commands.extend([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E6F0F5")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#16324F"))])
    if highlight_last:
        commands.extend([("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#DCFCE7")), ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#16A34A"))])
    table.setStyle(TableStyle(commands))
    return table
