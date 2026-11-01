# /// script
# requires-python = ">=3.10"
# dependencies = ["python-docx>=1.1", "python-pptx>=1.0", "pypdfium2>=4.30", "pillow>=10"]
# ///
"""Dựng bộ mẫu từ thư mục server/source/. Chạy trong server/: `npm run samples`

Bước 1: sinh các file mẫu còn thiếu trong source/ (1 hợp đồng DOCX + 3 bộ PPTX).
        Muốn sinh lại file nào thì xoá file đó trong source/ rồi chạy lại.
Bước 2: với mỗi mẫu khai trong storage/templates/manifest.json:
        - copy source/<source>  →  storage/templates/<type>/<id>.<đuôi file>
        - render ảnh từng trang / slide  →  storage/previews/<id>/1.png, 2.png... (1.png là thumbnail)

Chỉ script này cần LibreOffice (để chuyển DOCX/PPTX sang PDF rồi sang PNG).
Kết quả đã được commit, nên chạy app không cần LibreOffice.
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pypdfium2 as pdfium
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches
from pptx.util import Pt as PPt

SERVER = Path(__file__).resolve().parent.parent
SOURCE = SERVER / "source"
STORAGE = SERVER / "storage"
PREVIEW_WIDTH = 800  # chiều rộng ảnh preview (px)
MAX_PAGES = {"docx": 3}  # DOCX chỉ render 3 trang đầu; PPTX render mọi slide


# ---------- Sinh file DOCX mẫu ----------

def make_contract(path: Path):
    d = Document()
    d.styles["Normal"].font.name = "Times New Roman"
    d.styles["Normal"].font.size = Pt(13)

    def centered(text, bold=False, italic=False):
        p = d.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic

    def field_table(rows):
        t = d.add_table(rows=0, cols=2, style="Table Grid")
        for label, value in rows:
            cells = t.add_row().cells
            cells[0].paragraphs[0].add_run(label).bold = True
            cells[1].text = value

    def bullets(items, style="List Bullet"):
        for item in items:
            d.add_paragraph(item, style=style)

    centered("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold=True)
    centered("Độc lập – Tự do – Hạnh phúc", bold=True)
    d.add_heading("HỢP ĐỒNG LAO ĐỘNG", level=1).alignment = WD_ALIGN_PARAGRAPH.CENTER
    centered("Số: ……/HĐLĐ", italic=True)
    d.add_paragraph("Căn cứ Bộ luật Lao động ngày 20 tháng 11 năm 2019; hôm nay, ngày … tháng … năm 20…, tại [Địa điểm ký], chúng tôi gồm:")

    d.add_heading("Bên A: Người sử dụng lao động", level=2)
    field_table([("Tên đơn vị", "[Tên công ty]"), ("Địa chỉ", "[Địa chỉ trụ sở]"),
                 ("Người đại diện", "[Họ và tên]"), ("Chức vụ", "[Giám đốc]")])
    d.add_heading("Bên B: Người lao động", level=2)
    field_table([("Họ và tên", "[Họ và tên]"), ("Ngày sinh", "[dd/mm/yyyy]"),
                 ("Số CCCD", "[Số căn cước công dân]"), ("Địa chỉ thường trú", "[Địa chỉ]")])

    d.add_heading("Điều 1. Công việc và thời hạn hợp đồng", level=2)
    bullets(["Loại hợp đồng: xác định thời hạn [12] tháng, từ ngày … đến ngày ….",
             "Chức danh chuyên môn: [Vị trí công việc].",
             "Địa điểm làm việc: [Địa chỉ nơi làm việc]."])

    d.add_heading("Điều 2. Chế độ làm việc", level=2)
    bullets(["Thời giờ làm việc: 8 giờ/ngày, từ thứ Hai đến thứ Sáu.",
             "Thời giờ nghỉ ngơi: nghỉ trưa 1 giờ; nghỉ lễ, Tết, phép năm theo quy định của pháp luật.",
             "Được cấp phát dụng cụ làm việc phù hợp với công việc."], style="List Number")

    d.add_heading("Điều 3. Tiền lương và quyền lợi", level=2)
    t = d.add_table(rows=1, cols=3, style="Table Grid")
    for cell, text in zip(t.rows[0].cells, ["Khoản", "Mức (VNĐ/tháng)", "Thời điểm trả"]):
        cell.paragraphs[0].add_run(text).bold = True
    for row in [("Lương cơ bản", "[10.000.000]", "Ngày 05 hằng tháng"),
                ("Phụ cấp ăn trưa", "[730.000]", "Cùng kỳ lương"),
                ("Thưởng", "Theo quy chế công ty", "Theo kết quả công việc")]:
        for cell, text in zip(t.add_row().cells, row):
            cell.text = text

    d.add_heading("Điều 4. Nghĩa vụ của các bên", level=2)
    p = d.add_paragraph()
    p.add_run("Bên A: ").bold = True
    p.add_run("trả lương đầy đủ, đúng hạn; đóng bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp theo quy định.")
    p = d.add_paragraph()
    p.add_run("Bên B: ").bold = True
    p.add_run("hoàn thành công việc được giao; chấp hành nội quy lao động và bảo mật thông tin của Bên A.")

    d.add_heading("Điều 5. Điều khoản thi hành", level=2)
    d.add_paragraph("Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản và có hiệu lực kể từ ngày ký.")

    sign = d.add_table(rows=1, cols=2)
    for cell, who in zip(sign.rows[0].cells, ["NGƯỜI LAO ĐỘNG", "NGƯỜI SỬ DỤNG LAO ĐỘNG"]):
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run(who).bold = True
        p.add_run("\n(Ký, ghi rõ họ tên)").italic = True
    d.save(path)


# ---------- Sinh file PPTX mẫu ----------

WHITE = RGBColor(0xFF, 0xFF, 0xFF)
INK = RGBColor(0x22, 0x2B, 0x36)
FONT = "Arial"  # font có đủ dấu tiếng Việt trên mọi máy


def hex_rgb(value: str) -> RGBColor:
    return RGBColor.from_string(value.lstrip("#"))


class Deck:
    """Bộ slide tỉ lệ 16:9. Mỗi hàm (cover, bullets, cards...) thêm một kiểu slide."""

    def __init__(self, primary: str, accent: str):
        self.prs = Presentation()
        self.prs.slide_width = Inches(13.333)
        self.prs.slide_height = Inches(7.5)
        self.primary = hex_rgb(primary)  # màu chính
        self.accent = hex_rgb(accent)  # màu nhấn

    def _slide(self, background=WHITE):
        slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        slide.background.fill.solid()
        slide.background.fill.fore_color.rgb = background
        return slide

    def _box(self, slide, x, y, w, h, color):
        shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
        shape.fill.solid()
        shape.fill.fore_color.rgb = color
        shape.line.fill.background()
        return shape

    def _text(self, slide, x, y, w, h, text, size, color=INK, bold=False, align=PP_ALIGN.LEFT):
        frame = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)).text_frame
        frame.word_wrap = True
        for i, line in enumerate(text.split("\n")):
            p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
            p.alignment = align
            run = p.add_run()
            run.text = line
            run.font.size = PPt(size)
            run.font.bold = bold
            run.font.name = FONT
            run.font.color.rgb = color
        return frame

    def _titled(self, title):
        slide = self._slide()
        self._box(slide, 0, 0, 0.25, 7.5, self.primary)
        self._text(slide, 0.8, 0.5, 11.5, 1, title, 34, self.primary, bold=True)
        self._box(slide, 0.8, 1.45, 1.2, 0.08, self.accent)
        return slide

    def cover(self, title, subtitle):
        slide = self._slide(self.primary)
        self._box(slide, 0.8, 4.35, 2, 0.1, self.accent)
        self._text(slide, 0.8, 2.2, 11.5, 2, title, 48, WHITE, bold=True)
        self._text(slide, 0.8, 4.7, 11.5, 1, subtitle, 22, WHITE)

    def bullets(self, title, items):
        slide = self._titled(title)
        frame = self._text(slide, 0.8, 1.9, 11.5, 5, "\n".join(f"•  {item}" for item in items), 24)
        for p in frame.paragraphs:
            p.space_after = PPt(14)

    def cards(self, title, cards):
        slide = self._titled(title)
        gap = 0.4
        width = (11.7 - gap * (len(cards) - 1)) / len(cards)
        for i, (big, small) in enumerate(cards):
            x = 0.8 + i * (width + gap)
            self._box(slide, x, 2.3, width, 3.2, self.primary if i % 2 == 0 else self.accent)
            self._text(slide, x + 0.2, 2.8, width - 0.4, 1.2, big, 40, WHITE, bold=True, align=PP_ALIGN.CENTER)
            self._text(slide, x + 0.2, 4.1, width - 0.4, 1.2, small, 18, WHITE, align=PP_ALIGN.CENTER)

    def chart(self, title, categories, series):
        slide = self._titled(title)
        data = CategoryChartData()
        data.categories = categories
        for name, values in series.items():
            data.add_series(name, values)
        chart = slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.8), Inches(1.9),
                                       Inches(11.7), Inches(5.2), data).chart
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        chart.font.size = PPt(16)
        chart.font.name = FONT
        for plot_series, color in zip(chart.plots[0].series, [self.primary, self.accent, hex_rgb("#9AA5B1")]):
            plot_series.format.fill.solid()
            plot_series.format.fill.fore_color.rgb = color

    def table(self, title, rows):
        slide = self._titled(title)
        table = slide.shapes.add_table(len(rows), len(rows[0]), Inches(0.8), Inches(2),
                                       Inches(11.7), Inches(0.6 * len(rows))).table
        for r, row in enumerate(rows):
            for c, value in enumerate(row):
                cell = table.cell(r, c)
                cell.text = value
                font = cell.text_frame.paragraphs[0].runs[0].font
                font.size = PPt(18)
                font.name = FONT
                font.bold = r == 0  # dòng đầu là tiêu đề bảng
                font.color.rgb = WHITE if r == 0 else INK
                cell.fill.solid()
                cell.fill.fore_color.rgb = self.primary if r == 0 else hex_rgb("#F3F5F8" if r % 2 else "#FFFFFF")

    def timeline(self, title, steps):
        slide = self._titled(title)
        step = 11.7 / len(steps)
        self._box(slide, 0.8 + step / 2, 3.45, step * (len(steps) - 1), 0.08, self.accent)
        for i, (label, text) in enumerate(steps):
            x = 0.8 + i * step
            dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + step / 2 - 0.45), Inches(3.04), Inches(0.9), Inches(0.9))
            dot.fill.solid()
            dot.fill.fore_color.rgb = self.primary
            dot.line.fill.background()
            self._text(slide, x, 2.2, step, 0.7, label, 22, self.primary, bold=True, align=PP_ALIGN.CENTER)
            self._text(slide, x + 0.1, 4.2, step - 0.2, 2, text, 18, align=PP_ALIGN.CENTER)

    def save(self, path: Path):
        self.prs.save(path)


def make_sales_report(path: Path):
    deck = Deck("#1F3A5F", "#F28C28")
    deck.cover("Báo cáo kết quả kinh doanh Quý III", "Phòng Kinh doanh · [Tên công ty]")
    deck.bullets("Nội dung", ["Tổng quan kết quả quý", "Doanh thu theo kênh bán hàng",
                              "Chi phí và lợi nhuận", "Kế hoạch Quý IV"])
    deck.cards("Chỉ số chính", [("12,4 tỷ", "Doanh thu"), ("+18%", "Tăng trưởng so với quý trước"),
                                ("1.250", "Khách hàng mới"), ("23%", "Biên lợi nhuận")])
    deck.chart("Doanh thu theo kênh (tỷ đồng)", ["Tháng 7", "Tháng 8", "Tháng 9"],
               {"Trực tuyến": (1.8, 2.1, 2.6), "Cửa hàng": (1.5, 1.6, 1.7), "Đại lý": (0.3, 0.4, 0.4)})
    deck.table("Chi phí và lợi nhuận (tỷ đồng)", [
        ("Khoản mục", "Quý II", "Quý III", "Thay đổi"),
        ("Doanh thu", "10,5", "12,4", "+18%"),
        ("Chi phí bán hàng", "4,2", "4,6", "+10%"),
        ("Chi phí quản lý", "2,1", "2,2", "+5%"),
        ("Lợi nhuận trước thuế", "2,3", "2,9", "+26%"),
    ])
    deck.bullets("Kế hoạch Quý IV", ["Mở rộng kênh trực tuyến sang hai sàn thương mại điện tử mới",
                                     "Chương trình khách hàng thân thiết cho nhóm mua lặp lại",
                                     "Giữ chi phí quản lý dưới 18% doanh thu",
                                     "Mục tiêu doanh thu: [14] tỷ đồng"])
    deck.cover("Cảm ơn!", "Hỏi & đáp")
    deck.save(path)


def make_lecture(path: Path):
    deck = Deck("#2E7D5B", "#E0A526")
    deck.cover("Bài 1: Giới thiệu môn học", "Giảng viên: [Họ và tên] · Lớp: [Tên lớp]")
    deck.bullets("Mục tiêu bài học", ["Hiểu phạm vi và cấu trúc của môn học",
                                      "Nắm được các khái niệm nền tảng",
                                      "Biết cách đánh giá kết quả học tập"])
    deck.bullets("Nội dung chính", ["Phần 1: Tổng quan và lịch sử phát triển",
                                    "Phần 2: Các khái niệm nền tảng",
                                    "Phần 3: Ví dụ thực tế",
                                    "Phần 4: Phương pháp học hiệu quả"])
    deck.cards("Ba khái niệm cần nhớ", [("1", "[Khái niệm thứ nhất]"), ("2", "[Khái niệm thứ hai]"),
                                        ("3", "[Khái niệm thứ ba]")])
    deck.table("Đánh giá kết quả", [("Hình thức", "Tỷ trọng", "Thời điểm"),
                                    ("Chuyên cần", "10%", "Cả học kỳ"),
                                    ("Bài tập nhóm", "30%", "Tuần 8"),
                                    ("Thi cuối kỳ", "60%", "Tuần 16")])
    deck.bullets("Câu hỏi thảo luận", ["Môn học này liên quan thế nào tới ngành của bạn?",
                                       "Bạn mong đợi điều gì sau khoá học?"])
    deck.cover("Tổng kết & bài tập về nhà", "Đọc chương 1 giáo trình, làm bài tập 1–5")
    deck.save(path)


def make_project_pitch(path: Path):
    deck = Deck("#4B3F9E", "#1BA39C")
    deck.cover("[Tên dự án]", "Giới thiệu dự án · [Tên nhóm]")
    deck.bullets("Vấn đề", ["Khách hàng mất nhiều thời gian cho [công việc thủ công]",
                            "Giải pháp hiện có đắt và khó dùng",
                            "Thị trường [quy mô] với tốc độ tăng trưởng [x]%/năm"])
    deck.bullets("Giải pháp", ["Nền tảng [mô tả ngắn] tự động hoá quy trình",
                               "Triển khai trong một ngày, không cần cài đặt",
                               "Mô hình thuê bao theo tháng"])
    deck.timeline("Lộ trình triển khai", [("Q1", "Nghiên cứu người dùng"), ("Q2", "Ra mắt bản MVP"),
                                          ("Q3", "Thử nghiệm với khách hàng đầu tiên"), ("Q4", "Ra mắt chính thức")])
    deck.cards("Đội ngũ", [("[Họ tên]", "CEO · Chiến lược"), ("[Họ tên]", "CTO · Công nghệ"),
                           ("[Họ tên]", "COO · Vận hành")])
    deck.cover("Liên hệ", "[email@example.com] · [Số điện thoại]")
    deck.save(path)


SYNTHETIC = {
    "docx/hop-dong-lao-dong.docx": make_contract,
    "pptx/bao-cao-kinh-doanh-quy.pptx": make_sales_report,
    "pptx/bai-giang.pptx": make_lecture,
    "pptx/gioi-thieu-du-an.pptx": make_project_pitch,
}


# ---------- Copy mẫu vào storage/ và render ảnh preview ----------

def find_soffice() -> str:
    for candidate in (shutil.which("soffice"), "/Applications/LibreOffice.app/Contents/MacOS/soffice"):
        if candidate and Path(candidate).exists():
            return candidate
    sys.exit("Cần LibreOffice (soffice) để render ảnh preview")


def render_previews(soffice: str, src: Path, out_dir: Path, max_pages: int | None):
    with tempfile.TemporaryDirectory() as tmp:
        # Dùng profile riêng để chạy được cả khi LibreOffice đang mở
        subprocess.run([soffice, f"-env:UserInstallation=file://{tmp}/profile", "--headless",
                        "--convert-to", "pdf", "--outdir", tmp, str(src)], check=True, capture_output=True)
        pdf = pdfium.PdfDocument(Path(tmp) / f"{src.stem}.pdf")
        shutil.rmtree(out_dir, ignore_errors=True)
        out_dir.mkdir(parents=True)
        for i in range(min(len(pdf), max_pages or len(pdf))):
            page = pdf[i]
            page.render(scale=PREVIEW_WIDTH / page.get_width()).to_pil().save(out_dir / f"{i + 1}.png", optimize=True)
        pdf.close()


def main():
    for rel, make in SYNTHETIC.items():
        path = SOURCE / rel
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            make(path)
            print(f"sinh   {path.relative_to(SERVER)}")

    manifest = json.loads((STORAGE / "templates" / "manifest.json").read_text("utf-8"))
    extensions = {t["code"]: t["extension"] for t in manifest["docTypes"]}
    soffice = find_soffice()
    for t in manifest["templates"]:
        dst = STORAGE / "templates" / t["type"] / f'{t["id"]}.{extensions[t["type"]]}'
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE / t["source"], dst)
        render_previews(soffice, dst, STORAGE / "previews" / t["id"], MAX_PAGES.get(t["type"]))
        print(f'mẫu   {dst.relative_to(SERVER)} + {len(list((STORAGE / "previews" / t["id"]).glob("*.png")))} ảnh')


if __name__ == "__main__":
    main()
