# JLPT Vocab

เว็บรวมคำศัพท์ JLPT N5–N1 (7,972 คำ) — อ่าน ค้นหา ท่องด้วย flashcard และทำ quiz
ทำงานบนเบราว์เซอร์ล้วน ไม่มี backend, progress เก็บใน localStorage

## Features

- **Browse** — ไล่ดู/ค้นหาศัพท์ตามระดับ (คันจิ, คำอ่าน, ความหมาย EN) และ MARK คำที่รู้แล้ว
- **Flashcards** — สุ่มการ์ด 10/20/50 ใบ แตะเปิดเฉลย ตอบตัวเองว่ารู้หรือยัง
  คำที่รู้แล้วถูกจดจำและข้ามได้ในรอบถัดไป
- **Quiz** — 10 ข้อ เลือกความหมายถูกจาก 4 ตัวเลือก ตัวลวงสุ่มจากระดับเดียวกัน

## Stack

Vite + React (JSX), no other runtime dependencies. Client-side only.

## Run

```bash
pnpm install     # หรือ npm install
pnpm dev         # localhost:5173
pnpm build       # ได้ dist/ เอาไปวางที่ static host ใดก็ได้ (base: './')
```

## Data

คำศัพท์จาก [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) (MIT)
แปลงจาก CSV เป็น JSON ไว้ที่ `src/data/*.json` ตอน build ไม่มีการโหลดข้อมูลจากภายนอก

รูปแบบข้อมูล: `[expression, reading, meaning]` ต่อคำ

## Design

Monochrome minimal ตาม Aioneday Brand CI — Ink `#111111` บน Paper `#FAFAF7`,
ฟอนต์ IBM Plex Sans Thai / Noto Sans JP / Archivo / JetBrains Mono
