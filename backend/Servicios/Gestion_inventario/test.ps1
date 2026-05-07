# Login
$AUTH = "http://localhost:8000"
$CAT  = "http://localhost:8010"
$login = Invoke-RestMethod -Method POST -Uri "$AUTH/api/auth/login" -ContentType "application/json" -Body (@{ username="beto"; password="beto2025" } | ConvertTo-Json)
$AT = $login.access_token
$H  = @{ Authorization = "Bearer $AT" }

# Create category (idempotent)
$catResp = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/categories" -Headers $H -ContentType "application/json" -Body (@{ name="Acción"; slug="accion" } | ConvertTo-Json)
"Category id: $($catResp.category_id)"

# Create movie (no nulls for text index override; 'language' can be omitted or be a string)
$movieResp = Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies" -Headers $H -ContentType "application/json" -Body (@{
  title="Rápidos 9"; slug="rapidos-9"; synopsis_short="Coches y familia";
  is_free=$false; available_from="2025-01-01"; available_until="2026-01-01";
  category_slugs=@("accion");
  # Optional and must be string if present:
  language="spanish"  # or omit this line entirely
} | ConvertTo-Json)

$mid = $movieResp.movie_id
"Movie id: $mid"

# Patch title
Invoke-RestMethod -Method PATCH -Uri "$CAT/catalog/movies/$mid" -Headers $H -ContentType "application/json" -Body (@{ title="Fast 9" } | ConvertTo-Json)

# Add image
Invoke-RestMethod -Method POST -Uri "$CAT/catalog/movies/$mid/images" -Headers $H -ContentType "application/json" -Body (@{ url="https://img/poster.jpg"; label="poster" } | ConvertTo-Json)
