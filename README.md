# CRM โทรติดตามลูกค้า (ลูกค้าขาดฝาก)

เว็บแอป CRM สำหรับทีมโทรติดตามลูกค้าขาดฝาก 9 เว็บแบรนด์ — แทนไฟล์ Excel เดิม
สร้างด้วย **Next.js 15 + Prisma + PostgreSQL (Supabase)** · UI ภาษาไทย · เวลาแบบไทย (Asia/Bangkok)

🌐 **เว็บใช้งานจริง:** https://crm-followup-sigma.vercel.app

---

## 🔑 เข้าสู่ระบบ

ทุกหน้าต้องล็อกอินก่อน — บัญชีเริ่มต้น:

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท | เห็นอะไร |
|---|---|---|---|
| `admin` | `admin123` | **ผู้จัดการ** | ทุกหน้า + จัดการผู้ใช้ + audit log |
| `lead` | `lead123` | **หัวหน้าทีม** | รายงาน, คลังข้อความ, แจ้งเตือน (ไม่จัดการผู้ใช้) |
| `agent1` | `agent123` | **แอดมิน** | เฉพาะคิว/ลูกค้าที่ได้รับมอบหมาย |
| `agent2` | `agent123` | **แอดมิน** | เฉพาะคิว/ลูกค้าที่ได้รับมอบหมาย |

> ⚠️ ก่อนใช้งานจริง ควรเปลี่ยนรหัสเริ่มต้นทั้งหมด (หน้า **โปรไฟล์** → เปลี่ยนรหัสผ่าน)
> ลำดับสิทธิ์: ผู้จัดการ > หัวหน้าทีม > แอดมิน

---

## 🖥️ หน้าจอหลัก

| หน้า | ทำอะไร |
|---|---|
| **ภาพรวม** (`/`) | สรุปทุกเว็บ + เลือกช่วงวันที่ (วันนี้/7 วัน/เดือนนี้/กำหนดเอง) |
| **คิวโทรวันนี้** (`/queue`) | ลูกค้าที่ต้องตามต่อ (แอดมินเห็นเฉพาะของตัวเอง) |
| **บันทึกการโทร** (`/calls`) | การโทรทั้งหมดแยกตามวัน + กรอง + ส่งออก Excel + ลงข้อมูลย้อนหลัง |
| **ลูกค้า** (`/customers`) | ค้นหา/กรอง + เพิ่มลูกค้า + นำเข้าจากไฟล์ + ส่งออก Excel |
| **โปรไฟล์ลูกค้า** (`/customers/[id]`) | ประวัติโทร+ฝาก + ฟอร์มบันทึกการโทร (ใส่ยอดฝาก → สถานะเป็น "กลับมาฝาก" อัตโนมัติ) + เทมเพลต SMS |
| **เว็บ/แบรนด์** (`/brands`) | สรุปรายเว็บ |
| **รายงาน** (`/reports`) | สรุปผลงาน, รายพนักงาน, วิเคราะห์การฝาก (cohort) + ส่งออก |
| **คลังข้อความ SMS** (`/admin/sms-templates`) | เทมเพลตกลางให้พนักงานคัดลอกไปส่งเอง + สร้างข้อความหลายเบอร์ |
| **ตั้งค่าแจ้งเตือน** (`/admin/notifications`) | ตั้งค่าแจ้งเตือน Telegram (หัวหน้าทีมขึ้นไป) |
| **บันทึกตรวจสอบ** (`/admin/audit`) | ใครทำอะไรเมื่อไหร่ (ผู้จัดการเท่านั้น) |
| **จัดการผู้ใช้** (`/users`) | สร้าง/ปิด/รีเซ็ตรหัสพนักงาน (ผู้จัดการเท่านั้น) |

---

## ⚙️ รันในเครื่อง (development)

```bash
cd crm-app
npm install          # ติดตั้ง dependencies (ครั้งแรก)
npm run dev          # เปิดเว็บที่ http://localhost:3000
```

> ต้องมีไฟล์ `.env` (ดูตัวอย่างใน `.env.example`) — มี `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` อย่างน้อย

⚠️ **ข้อควรระวัง:** ถ้ารัน `npm run build` ขณะ `npm run dev` เปิดอยู่ จะทำให้ dev พัง (Internal Server Error)
แก้โดย: หยุด dev → `rm -rf .next` → `npm run dev` ใหม่

---

## 📦 คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เปิดเว็บโหมดพัฒนา (localhost:3000) |
| `npm run build` | สร้าง production build (เช็คว่าโค้ดผ่าน) |
| `npm start` | รัน production build ในเครื่อง |
| `npm run db:push` | อัปเดตโครงสร้างฐานข้อมูลตาม `prisma/schema.prisma` |
| `npm run db:backup` | สำรองข้อมูลออกเป็นไฟล์ |
| `npm run db:restore` | กู้ข้อมูลจากไฟล์สำรอง |
| `npm run import` | นำเข้าจาก Excel **(ล้างของเดิมแล้วโหลดใหม่)** |
| `npm run import:add` | นำเข้าจาก Excel **(เพิ่มต่อ ไม่ลบของเดิม)** |
| `npm run users` | สร้างบัญชีผู้ใช้เริ่มต้น |
| `npx prisma studio` | เปิดหน้า GUI ดู/แก้ฐานข้อมูล |

---

## 🚀 Deploy ขึ้น production (Vercel)

```bash
# 1) สร้าง Vercel token ที่ vercel.com/account/settings/tokens (Scope = Full Account)
# 2) deploy
npx vercel deploy --prod --yes \
  --scope thichana21-designs-projects \
  --token=<VERCEL_TOKEN>
```

- โฮสต์: **Vercel** (project `crm-followup`, region โตเกียว `hnd1`)
- ฐานข้อมูล: **Supabase Postgres** (โตเกียว ap-northeast-1) — วางเซิร์ฟเวอร์ติดฐานข้อมูลเพื่อความเร็ว
- ตั้งค่า env บน Vercel ผ่าน `npx vercel env add <NAME> production --token=...`
- งานตามเวลา (cron) ตั้งใน `vercel.json` (เวลา UTC)

---

## 🔧 Environment variables

ดูตัวอย่างเต็มใน [`.env.example`](.env.example) — สรุปตัวสำคัญ:

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | เชื่อม Supabase Postgres (pooler / direct) |
| `AUTH_SECRET` | เซ็นโทเค็น session (สุ่มยาวๆ) |
| `CRON_SECRET` | ป้องกัน endpoint cron |
| `TELEGRAM_BOT_TOKEN` | บอตแจ้งเตือน + ส่งรหัสผ่าน (ลืมรหัส) |
| `SMS_PROVIDER` + คีย์ | (ออปชัน) ต่อ SMS gateway จริง — ยังไม่ได้เปิดใช้ |

> ไฟล์ `.env` ไม่ถูกอัปขึ้น git (อยู่ใน `.gitignore`) — เก็บรหัสลับไว้ในเครื่อง/Vercel เท่านั้น

---

## 📨 หมายเหตุฟีเจอร์

- **SMS:** ระบบ *เตรียมข้อความให้คัดลอกไปส่งเอง* (ไม่ได้ส่งอัตโนมัติ) — โครงรองรับ gateway ไว้แล้ว เปิดใช้ได้ภายหลัง
- **Telegram:** ใช้ส่งแจ้งเตือนเหตุการณ์ (ยอดฝากใหญ่, สรุปประจำวัน ฯลฯ) + ส่งรหัสผ่านชั่วคราวตอนลืมรหัส
- **เวลา:** ทุกหน้าที่แสดงวัน-เวลาใช้ **Asia/Bangkok** เสมอ ไม่ขึ้นกับโซนเซิร์ฟเวอร์

---

## 🗂️ โครงสร้างข้อมูล (Prisma models)

`Brand` (เว็บ) · `Customer` (ลูกค้า, เบอร์ไม่ซ้ำต่อเว็บ, สถานะ ขาดฝาก/กลับมาฝาก/เลิกเล่น/ห้ามโทร) ·
`Call` (การโทรแต่ละครั้ง) · `Deposit` (ยอดฝากรายวัน) · `BonusAdjustment` (ปรับโบนัส) ·
`Agent` (ผู้ใช้/พนักงาน) · `SmsTemplate` · `Setting` · `StatusChangeLog` · `AuditLog`

---

## 🛠️ Tech stack

Next.js 15 (App Router, Server Actions) · Prisma 6 · PostgreSQL (Supabase) ·
Custom auth (HMAC session, httpOnly cookie) · Telegram Bot API · Vercel (hosting + cron)
