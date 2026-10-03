#!/bin/bash
# ติดตั้งหรืออัปเดต FramePort บน macOS ด้วยคำสั่งเดียว:
#   curl -fsSL https://raw.githubusercontent.com/CandyCoreProj/FramePort/main/install-mac.sh | bash
# ไฟล์ที่โหลดด้วย curl ไม่ถูกติด quarantine จึงเปิดได้ทันทีโดยไม่ต้องไปกด Open Anyway
set -euo pipefail

# เช็กชิปจริงของเครื่อง (uname -m ตอบ x86_64 ถ้า Terminal รันผ่าน Rosetta)
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = 1 ]; then ARCH=arm64; else ARCH=x64; fi
URL="https://github.com/CandyCoreProj/FramePort/releases/latest/download/FramePort-mac-$ARCH.dmg"

# ไม่มีสิทธิ์เขียน /Applications ก็ลงใน ~/Applications แทน จะได้ไม่ต้องใส่รหัสผ่าน
DEST=/Applications
[ -w "$DEST" ] || { DEST="$HOME/Applications"; mkdir -p "$DEST"; }

TMP=$(mktemp -d)
MNT="$TMP/mnt"
trap 'hdiutil detach "$MNT" -quiet 2>/dev/null || true; rm -rf "$TMP"' EXIT

echo "กำลังดาวน์โหลด FramePort ($ARCH)..."
curl -fL --progress-bar -o "$TMP/FramePort.dmg" "$URL"

hdiutil attach "$TMP/FramePort.dmg" -nobrowse -readonly -quiet -mountpoint "$MNT"
osascript -e 'quit app "FramePort"' 2>/dev/null || true
rm -rf "$DEST/FramePort.app"
ditto "$MNT/FramePort.app" "$DEST/FramePort.app"
xattr -dr com.apple.quarantine "$DEST/FramePort.app" 2>/dev/null || true

echo "ติดตั้งเสร็จแล้วที่ $DEST/FramePort.app"
open "$DEST/FramePort.app"
