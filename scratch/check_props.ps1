$luaContent = Get-Content -Raw "d:\websiteAirShield\AirShield\config.lua"
$tsxContent = Get-Content -Raw "d:\websiteAirShield\root\website\src\pages\Settings.tsx"

$luaMatch = [regex]::Match($luaContent, "Config\.BlacklistedProps\s*=\s*\{([\s\S]*?)\}\n\n")
$luaItems = [regex]::Matches($luaMatch.Groups[1].Value, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }

$tsxMatch = [regex]::Match($tsxContent, "defaultBlacklistedProps:\s*string\[\]\s*=\s*\[([\s\S]*?)\];")
$tsxItems = [regex]::Matches($tsxMatch.Groups[1].Value, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }

$inLuaNotTsx = $luaItems | Where-Object { $_ -notin $tsxItems }
$inTsxNotLua = $tsxItems | Where-Object { $_ -notin $luaItems }

Write-Host "Lua Props: $($luaItems.Count) | TSX Props: $($tsxItems.Count)"
Write-Host "Missing in TSX: $($inLuaNotTsx.Count)"
Write-Host "Extra in TSX: $($inTsxNotLua.Count)"
