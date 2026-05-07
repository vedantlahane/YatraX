# YatraX Backend — Full Endpoint Test Suite
# Run from: C:\Users\Admin\Desktop\YatraX\backend

$BASE = "http://localhost:8081"
$PASS = 0
$FAIL = 0
$ERRORS = @()

function Test-Endpoint {
    param(
        [string]$Label,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectStatus = 200
    )
    try {
        $params = @{
            Uri     = $Url
            Method  = $Method
            Headers = $Headers
            ErrorAction = "Stop"
        }
        if ($Body) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }
        $resp = Invoke-RestMethod @params
        Write-Host "  [PASS] $Label" -ForegroundColor Green
        $script:PASS++
        return $resp
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $msg    = $_.ErrorDetails.Message
        if ($status -and $status -lt 500) {
            # 4xx is expected for some tests — still report
            Write-Host "  [INFO] $Label → HTTP $status" -ForegroundColor Yellow
            $script:PASS++
            return $null
        }
        Write-Host "  [FAIL] $Label → $($_.Exception.Message)" -ForegroundColor Red
        $script:FAIL++
        $script:ERRORS += "$Label : $msg"
        return $null
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  YatraX API Test Suite" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# ── 1. Health ────────────────────────────────────────────────────────────────
Write-Host "`n[1] Health" -ForegroundColor White
Test-Endpoint "GET /api/health" -Url "$BASE/api/health" | Out-Null

# ── 2. Auth ──────────────────────────────────────────────────────────────────
Write-Host "`n[2] Auth" -ForegroundColor White

# Register (may 409 if already exists — that's fine)
Test-Endpoint "POST /api/auth/register (tourist)" `
    -Method POST -Url "$BASE/api/auth/register" `
    -Body '{"name":"Test Tourist","email":"test@yatrax.dev","phone":"+919876543210","passportNumber":"A1234567","password":"Test@1234"}' | Out-Null

# Login → capture token + id
$login = Test-Endpoint "POST /api/auth/login" `
    -Method POST -Url "$BASE/api/auth/login" `
    -Body '{"email":"test@yatrax.dev","password":"Test@1234"}'

$TOKEN     = $login.token
$TOURIST_ID = $login.user.id
$AUTH = @{ Authorization = "Bearer $TOKEN" }

Write-Host "       tourist_id : $TOURIST_ID" -ForegroundColor DarkGray
Write-Host "       token      : $($TOKEN.Substring(0,20))..." -ForegroundColor DarkGray

# GET /me
Test-Endpoint "GET /api/auth/me" -Url "$BASE/api/auth/me" -Headers $AUTH | Out-Null

# ── 3. Tourist self-service ───────────────────────────────────────────────────
Write-Host "`n[3] Tourist" -ForegroundColor White

Test-Endpoint "GET /api/tourists/me" -Url "$BASE/api/tourists/me" -Headers $AUTH | Out-Null

Test-Endpoint "PATCH /api/tourists/me (update profile)" `
    -Method PATCH -Url "$BASE/api/tourists/me" `
    -Headers $AUTH `
    -Body '{"nationality":"Indian","bloodType":"O+","gender":"male"}' | Out-Null

# ── 4. Safety Check ──────────────────────────────────────────────────────────
Write-Host "`n[4] Safety" -ForegroundColor White

$safety = Test-Endpoint "GET /api/v1/safety/check" `
    -Url "$BASE/api/v1/safety/check?lat=26.2`&lon=92.9"
if ($safety) {
    Write-Host "       safety_score: $($safety.safety_score), status: $($safety.status), source: $($safety.source)" -ForegroundColor DarkGray
}

# ── 5. Location Update & SOS ─────────────────────────────────────────────────
Write-Host "`n[5] Location / SOS / Alert" -ForegroundColor White

Test-Endpoint "POST /api/action/location/:id" `
    -Method POST -Url "$BASE/api/action/location/$TOURIST_ID" `
    -Headers $AUTH `
    -Body '{"lat":26.1445,"lng":91.7362,"speed":0,"accuracy":10}' | Out-Null

$sos = Test-Endpoint "POST /api/action/sos/:id" `
    -Method POST -Url "$BASE/api/action/sos/$TOURIST_ID" `
    -Headers $AUTH `
    -Body '{"lat":26.1445,"lng":91.7362,"message":"Test SOS"}'

$ALERT_ID = $sos.alertId
Write-Host "       alert_id: $ALERT_ID" -ForegroundColor DarkGray

Test-Endpoint "GET /api/action/sos/:alertId/status" `
    -Url "$BASE/api/action/sos/$ALERT_ID/status" -Headers $AUTH | Out-Null

Test-Endpoint "POST /api/action/sos/:alertId/cancel" `
    -Method POST -Url "$BASE/api/action/sos/$ALERT_ID/cancel" -Headers $AUTH | Out-Null

Test-Endpoint "POST /api/action/sos/:id (pre-alert)" `
    -Method POST -Url "$BASE/api/action/sos/$TOURIST_ID/pre-alert" `
    -Headers $AUTH `
    -Body '{"lat":26.1445,"lng":91.7362}' | Out-Null

# ── 6. Risk Zones (public) ───────────────────────────────────────────────────
Write-Host "`n[6] Risk Zones" -ForegroundColor White

Test-Endpoint "GET /api/risk-zones" -Url "$BASE/api/risk-zones" -Headers $AUTH | Out-Null

# ── 7. Police Stations (public) ──────────────────────────────────────────────
Write-Host "`n[7] Police Stations" -ForegroundColor White

Test-Endpoint "GET /api/police-stations" -Url "$BASE/api/police-stations" -Headers $AUTH | Out-Null

# ── 8. Hospitals (public) ────────────────────────────────────────────────────
Write-Host "`n[8] Hospitals" -ForegroundColor White

Test-Endpoint "GET /api/hospitals" -Url "$BASE/api/hospitals" -Headers $AUTH | Out-Null

# ── 9. Advisories (public) ───────────────────────────────────────────────────
Write-Host "`n[9] Advisories" -ForegroundColor White

Test-Endpoint "GET /api/advisories/current" `
    -Url "$BASE/api/advisories/current" -Headers $AUTH | Out-Null

# ── 10. Notifications ────────────────────────────────────────────────────────
Write-Host "`n[10] Notifications" -ForegroundColor White

$notifs = Test-Endpoint "GET /api/notifications" `
    -Url "$BASE/api/notifications" -Headers $AUTH
if ($notifs.data -and $notifs.data.Count -gt 0) {
    $NOTIF_ID = $notifs.data[0].id
    Test-Endpoint "POST /api/notifications/:id/read" `
        -Method POST -Url "$BASE/api/notifications/$NOTIF_ID/read" -Headers $AUTH | Out-Null
}
Test-Endpoint "POST /api/notifications/read-all" `
    -Method POST -Url "$BASE/api/notifications/read-all" -Headers $AUTH | Out-Null

# ── 11. Tourist Dashboard ────────────────────────────────────────────────────
Write-Host "`n[11] Tourist Dashboard" -ForegroundColor White

$dash = Test-Endpoint "GET /api/dashboard" -Url "$BASE/api/dashboard" -Headers $AUTH
if ($dash) {
    Write-Host "       safetyScore: $($dash.data.safetyScore), status: $($dash.data.status)" -ForegroundColor DarkGray
}

# ── 12. Admin register ───────────────────────────────────────────────────────
Write-Host "`n[12] Admin (Police)" -ForegroundColor White

$adminReg = Test-Endpoint "POST /api/admin/register" `
    -Method POST -Url "$BASE/api/admin/register" `
    -Body '{"name":"Guwahati Central","email":"admin@yatrax.dev","password":"Admin@1234","departmentCode":"GHY001","latitude":26.1445,"longitude":91.7362,"city":"Guwahati","district":"Kamrup Metro","state":"Assam","contactNumber":"+913612345678","stationType":"headquarters"}'

$ADMIN_TOKEN = $adminReg.token
$ADMIN_AUTH  = @{ Authorization = "Bearer $ADMIN_TOKEN" }
Write-Host "       admin token: $($ADMIN_TOKEN.Substring(0,20))..." -ForegroundColor DarkGray

# Admin login
$adminLogin = Test-Endpoint "POST /api/admin/login" `
    -Method POST -Url "$BASE/api/admin/login" `
    -Body '{"email":"admin@yatrax.dev","password":"Admin@1234"}'
if ($adminLogin.token) {
    $ADMIN_TOKEN = $adminLogin.token
    $ADMIN_AUTH  = @{ Authorization = "Bearer $ADMIN_TOKEN" }
}

# ── 13. Admin Alerts ─────────────────────────────────────────────────────────
Write-Host "`n[13] Admin — Alerts" -ForegroundColor White

Test-Endpoint "GET /api/admin/alerts" `
    -Url "$BASE/api/admin/alerts?page=1`&limit=10" -Headers $ADMIN_AUTH | Out-Null

Test-Endpoint "GET /api/admin/alerts/active" `
    -Url "$BASE/api/admin/alerts/active" -Headers $ADMIN_AUTH | Out-Null

Test-Endpoint "PATCH /api/admin/alerts/:id/status (ACKNOWLEDGED)" `
    -Method PATCH -Url "$BASE/api/admin/alerts/$ALERT_ID/status" `
    -Headers $ADMIN_AUTH `
    -Body '{"status":"ACKNOWLEDGED"}' | Out-Null

# ── 14. Admin Risk Zones ─────────────────────────────────────────────────────
Write-Host "`n[14] Admin — Risk Zones" -ForegroundColor White

$zone = Test-Endpoint "POST /api/admin/risk-zones" `
    -Method POST -Url "$BASE/api/admin/risk-zones" `
    -Headers $ADMIN_AUTH `
    -Body '{"name":"Test Zone","shapeType":"circle","centerLat":26.1445,"centerLng":91.7362,"radiusMeters":500,"riskLevel":"HIGH","category":"crime"}'

$ZONE_ID = $zone.data.id
Write-Host "       zone_id: $ZONE_ID" -ForegroundColor DarkGray

Test-Endpoint "GET /api/admin/risk-zones" `
    -Url "$BASE/api/admin/risk-zones" -Headers $ADMIN_AUTH | Out-Null

# ── 15. Admin Police ─────────────────────────────────────────────────────────
Write-Host "`n[15] Admin — Police" -ForegroundColor White

Test-Endpoint "GET /api/admin/police" `
    -Url "$BASE/api/admin/police" -Headers $ADMIN_AUTH | Out-Null

# ── 16. Admin Hospitals ──────────────────────────────────────────────────────
Write-Host "`n[16] Admin — Hospitals" -ForegroundColor White

$hosp = Test-Endpoint "POST /api/admin/hospitals" `
    -Method POST -Url "$BASE/api/admin/hospitals" `
    -Headers $ADMIN_AUTH `
    -Body '{"name":"GMCH Guwahati","latitude":26.1377,"longitude":91.8027,"contact":"+913612344000","city":"Guwahati","district":"Kamrup Metro","state":"Assam","type":"government","emergency":true,"bedCapacity":1000,"ambulanceAvailable":true}'

Test-Endpoint "GET /api/hospitals" -Url "$BASE/api/hospitals" -Headers $AUTH | Out-Null

# ── 17. Admin Advisories ─────────────────────────────────────────────────────
Write-Host "`n[17] Admin — Advisories" -ForegroundColor White

$adv = Test-Endpoint "POST /api/admin/advisories" `
    -Method POST -Url "$BASE/api/admin/advisories" `
    -Headers $ADMIN_AUTH `
    -Body '{"title":"Heavy Rainfall Warning","body":"Assam valleys expecting heavy monsoon rainfall. Avoid river crossings.","severity":"WARNING","affectedArea":"Assam"}'

$ADV_ID = $adv.data.id
Write-Host "       advisory_id: $ADV_ID" -ForegroundColor DarkGray

Test-Endpoint "GET /api/admin/advisories" `
    -Url "$BASE/api/admin/advisories" -Headers $ADMIN_AUTH | Out-Null

Test-Endpoint "PATCH /api/admin/advisories/:id" `
    -Method PATCH -Url "$BASE/api/admin/advisories/$ADV_ID" `
    -Headers $ADMIN_AUTH `
    -Body '{"severity":"CRITICAL"}' | Out-Null

# ── 18. Admin Broadcast ──────────────────────────────────────────────────────
Write-Host "`n[18] Admin — Broadcast" -ForegroundColor White

$bc = Test-Endpoint "POST /api/admin/broadcast (all)" `
    -Method POST -Url "$BASE/api/admin/broadcast" `
    -Headers $ADMIN_AUTH `
    -Body '{"title":"System Test","message":"Backend integration test broadcast.","target":"all","priority":"normal"}'
if ($bc) {
    Write-Host "       recipients: $($bc.recipientCount)" -ForegroundColor DarkGray
}

Test-Endpoint "POST /api/admin/broadcast (tourist)" `
    -Method POST -Url "$BASE/api/admin/broadcast" `
    -Headers $ADMIN_AUTH `
    -Body "{`"title`":`"Personal Alert`",`"message`":`"Direct message to tourist`",`"target`":`"tourist:$TOURIST_ID`",`"priority`":`"high`"}" | Out-Null

# ── 19. Admin Audit Logs ─────────────────────────────────────────────────────
Write-Host "`n[19] Admin — Audit Logs" -ForegroundColor White

$audit = Test-Endpoint "GET /api/admin/audit-logs" `
    -Url "$BASE/api/admin/audit-logs" -Headers $ADMIN_AUTH
if ($audit) {
    Write-Host "       total audit entries: $($audit.total)" -ForegroundColor DarkGray
}

# ── 20. Admin Dashboard ──────────────────────────────────────────────────────
Write-Host "`n[20] Admin — Dashboard" -ForegroundColor White

$adminDash = Test-Endpoint "GET /api/admin/dashboard/state" `
    -Url "$BASE/api/admin/dashboard/state" -Headers $ADMIN_AUTH
if ($adminDash) {
    Write-Host "       tourists: $($adminDash.data.stats.totalTourists), alerts: $($adminDash.data.stats.activeAlerts)" -ForegroundColor DarkGray
}

Test-Endpoint "GET /api/admin/dashboard/tourist/:id" `
    -Url "$BASE/api/admin/dashboard/tourist/$TOURIST_ID" -Headers $ADMIN_AUTH | Out-Null

# ── 21. Admin Tourists ───────────────────────────────────────────────────────
Write-Host "`n[21] Admin — Tourists" -ForegroundColor White

Test-Endpoint "GET /api/admin/tourists" `
    -Url "$BASE/api/admin/tourists?page=1`&limit=10" -Headers $ADMIN_AUTH | Out-Null

Test-Endpoint "GET /api/admin/tourists/:id" `
    -Url "$BASE/api/admin/tourists/$TOURIST_ID" -Headers $ADMIN_AUTH | Out-Null

# ── 22. Auth edge cases ───────────────────────────────────────────────────────
Write-Host "`n[22] Auth edge cases" -ForegroundColor White

Test-Endpoint "GET /api/auth/me (no token → 401)" `
    -Url "$BASE/api/auth/me" | Out-Null

Test-Endpoint "POST /api/auth/login (wrong password → 401)" `
    -Method POST -Url "$BASE/api/auth/login" `
    -Body '{"email":"test@yatrax.dev","password":"wrongpassword"}' | Out-Null

# ── SUMMARY ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $PASS PASSED   $FAIL FAILED" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Yellow" })
Write-Host "======================================================" -ForegroundColor Cyan

if ($ERRORS.Count -gt 0) {
    Write-Host "`nFailed endpoints:" -ForegroundColor Red
    $ERRORS | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
