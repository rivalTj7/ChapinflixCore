# ====== Setup ======
$ErrorActionPreference = "Stop"

$AUTH     = "http://localhost:8080/auth"
$CAT_BASE = "http://localhost:8080/inventario"

# Login (content handler)
$login = Invoke-RestMethod -Method POST -Uri "$AUTH/api/auth/login" `
  -ContentType "application/json" `
  -Body (@{ username="beto"; password="beto2025" } | ConvertTo-Json)
$AT = $login.access_token

# Ensure category (idempotent) - use a different var name than $CAT
$catResp = Invoke-RestMethod -Method POST -Uri "$CAT_BASE/catalog/categories" `
  -Headers @{ Authorization = "Bearer $AT" } `
  -ContentType "application/json" `
  -Body (@{ name="Acción"; slug="accion" } | ConvertTo-Json)
"Category id: $($catResp.category_id)"

# === Upload 1 file (edit path if needed) ===
$VideoPath = "C:\Users\alber\Downloads\28yl.mp4"
$ts    = (Get-Date).ToString("yyyyMMddHHmmss")
$Title = "Clip 1 $ts"
$Slug  = "clip-1-$ts"

# Build curl args (PowerShell 5 compatible)
$curlArgs = @(
  '-s',
  '-X','POST', "$CAT_BASE/catalog/movies",
  '-H', ("Authorization: Bearer {0}" -f $AT),
  '-F', ("title={0}" -f $Title),
  '-F', ("slug={0}" -f $Slug),
  '-F', 'synopsis_short=Test clip',
  '-F', 'is_free=false',
  '-F', 'available_from=2025-01-01',
  '-F', 'available_until=2026-01-01',
  '-F', 'category_slugs=accion',
  '-F', 'language=spanish',
  '-F', ("video=@{0};type=video/mp4" -f $VideoPath)
)

$raw = & curl.exe @curlArgs

try {
  $resp = $raw | ConvertFrom-Json
  "Movie id: $($resp.movie_id)"
  "Video URL: $($resp.video_url)"
  "Verify blob in Azure: container 'movies', blob '$($resp.movie_id).mp4'"
} catch {
  Write-Host "Upload failed or non-JSON response:" -ForegroundColor Red
  $raw
}
