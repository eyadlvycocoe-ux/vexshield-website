$luaContent = Get-Content -Raw "d:\websiteAirShield\AirShield\config.lua"
$tsxContent = Get-Content -Raw "d:\websiteAirShield\root\website\src\pages\Settings.tsx"

Write-Host "=== LUA ARRAYS vs TSX ARRAYS ==="

function Compare-Arrays ($name, $luaPattern, $tsxPattern) {
    Write-Host "`n--- $name ---"
    $luaMatch = [regex]::Match($luaContent, $luaPattern)
    $tsxMatch = [regex]::Match($tsxContent, $tsxPattern)
    
    if (-not $luaMatch.Success) { Write-Host "Lua pattern not found"; return }
    if (-not $tsxMatch.Success) { Write-Host "TSX pattern not found"; return }
    
    $luaItems = [regex]::Matches($luaMatch.Groups[1].Value, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
    if ($luaItems.Count -eq 0) {
        $luaItems = [regex]::Matches($luaMatch.Groups[1].Value, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
    }
    
    $tsxItems = [regex]::Matches($tsxMatch.Groups[1].Value, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
    if ($tsxItems.Count -eq 0) {
        $tsxItems = [regex]::Matches($tsxMatch.Groups[1].Value, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
    }

    $inLuaNotTsx = $luaItems | Where-Object { $_ -notin $tsxItems }
    $inTsxNotLua = $tsxItems | Where-Object { $_ -notin $luaItems }

    Write-Host "In config.lua count: $($luaItems.Count) | In Settings.tsx count: $($tsxItems.Count)"
    if ($inLuaNotTsx.Count -gt 0) {
        Write-Host "In config.lua but NOT in Settings.tsx ($($inLuaNotTsx.Count)):"
        $inLuaNotTsx | ForEach-Object { Write-Host "  + $_" }
    } else {
        Write-Host "No items in config.lua missing from Settings.tsx"
    }
    
    if ($inTsxNotLua.Count -gt 0) {
        Write-Host "In Settings.tsx but NOT in config.lua ($($inTsxNotLua.Count)):"
        $inTsxNotLua | ForEach-Object { Write-Host "  - $_" }
    } else {
        Write-Host "No extra items in Settings.tsx"
    }
}

Compare-Arrays "BlacklistedMenuWords" "Config\.BlacklistedMenuWords\s*=\s*\{([\s\S]*?)\}\n\n" "defaultBlacklistedMenuWords: string\[\] = \[([\s\S]*?)\];"
Compare-Arrays "BlacklistedTriggers" "Config\.BlacklistedTriggers\s*=\s*\{([\s\S]*?)\}\n\n" "blacklistedTriggers, setBlacklistedTriggers[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "WhitelistedTriggers" "Config\.WhitelistedTriggers\s*=\s*\{([\s\S]*?)\}\n\n" "whitelistedTriggers, setWhitelistedTriggers[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "BlacklistedNames" "Config\.BlacklistedNames\s*=\s*\{([\s\S]*?)\}\n\n" "blacklistedNames, setBlacklistedNames[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "BlacklistedProps" "Config\.BlacklistedProps\s*=\s*\{([\s\S]*?)\}\n\n" "antiObjects, setAntiObjects[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "BlacklistedVehicles" "Config\.BlacklistedVehicles\s*=\s*\{([\s\S]*?)\}\n\n" "blacklistedVehicles, setBlacklistedVehicles[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "BlacklistedPeds" "Config\.BlacklistedPeds\s*=\s*\{([\s\S]*?)\}\n\n" "blacklistedPeds, setBlacklistedPeds[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "BlacklistedWeapons" "Config\.BlacklistedWeapons\s*=\s*\{([\s\S]*?)\}\n\n" "blacklistedWeapons, setBlacklistedWeapons[\s\S]*?\[([\s\S]*?)\]\);"
Compare-Arrays "AllowedResources" "Config\.AllowedResources\s*=\s*\{([\s\S]*?)\}\n\n" "allowedResources, setAllowedResources[\s\S]*?\[([\s\S]*?)\]\);"
