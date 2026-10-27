# Define the list of files to create
$files = @(
    "src/components/ui/button.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/card.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/skeleton.tsx",
    "src/components/ui/empty-state.tsx",
    "src/components/ui/index.tsx"
)

foreach ($file in $files) {
    # Extract the parent directory path
    $dir = Split-Path -Parent $file

    # Create the directory if it does not exist
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created Directory: $dir" -ForegroundColor Cyan
    }

    # Create the file if it does not exist, otherwise skip
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file -Force | Out-Null
        Write-Host "Created File:      $file" -ForegroundColor Green
    } else {
        Write-Host "Skipped (Exists):  $file" -ForegroundColor Yellow
    }
}

Write-Host "`nStructure setup completed successfully!" -ForegroundColor Magenta