"""Generate a printable Delivery Receipt PDF using ReportLab."""

from io import BytesIO

from flask import current_app
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BRAND = colors.HexColor("#1B2A4A")
LIGHT = colors.HexColor("#EEF1F6")
ACCENT = colors.HexColor("#F5A623")


def build_delivery_receipt_pdf(dr):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Delivery Receipt {dr.dr_no}",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("Company", fontSize=16, leading=19, textColor=BRAND, spaceAfter=2, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle("Addr", fontSize=8.5, leading=11, textColor=colors.HexColor("#555555")))
    styles.add(ParagraphStyle("DRTitle", fontSize=20, leading=22, alignment=2, textColor=BRAND, fontName="Helvetica-Bold"))
    styles.add(ParagraphStyle("DRNo", fontSize=10, leading=13, alignment=2, textColor=colors.black))
    styles.add(ParagraphStyle("Lbl", fontSize=8, leading=11, textColor=colors.HexColor("#777777")))
    styles.add(ParagraphStyle("Val", fontSize=9.5, leading=12, textColor=colors.black))
    cell = ParagraphStyle("Cell", fontSize=9, leading=11)

    company = current_app.config.get("COMPANY_NAME", "Company")
    address = current_app.config.get("COMPANY_ADDRESS", "")

    elems = []

    # Header: company on left, DR title on right
    header = Table(
        [
            [
                Paragraph(company, styles["Company"]),
                Paragraph("DELIVERY RECEIPT", styles["DRTitle"]),
            ],
            [
                Paragraph(address, styles["Addr"]),
                Paragraph(f"<b>No.</b> {dr.dr_no}", styles["DRNo"]),
            ],
        ],
        colWidths=[95 * mm, 79 * mm],
    )
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elems.append(header)
    elems.append(Spacer(1, 5 * mm))
    elems.append(_hr())
    elems.append(Spacer(1, 4 * mm))

    # Deliver-to / meta block
    date_str = dr.delivery_date.strftime("%B %d, %Y") if dr.delivery_date else ""
    meta = Table(
        [
            [
                Paragraph("DELIVER TO", styles["Lbl"]),
                Paragraph("DATE", styles["Lbl"]),
            ],
            [
                Paragraph(f"<b>{dr.customer_name}</b>", styles["Val"]),
                Paragraph(date_str, styles["Val"]),
            ],
            [
                Paragraph(dr.customer_address or "-", styles["Val"]),
                Paragraph("PROJECT SITE", styles["Lbl"]),
            ],
            [
                Paragraph("", styles["Val"]),
                Paragraph(dr.project_site or "-", styles["Val"]),
            ],
        ],
        colWidths=[110 * mm, 64 * mm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    elems.append(meta)
    elems.append(Spacer(1, 5 * mm))

    # Items table
    data = [["#", "SKU", "Description", "Location", "Qty", "Unit"]]
    for idx, it in enumerate(dr.items, start=1):
        data.append(
            [
                str(idx),
                it.component.sku,
                Paragraph(it.component.name, cell),
                it.location.code,
                str(it.quantity),
                it.component.unit,
            ]
        )
    # pad to a minimum height
    while len(data) < 8:
        data.append(["", "", "", "", "", ""])

    tbl = Table(
        data,
        colWidths=[10 * mm, 24 * mm, 78 * mm, 22 * mm, 16 * mm, 16 * mm],
        repeatRows=1,
    )
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (4, 0), (5, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CCCCCC")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elems.append(tbl)
    elems.append(Spacer(1, 3 * mm))

    total = Table(
        [["", f"TOTAL UNITS:  {dr.total_qty}"]],
        colWidths=[120 * mm, 54 * mm],
    )
    total.setStyle(
        TableStyle(
            [
                ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (1, 0), (1, 0), 10),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("TEXTCOLOR", (1, 0), (1, 0), BRAND),
            ]
        )
    )
    elems.append(total)

    if dr.note:
        elems.append(Spacer(1, 4 * mm))
        elems.append(Paragraph(f"<b>Notes:</b> {dr.note}", cell))

    elems.append(Spacer(1, 16 * mm))

    # Signatures
    preparer = dr.preparer.full_name if dr.preparer else ""
    sign = Table(
        [
            ["_______________________", "", "_______________________"],
            [
                Paragraph(f"Prepared by<br/><b>{preparer}</b>", styles["Val"]),
                "",
                Paragraph("Received in good condition by<br/><b>(Signature over printed name / Date)</b>", styles["Val"]),
            ],
        ],
        colWidths=[78 * mm, 18 * mm, 78 * mm],
    )
    sign.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    elems.append(sign)

    elems.append(Spacer(1, 6 * mm))
    elems.append(
        Paragraph(
            f"This delivery receipt was generated by {company} inventory system.",
            styles["Addr"],
        )
    )

    doc.build(elems)
    buf.seek(0)
    return buf


def _hr():
    t = Table([[""]], colWidths=[174 * mm])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 1.2, BRAND)]))
    return t
