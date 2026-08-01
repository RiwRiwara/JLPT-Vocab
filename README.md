# JLPT Vocab

เว็บรวมคำศัพท์ JLPT N5–N1 (7,972 คำ) — อ่าน ค้นหา ท่องด้วย flashcard และทำ quiz
ทำงานบนเบราว์เซอร์ล้วน ไม่มี backend, progress เก็บใน localStorage

## Features

- **Browse** — ไล่ดู/ค้นหาศัพท์ตามระดับ (คันจิ, คำอ่าน, ความหมาย ไทย/EN) และ MARK คำที่รู้แล้ว
- **Flashcards** — สุ่มการ์ด 10/20/50 ใบ แตะเปิดเฉลย ตอบตัวเองว่ารู้หรือยัง
  คำที่รู้แล้วถูกจดจำและข้ามได้ในรอบถัดไป
- **Quiz** — 10 ข้อ เลือกความหมายถูกจาก 4 ตัวเลือก ตัวลวงสุ่มจากระดับเดียวกัน
- **สลับภาษา** — ปุ่ม ไทย / EN / ไทย+EN บนหัวเว็บ คุมความหมายทั้ง Browse, Flashcards และ Quiz

## Stack

Vite + React (JSX), no other runtime dependencies. Client-side only.

## Run

```bash
pnpm install     # หรือ npm install
pnpm dev         # localhost:5173
pnpm build       # ได้ dist/ เอาไปวางที่ static host ใดก็ได้ (base: './')
```

## Test

```bash
pnpm test
```

เทสต์เป็น pure-function ล้วน (vitest, ไม่ใช้ jsdom) — ครอบ display rules, search,
quiz builder และ validation ของสคริปต์แปล

## Data

คำศัพท์จาก [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) (MIT)
แปลงจาก CSV เป็น JSON ไว้ที่ `src/data/*.json` ตอน build ไม่มีการโหลดข้อมูลจากภายนอก

รูปแบบข้อมูล: `[expression, reading, meaning]` ต่อคำ

คำแปลไทยอยู่ที่ `src/data/th/*.json` เป็น array ของ string เรียงตรง index กับไฟล์ข้างบน 1:1
สร้างด้วย AI ครั้งเดียวตอน authoring แล้ว commit ลง repo — ไม่มีการแปลตอน runtime
ค่าว่างหมายถึงยังไม่ได้แปล แล้วจะ fallback ไปแสดงภาษาอังกฤษแทน
7,971 จาก 7,972 คำมีการแปลไทย คำเดียวที่ไม่มี (`徹底` ความหมาย "thoroughness, completeness") ใช้อังกฤษแทน เพราะโมเดลแปลคืนภาษาญี่ปุ่นไว้ในภาษาไทยซ้ำๆ แล้ว validator ปฏิเสธถูกต้อง

ไฟล์ `src/data/th/*.json` ที่ commit ไว้ถือเป็นแหล่งข้อมูลจริง (source of truth) — สคริปต์ด้านล่างเป็นเครื่องมือที่ใช้ *สร้าง* ไฟล์เหล่านี้ขึ้นมาครั้งแรก ไม่ใช่ build step ที่รันซ้ำแล้วได้ผลลัพธ์เดิม เพราะ cache ไม่ได้ commit และผลลัพธ์จาก LLM ไม่ deterministic การรันใหม่ทั้งหมดต้องเสียค่า API จริงและได้ผลลัพธ์ไม่เหมือนเดิมทุกตัวอักษร

Bundle ที่ build แล้วมีขนาด 977 kB (raw) / 301 kB (gzip) โดยข้อมูลแปลไทยคิดเป็น 424 kB (raw) / 97 kB (gzip) ของขนาดนั้น

สร้าง/อัปเดตคำแปลใหม่:

```bash
pnpm translate:th --provider openai --model gpt-4.1        # ทั้งหมด
pnpm translate:th --provider openai --model gpt-4.1 --levels n5
pnpm translate:th --provider openai --model gpt-4.1 --sample 50  # ลองดูตัวอย่างก่อน
```

สคริปต์ cache ผลลัพธ์ไว้ที่ `scripts/translate-th/.cache/` (ไม่ commit)
หยุดกลางคันแล้วรันใหม่ได้ ของที่แปลแล้วจะถูกข้าม
สคริปต์จะไม่เขียนทับคำแปลที่ commit ไว้แล้วด้วยค่าว่าง แม้ในรันที่ cache ยังไม่มีคำนั้นหรือ validate ไม่ผ่าน

## Design

Monochrome minimal ตาม Aioneday Brand CI — Ink `#111111` บน Paper `#FAFAF7`,
ฟอนต์ IBM Plex Sans Thai / Noto Sans JP / Archivo / JetBrains Mono
