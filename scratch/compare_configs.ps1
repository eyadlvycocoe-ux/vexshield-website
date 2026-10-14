$luaContent = Get-Content -Raw "d:\websiteAirShield\AirShield\config.lua"
$tsxContent = Get-Content -Raw "d:\websiteAirShield\root\website\src\pages\Settings.tsx"

Write-Host "=== 3. OBJECT CONFIGS COMPARISON ==="

# Helper to extract lua key values
function Get-LuaSection ($sectionName) {
    $match = [regex]::Match($luaContent, "Config\.$sectionName\s*=\s*\{([\s\S]*?)\}\n\n")
    if (-not $match.Success) {
        $match = [regex]::Match($luaContent, "Config\.$sectionName\s*=\s*\{([\s\S]*?)\}\n\r?\n")
    }
    return $match.Groups[1].Value
}

Write-Host "--- Config.Client keys ---"
$luaClientKeys = [regex]::Matches((Get-LuaSection "Client"), "\[['""]([^'""]+)['""]\]\s*=") | ForEach-Object { $_.Groups[1].Value }
$luaClientKeys += [regex]::Matches((Get-LuaSection "Client"), "([a-zA-Z0-9_]+)\s*=") | ForEach-Object { $_.Groups[1].Value }
Write-Host "Lua Client keys: $($luaClientKeys -join ', ')"

Write-Host "`n--- Config.Weapons keys ---"
$luaWeaponKeys = [regex]::Matches($luaContent, "Config\.Weapons\s*=\s*\{([\s\S]*?)\}\n\n")
Write-Host "Lua Weapons block: $($luaWeaponKeys.Groups[1].Value)"

Write-Host "`n--- Config.AntiGiveWeapon keys ---"
$luaAGW = [regex]::Matches($luaContent, "Config\.AntiGiveWeapon\s*=\s*\{([\s\S]*?)\}\n\n")
Write-Host "Lua AntiGiveWeapon block: $($luaAGW.Groups[1].Value)"

Write-Host "`n--- Config.ObjectProtections keys ---"
$luaObjProt = [regex]::Matches($luaContent, "Config\.ObjectProtections\s*=\s*\{([\s\S]*?)\}\n\n")
Write-Host "Lua ObjectProtections block: $($luaObjProt.Groups[1].Value)"

Write-Host "`n--- Config.SpoofDetection keys ---"
$luaSpoof = [regex]::Matches($luaContent, "Config\.SpoofDetection\s*=\s*\{([\s\S]*?)\}\n\n")
Write-Host "Lua SpoofDetection block: $($luaSpoof.Groups[1].Value)"

Write-Host "`n--- Config.MaxSpawn keys ---"
$luaMaxSpawn = [regex]::Matches($luaContent, "Config\.MaxSpawn\s*=\s*\{([\s\S]*?)\}\n\n")
Write-Host "Lua MaxSpawn block: $($luaMaxSpawn.Groups[1].Value)"
