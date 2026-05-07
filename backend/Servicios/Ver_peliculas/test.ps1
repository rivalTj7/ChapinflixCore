$CAT = "http://localhost:8010"
$VIEW = "http://localhost:8020"
$AUTH = "http://localhost:8000"

# 1) Login
$login = Invoke-RestMethod -Method POST -Uri "$AUTH/api/auth/login" -ContentType "application/json" -Body (@{ username="beto"; password="beto2025" } | ConvertTo-Json)
$AT = $login.access_token
$H = @{ Authorization = "Bearer $AT" }

# 2) Ensure there’s at least one movie in Mongo (created via catalog upload)

# 3) Get detail (public)
Invoke-RestMethod -Method GET -Uri "$VIEW/movie/rapidos-9"

# 4) Can view (public or with cookie/header)
Invoke-RestMethod -Method GET -Uri "$VIEW/movie/rapidos-9/can-view" -Headers $H

# 5) Play (requires auth)
Invoke-RestMethod -Method POST -Uri "$VIEW/movie/rapidos-9/play" -Headers $H
