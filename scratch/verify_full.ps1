$luaContent = Get-Content -Raw "d:\websiteAirShield\AirShield\config.lua"
$tsxContent = Get-Content -Raw "d:\websiteAirShield\root\website\src\pages\Settings.tsx"

Write-Host "================ FULL VERIFICATION ================"

# Extract all Config.Protections from lua
$luaProtectionsBlock = [regex]::Match($luaContent, "Config\.Protections\s*=\s*\{([\s\S]*?)\}\n\nConfig\.EnforcementActions").Groups[1].Value
$luaProtections = [regex]::Matches($luaProtectionsBlock, "\['([^'\]]+)'\]\s*=") | ForEach-Object { $_.Groups[1].Value }

# Extract all protections from TSX default arrays
$tsxDefaultBlocks = [regex]::Matches($tsxContent, "const default[A-Za-z]+Options: AnticheatOption\[\] = \[([\s\S]*?)\];")
$tsxProtections = @()
foreach ($block in $tsxDefaultBlocks) {
    $matches = [regex]::Matches($block.Groups[1].Value, "id:\s*'([^']+)'")
    foreach ($m in $matches) {
        $tsxProtections += $m.Groups[1].Value
    }
}

Write-Host "`n1. Protections in Lua but NOT in TSX ($(($luaProtections | Where-Object { $_ -notin $tsxProtections }).Count)):"
($luaProtections | Where-Object { $_ -notin $tsxProtections }) | ForEach-Object { Write-Host "  + $_" }

Write-Host "`n2. Protections in TSX but NOT in Lua ($(($tsxProtections | Where-Object { $_ -notin $luaProtections }).Count)):"
($tsxProtections | Where-Object { $_ -notin $luaProtections }) | ForEach-Object { Write-Host "  - $_" }
