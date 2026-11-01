# /// script
# requires-python = ">=3.10"
# dependencies = ["openpyxl>=3.1"]
# ///
"""Read and update feature status in docs/features.xlsx (one sheet: "Tính năng").

  uv run scripts/features.py list [status]
  uv run scripts/features.py show 3
  uv run scripts/features.py set 3 done "ghi chú"
  uv run scripts/features.py edit 3 "Tính năng" "tên mới"
  uv run scripts/features.py add "Bài 1|Bài 2" "<Tính năng>"
"""
import sys
from collections import Counter
from copy import copy
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

FILE = Path(__file__).resolve().parent.parent / "docs" / "features.xlsx"
STATUSES = ("pending", "in_progress", "done", "blocked")


def open_sheet():
    wb = load_workbook(FILE)
    ws = wb["Tính năng"]
    header = [c.value for c in ws[1]]
    rows = [dict(zip(header, r)) for r in ws.iter_rows(min_row=2) if r[0].value is not None]
    return wb, ws, rows


def find(rows, fid):
    for r in rows:
        if str(r["ID"].value) == fid.upper().removeprefix("F-").lstrip("0"):
            return r
    sys.exit(f"Không có tính năng {fid}")


def save(wb):
    try:
        wb.save(FILE)
    except PermissionError:
        sys.exit(f"Không ghi được {FILE} — file đang mở trong Excel? Đóng rồi chạy lại.")


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def cmd_list(status=None):
    _, _, rows = open_sheet()
    for r in rows:
        if status in (None, r["Trạng thái"].value):
            print(f'{r["ID"].value:>3}  {r["Trạng thái"].value:12} {r["Bài test"].value:6} {r["Tính năng"].value}')
    counts = Counter(r["Trạng thái"].value for r in rows)
    print(" · ".join(f"{s}: {counts[s]}" for s in STATUSES), f"· tổng: {len(rows)}")


def cmd_show(fid):
    _, _, rows = open_sheet()
    for k, cell in find(rows, fid).items():
        print(f"{k}: {cell.value if cell.value is not None else ''}")


def cmd_set(fid, status, note=None):
    if status not in STATUSES:
        sys.exit(f"Trạng thái phải là một trong: {', '.join(STATUSES)}")
    wb, _, rows = open_sheet()
    r = find(rows, fid)
    r["Trạng thái"].value = status
    if note is not None:
        r["Ghi chú"].value = note or None
    r["Cập nhật"].value = now()
    save(wb)
    print(f'{r["ID"].value} → {status}')


def cmd_edit(fid, column, value):
    wb, _, rows = open_sheet()
    r = find(rows, fid)
    editable = [k for k in r if k not in ("ID", "Trạng thái", "Cập nhật")]
    if column not in editable:
        sys.exit(f"Cột sửa được: {', '.join(editable)} (trạng thái dùng lệnh set)")
    r[column].value = value or None
    r["Cập nhật"].value = now()
    save(wb)
    print(f'{r["ID"].value}.{column} đã cập nhật')


def cmd_add(test, name):
    wb, ws, rows = open_sheet()
    fid = max(r["ID"].value for r in rows) + 1
    src, dst = ws.max_row, ws.max_row + 1
    for col, v in enumerate([fid, test, name, "pending", None, now()], 1):
        ws.cell(dst, col, v)._style = copy(ws.cell(src, col)._style)
    ws.auto_filter.ref = f"A1:F{dst}"
    save(wb)
    print(f"Đã thêm {fid}: {name}")


COMMANDS = {"list": cmd_list, "show": cmd_show, "set": cmd_set, "edit": cmd_edit, "add": cmd_add}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        sys.exit(__doc__)
    COMMANDS[sys.argv[1]](*sys.argv[2:])
