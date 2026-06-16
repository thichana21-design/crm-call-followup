#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""อ่านไฟล์ Excel เดิม แล้วแปลงเป็น data/import.json สำหรับนำเข้าฐานข้อมูล CRM"""
import os, json, datetime
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# ไฟล์ Excel ต้นทาง อยู่โฟลเดอร์แม่ (CRM/) — ปรับ path ได้ตามต้องการ
XLSX = os.environ.get("CRM_XLSX") or os.path.join(
    os.path.dirname(ROOT), "CRM_โทรติดตามลูกค้า_ลูกค้าขาดฝาก_มิถุนายน.xlsx")
OUT = os.path.join(ROOT, "data", "import.json")

SUMMARY_SHEETS = {"สรุปรายสัปดาห์", "สรุปรายเดือน"}

# คอลัมน์ (index 0-based) ตามหัวตาราง row3
C_SEQ, C_PHONE, C_CALLDATE, C_CALLTIME = 0, 1, 2, 3
C_ANS, C_NOANS, C_SMS = 4, 5, 6
DAY_START = 7          # วันที่ 1 = (login col7, amount col8)
N_DAYS = 31


def norm_phone(v):
    if v is None:
        return None
    if isinstance(v, float):
        v = str(int(v))
    else:
        v = str(v).strip()
    digits = "".join(ch for ch in v if ch.isdigit())
    if not digits:
        return None
    # เบอร์ไทย 10 หลักขึ้นต้น 0 ; ถ้า 9 หลัก (0 หน้าหายตอนเก็บเป็นตัวเลข) ให้เติม 0
    if len(digits) == 9:
        digits = "0" + digits
    return digits


def to_iso_date(v):
    if isinstance(v, datetime.datetime):
        # ปี พ.ศ. (>2500) ในไฟล์บางจุด -> แปลงเป็น ค.ศ.
        y = v.year - 543 if v.year > 2500 else v.year
        try:
            return datetime.date(y, v.month, v.day).isoformat()
        except ValueError:
            return None
    return None


def parse_time(v):
    """เวลาเก็บเป็น float เช่น 12.49 -> '12:49', 13.4 -> '13:40'"""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    hh = int(f)
    mm = round((f - hh) * 100)
    if mm >= 60:
        mm = 59
    return f"{hh:02d}:{mm:02d}"


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    brands = []
    month_year = None

    for ws in wb.worksheets:
        if ws.title in SUMMARY_SHEETS:
            continue
        rows = list(ws.iter_rows(values_only=True))
        # หาเดือน/ปีจาก row2 (วันที่ 1 ของเดือน)
        if month_year is None and len(rows) > 2:
            d = to_iso_date(rows[2][0]) if rows[2] and rows[2][0] else None
            if d:
                month_year = d  # เช่น 2026-06-01

        customers = []
        for r in rows[4:]:
            if len(r) <= C_PHONE:
                continue
            phone = norm_phone(r[C_PHONE])
            if not phone:
                continue

            call_date = to_iso_date(r[C_CALLDATE]) if len(r) > C_CALLDATE else None
            call_time = parse_time(r[C_CALLTIME]) if len(r) > C_CALLTIME else None
            answered = bool(r[C_ANS]) if len(r) > C_ANS else False
            noans = bool(r[C_NOANS]) if len(r) > C_NOANS else False
            sms = bool(r[C_SMS]) if len(r) > C_SMS else False

            if answered:
                outcome = "answered"
            elif noans:
                outcome = "no_answer"
            else:
                outcome = "unreachable"

            calls = []
            if call_date:
                calls.append({
                    "calledAt": call_date,
                    "callTime": call_time,
                    "outcome": outcome,
                    "smsSent": sms,
                })

            # deposits ราย 31 วัน
            deposits = []
            base_year, base_month = 2026, 6
            if month_year:
                y, m, _ = month_year.split("-")
                base_year, base_month = int(y), int(m)
            for day in range(1, N_DAYS + 1):
                li = DAY_START + (day - 1) * 2
                ai = li + 1
                logged = bool(r[li]) if len(r) > li and r[li] is not None else False
                amt = r[ai] if len(r) > ai and isinstance(r[ai], (int, float)) else 0
                if logged or (amt and amt > 0):
                    try:
                        ddate = datetime.date(base_year, base_month, day).isoformat()
                    except ValueError:
                        continue
                    deposits.append({
                        "depositDate": ddate,
                        "loggedIn": bool(logged),
                        "amount": float(amt or 0),
                    })

            customers.append({
                "phone": phone,
                "calls": calls,
                "deposits": deposits,
            })

        brands.append({"name": ws.title.strip() or "ไม่ระบุ", "customers": customers})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"monthYear": month_year, "brands": brands}, f, ensure_ascii=False)

    total = sum(len(b["customers"]) for b in brands)
    print(f"exported {len(brands)} brands, {total} customers -> {OUT}")


if __name__ == "__main__":
    main()
