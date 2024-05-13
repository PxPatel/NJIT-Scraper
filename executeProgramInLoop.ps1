$seasons = @("Spring", "Winter")
$years = @("2024","2023-2024")

for ($i = 0; $i -lt $seasons.Length; $i++) {
    $env:YEAR = $years[$i]
    $env:SEASON = $seasons[$i]    
    
    Write-Output "YEAR = $($env:YEAR)"
    Write-Output "SEASON = $($env:SEASON)"

    npm run start
}

$env:YEAR = ""
$env:SEASON = ""    
