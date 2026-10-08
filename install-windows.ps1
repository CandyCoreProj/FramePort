# ติดตั้งหรืออัปเดต FramePort บน Windows ด้วยคำสั่งเดียว (วางใน PowerShell):
#   irm https://raw.githubusercontent.com/CandyCoreProj/FramePort/main/install-windows.ps1 | iex
# ไฟล์ที่โหลดด้วย PowerShell ไม่ถูกติด Mark of the Web จึงไม่ขึ้นหน้า SmartScreen
# "Windows protected your PC" ที่ต้องกด More info → Run anyway
& {
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue"  # แถบ progress ของ PowerShell 5.1 ทำให้โหลดช้ามาก
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  $url = "https://github.com/CandyCoreProj/FramePort/releases/latest/download/FramePort-Setup.exe"
  $setup = Join-Path $env:TEMP "FramePort-Setup.exe"

  Write-Host "กำลังดาวน์โหลด FramePort..."
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $setup

  Get-Process FramePort -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "กำลังติดตั้ง..."
  # /S = ติดตั้งแบบเงียบ ลงเฉพาะผู้ใช้นี้ ไม่ต้องขอสิทธิ์ admin (อัปเดตจะลงที่เดิม)
  $proc = Start-Process -FilePath $setup -ArgumentList "/S" -Wait -PassThru
  Remove-Item $setup -ErrorAction SilentlyContinue
  if ($proc.ExitCode -ne 0) { throw "ติดตั้งไม่สำเร็จ (exit code $($proc.ExitCode))" }

  # หาที่ติดตั้งจากรายการโปรแกรมในเครื่อง เผื่อผู้ใช้เคยเปลี่ยนโฟลเดอร์ไว้
  $exe = Join-Path $env:LOCALAPPDATA "Programs\FramePort\FramePort.exe"
  $entry = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "FramePort*" -and $_.DisplayIcon } | Select-Object -First 1
  if ($entry) { $exe = ($entry.DisplayIcon -split ",")[0].Trim('"') }

  Write-Host "ติดตั้งเสร็จแล้วที่ $(Split-Path $exe)"
  Start-Process -FilePath $exe
}
