# Base URLs
$AUTH = "http://34.10.139.168.nip.io/auth"
$USVC = "http://34.10.139.168.nip.io/ususarios"

# 1) Login as admin to Auth, get Bearer
$login = Invoke-RestMethod -Method POST -Uri "$AUTH/api/auth/login" `
  -ContentType "application/json" `
  -Body (@{ username="beto"; password="beto2025" } | ConvertTo-Json)
$AT = $login.access_token
$H  = @{ Authorization = "Bearer $AT" }

# Helper to print as pretty JSON
function Show($title, $obj) {
  Write-Host "`n== $title ==" -ForegroundColor Cyan
  $obj | ConvertTo-Json -Depth 8
}

# 2) Health
$health = Invoke-RestMethod -Uri "$USVC/health"
Show "Gestion_users /health" $health

# 3) List users
$lst = Invoke-RestMethod -Uri "$USVC/users/list?limit=5" -Headers $H
Show "GET /users/list?limit=5" $lst

# 4) Counters
$cnt = Invoke-RestMethod -Uri "$USVC/users/counters" -Headers $H
Show "GET /users/counters" $cnt

# 5) Detail for user 3
$detail = Invoke-RestMethod -Uri "$USVC/users/3/detail" -Headers $H
Show "GET /users/3/detail (before changes)" $detail

# 6) Toggle flags
$setActive = Invoke-RestMethod -Method PUT -Uri "$USVC/users/3/active" -Headers $H `
  -ContentType "application/json" -Body (@{ is_active=$true } | ConvertTo-Json)
Show "PUT /users/3/active -> true" $setActive

$setAdmin = Invoke-RestMethod -Method PUT -Uri "$USVC/users/3/admin" -Headers $H `
  -ContentType "application/json" -Body (@{ is_admin=$true } | ConvertTo-Json)
Show "PUT /users/3/admin -> true" $setAdmin

# 7) Verify changes
$detail2 = Invoke-RestMethod -Uri "$USVC/users/3/detail" -Headers $H
Show "GET /users/3/detail (after changes)" $detail2
