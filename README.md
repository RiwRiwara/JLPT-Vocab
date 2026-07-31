# JLPT Vocab
<img width="963" height="931" alt="image" src="https://github.com/user-attachments/assets/a7c40a97-b6b4-4a19-9b6d-3cb849bb3b00" />
/assets/1389b984-953b-4079-a608-1042e3742b17" />

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
<img width="927" height="659" alt="image" src="https://github.com/user-attachments/assets/d9107b51-3dae-4352-b043-ed2d278a9960" />
<img width="1009" height="635" alt="image" src="https://github.com/user-attachments
