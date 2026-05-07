# test.ps1 — Ver_catalogo smoke test (fixed URL interpolation)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ====== CONFIG ======
$BaseUrl          = "http://localhost:8080/vercatalogo"
$AuthUrl          = "http://localhost:8080/auth/api/auth/login"
$Username         = "beto"
$Password         = "beto2025"
$TestCategorySlug = "accion"
$Limit            = 10

Write-Host "=== Ver_catalogo tester ===" -ForegroundColor Cyan
Write-Host "BaseUrl = $BaseUrl"
Write-Host "AuthUrl = $AuthUrl"
Write-Host ""

function Get-BearerToken {
  param([string]$Url, [string]$User, [string]$Pass)
  try {
    $body = @{ username = $User; password = $Pass } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Method POST -Uri $Url -ContentType "application/json" -Body $body
    if ($resp.access_token) { return "Bearer $($resp.access_token)" }
  } catch {
    Write-Warning "Login failed (continuing unauthenticated). $($_.Exception.Message)"
  }
  return $null
}

function Invoke-GET {
  param([string]$Path, [bool]$UseAuth = $false)
  $uri = "$BaseUrl$Path"
  $headers = @{}
  if ($UseAuth -and $script:Bearer) { $headers["Authorization"] = $script:Bearer }
  try {
    Invoke-RestMethod -Method GET -Uri $uri -Headers $headers
  } catch {
    Write-Host "GET $Path -> ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkRed
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails -ForegroundColor DarkRed }
    $null
  }
}

function Show-ItemsTable {
  param($Items)
  if (-not $Items) { Write-Host "(no items)"; return }
  $Items |
    Select-Object movie_id, title, slug, is_free, classification_code, duration_minutes, view_count, upload_date, last_viewed, watch_count |
    Format-Table -AutoSize
}

# login (optional)
$script:Bearer = Get-BearerToken -Url $AuthUrl -User $Username -Pass $Password
if ($script:Bearer) { Write-Host "Login OK -> Using Authorization header" } else { Write-Host "No token -> Proceeding without Authorization header" }
Write-Host ""

# 1) health
Write-Host "=> /health" -ForegroundColor Yellow
$health = Invoke-GET -Path "/health"
$health | ConvertTo-Json -Depth 6
Write-Host ""

# 2) categories
Write-Host "=> /catalog/categories" -ForegroundColor Yellow
$cats = Invoke-GET -Path "/catalog/categories"
if ($cats) { $cats | Select-Object category_id, name, slug, parent_id | Format-Table -AutoSize }
Write-Host ""

# 3) most-popular
Write-Host "=> /catalog/most-popular?limit=$Limit" -ForegroundColor Yellow
$popular = Invoke-GET -Path "/catalog/most-popular?limit=$Limit"
if ($popular) { Write-Host "Total: $($popular.total)"; Show-ItemsTable -Items $popular.items }
Write-Host ""

# 4) top-15
Write-Host "=> /catalog/top-15" -ForegroundColor Yellow
$top15 = Invoke-GET -Path "/catalog/top-15"
if ($top15) { Write-Host "Total: $($top15.total)"; Show-ItemsTable -Items $top15.items }
Write-Host ""

# 5) recently-added
Write-Host "=> /catalog/recently-added?limit=$Limit" -ForegroundColor Yellow
$recent = Invoke-GET -Path "/catalog/recently-added?limit=$Limit"
if ($recent) { Write-Host "Total: $($recent.total)"; Show-ItemsTable -Items $recent.items }
Write-Host ""

# 6) featured
Write-Host "=> /catalog/featured" -ForegroundColor Yellow
$featured = Invoke-GET -Path "/catalog/featured"
if ($featured) {
  $featured | Select-Object movie_id, title, slug, is_free, classification_code, duration_minutes, banner_url, poster_url | Format-Table -AutoSize
} else {
  Write-Host "(none)"
}
Write-Host ""

# 7) by category  (FIXED: use $() around the slug before '?')
Write-Host "=> /catalog/category/$($TestCategorySlug)?limit=$Limit&offset=0" -ForegroundColor Yellow
$byCat1 = Invoke-GET -Path "/catalog/category/$($TestCategorySlug)?limit=$Limit&offset=0"
if ($byCat1) { Write-Host "Total (page count): $($byCat1.total)"; Show-ItemsTable -Items $byCat1.items }
Write-Host ""

# 8) recently-watched (auth-optional)  (brace $Limit as well)
Write-Host "=> /catalog/recently-watched?limit=$($Limit)" -ForegroundColor Yellow
$rw = Invoke-GET -Path "/catalog/recently-watched?limit=$($Limit)" -UseAuth:$true
if ($rw) { Write-Host "Total: $($rw.total)"; Show-ItemsTable -Items $rw.items }
Write-Host ""

# 9) watch-again (auth-optional)
Write-Host "=> /catalog/watch-again?limit=$($Limit)" -ForegroundColor Yellow
$wa = Invoke-GET -Path "/catalog/watch-again?limit=$($Limit)" -UseAuth:$true
if ($wa) { Write-Host "Total: $($wa.total)"; Show-ItemsTable -Items $wa.items }
Write-Host ""

Write-Host "=== Done ===" -ForegroundColor Cyan
