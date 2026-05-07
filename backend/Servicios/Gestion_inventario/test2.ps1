# ====== Setup ======
$ErrorActionPreference = "Stop"

$AUTH = "http://localhost:8000"
$CAT  = "http://localhost:8010"

# Login as a content handler (must have content_handler=true in JWT)
$login = Invoke-RestMethod -Method POST -Uri "$AUTH/api/auth/login" `
  -ContentType "application/json" `
  -Body (@{ username="beto"; password="beto2025" } | ConvertTo-Json)

$AT = $login.access_token
$H  = @{ Authorization = "Bearer $AT" }

Write-Host "`n== A) Categories: create (idempotent), update, soft delete =="

# Create a couple categories (idempotent)
$cat1 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/categories" -Headers $H -ContentType "application/json" -Body (@{ name="Acción"; slug="accion" } | ConvertTo-Json)
$cat2 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/categories" -Headers $H -ContentType "application/json" -Body (@{ name="Aventura"; slug="aventura" } | ConvertTo-Json)
$cat3 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/categories" -Headers $H -ContentType "application/json" -Body (@{ name="Comedia"; slug="comedia" } | ConvertTo-Json)

"cat1: $($cat1.category_id)"
"cat2: $($cat2.category_id)"
"cat3: $($cat3.category_id)"

# Update a category (rename Comedia -> Comedia y Humor)
Invoke-RestMethod -Method PATCH -Uri "$CAT/catalog/categories/$($cat3.category_id)" -Headers $H -ContentType "application/json" -Body (@{
  name="Comedia y Humor"
} | ConvertTo-Json)

# Soft-delete category "aventura"
Invoke-RestMethod -Method DELETE -Uri "$CAT/catalog/categories/$($cat2.category_id)" -Headers $H

Write-Host "`n== B) Movies: create, patch, flags, availability, is_free =="

# Create movie
$movieResp = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies" -Headers $H -ContentType "application/json" -Body (@{
  title="Rápidos 9"; slug="rapidos-9";
  synopsis_short="Coches y familia";
  is_free=$false;
  available_from="2025-01-01";
  available_until="2026-01-01";
  category_slugs=@("accion");     # link to category 'accion'
  language="spanish";             # optional string, safe for text index override
} | ConvertTo-Json)

$mid = $movieResp.movie_id
"Movie id: $mid"

# Patch some fields
Invoke-RestMethod -Method PATCH -Uri "$CAT/catalog/movies/$mid" -Headers $H -ContentType "application/json" -Body (@{
  title="Fast 9";
  synopsis_long="La familia antes que todo. Mucho nitro, mucha acción."
} | ConvertTo-Json)

# Toggle active=false then true
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/active" -Headers $H -ContentType "application/json" -Body (@{ is_active=$false } | ConvertTo-Json)
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/active" -Headers $H -ContentType "application/json" -Body (@{ is_active=$true }  | ConvertTo-Json)

# Set availability window
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/availability" -Headers $H -ContentType "application/json" -Body (@{
  available_from="2025-02-01";
  available_until="2026-02-01";
} | ConvertTo-Json)

# Toggle is_free
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/is-free" -Headers $H -ContentType "application/json" -Body (@{ is_free=$true } | ConvertTo-Json)
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/is-free" -Headers $H -ContentType "application/json" -Body (@{ is_free=$false } | ConvertTo-Json)

Write-Host "`n== C) Movie categories: replace, add, remove =="

# Replace categories entirely
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/categories" -Headers $H -ContentType "application/json" -Body (@{
  category_slugs=@("accion","comedia")   # 'comedia' still exists, 'aventura' was soft-deleted
} | ConvertTo-Json)

# Add one more (idempotent due to $addToSet)
Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies/$mid/categories/accion" -Headers $H

# Remove one
Invoke-RestMethod -Method DELETE -Uri "$CAT/catalog/movies/$mid/categories/comedia" -Headers $H

Write-Host "`n== D) Images: add multiple, reorder, delete =="

# Add image 1
$img1 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies/$mid/images" -Headers $H -ContentType "application/json" -Body (@{
  url="https://img/poster.jpg"; label="poster"; sort_order=1
} | ConvertTo-Json)

# Add image 2
$img2 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies/$mid/images" -Headers $H -ContentType "application/json" -Body (@{
  url="https://img/banner.jpg"; label="banner"; sort_order=2
} | ConvertTo-Json)

"img1: $($img1.image_id)"
"img2: $($img2.image_id)"

# Reorder: put banner first, then poster
Invoke-RestMethod -Method PUT -Uri "$CAT/catalog/movies/$mid/images/reorder" -Headers $H -ContentType "application/json" -Body (@{
  image_ids=@($img2.image_id, $img1.image_id)
} | ConvertTo-Json)

# Delete img1
Invoke-RestMethod -Method DELETE -Uri "$CAT/catalog/images/$($img1.image_id)" -Headers $H

Write-Host "`n== E) Error cases (expected 400s) =="

# Duplicate movie slug -> 400
try {
  Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies" -Headers $H -ContentType "application/json" -Body (@{
    title="Duplicated"; slug="rapidos-9";
  } | ConvertTo-Json)
} catch {
  "Duplicate slug returned expected error: $($_.ErrorDetails.Message)"
}

# Bad movie_id
try {
  Invoke-RestMethod -Method PATCH -Uri "$CAT/catalog/movies/NOT_A_VALID_ID" -Headers $H -ContentType "application/json" -Body (@{ title="X" } | ConvertTo-Json)
} catch {
  "Bad movie_id returned expected error: $($_.ErrorDetails.Message)"
}

Write-Host "`n== F) Bulk upsert = insert + update =="

# First call: insert two movies
$bulk1 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies/bulk-upsert" -Headers $H -ContentType "application/json" -Body (@{
  items = @(
    @{
      slug="pelicula-uno"; title="Pelicula Uno"; is_free=$true; categories=@("accion");
      available_from="2025-03-01"; available_until="2026-03-01"
    },
    @{
      slug="pelicula-dos"; title="Pelicula Dos"; is_free=$false; categories=@("accion","comedia")
    }
  )
} | ConvertTo-Json -Depth 6)   # <— IMPORTANT

"Bulk1 -> inserted=$($bulk1.inserted) updated=$($bulk1.updated)"

# Second call: update same slugs
$bulk2 = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies/bulk-upsert" -Headers $H -ContentType "application/json" -Body (@{
  items = @(
    @{ slug="pelicula-uno"; title="Pelicula 1 (update)"; is_free=$true;  categories=@("accion") },
    @{ slug="pelicula-dos"; title="Pelicula 2 (update)"; is_free=$true;  categories=@("accion","comedia") }
  )
} | ConvertTo-Json -Depth 6)

"Bulk2 -> inserted=$($bulk2.inserted) updated=$($bulk2.updated)"


Write-Host "`n== DONE =="
