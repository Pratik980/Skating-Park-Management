<#
push-to-github.ps1
Usage:
  .\push-to-github.ps1 -Message "commit message"                # stage all, commit and push
  .\push-to-github.ps1 -Message "msg" -Files "file1","file2"  # stage specific files
  .\push-to-github.ps1 -Message "msg" -Pull                     # pull --rebase before push

Notes:
- Script must be run from the repo root (it will `Set-Location` to the script folder).
- Ensure Git is installed and authentication is configured (SSH key, credential manager, etc.).
#>

param(
    [string]$Message = "",
    [string[]]$Files = @(),
    [switch]$Pull
)

Set-StrictMode -Version Latest

# Move to script directory (repo root)
Push-Location $PSScriptRoot

# Check git available
git --version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git is not installed or not in PATH."
    Pop-Location
    exit 1
}

# Determine if there are changes when staging all or specific files
if ($Files.Length -eq 0) {
    $status = git status --porcelain
} else {
    # Show which of the specified files would be changed/staged
    $statusLines = @()
    foreach ($f in $Files) {
        $lines = git status --porcelain -- "$f" 2>$null
        if ($lines) { $statusLines += $lines }
    }
    $status = $statusLines -join "`n"
}

if (-not $status) {
    Write-Host "No changes detected to commit."
    Pop-Location
    exit 0
}

# Prepare commit message
if (-not $Message) {
    $Message = "Auto commit from push-to-github.ps1 $(Get-Date -Format 'yyyy-MM-dd_HH:mm:ss')"
}

Write-Host "Staging changes..."
if ($Files.Length -eq 0) {
    git add .
} else {
    foreach ($f in $Files) { git add -- "$f" }
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to stage changes."
    Pop-Location
    exit 1
}

Write-Host "Committing with message: $Message"
git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Commit failed or nothing to commit."
    Pop-Location
    exit 1
}

# Get current branch
$branch = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0 -or -not $branch) {
    Write-Error "Could not determine current branch."
    Pop-Location
    exit 1
}

if ($Pull.IsPresent) {
    Write-Host "Pulling latest changes from origin/$branch (rebase)..."
    git pull --rebase origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git pull --rebase failed. Resolve conflicts and try again."
        Pop-Location
        exit 1
    }
}

Write-Host "Pushing to origin/$branch..."
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed. Check remote, network, and authentication."
    Pop-Location
    exit 1
}

Write-Host "Push succeeded."
Pop-Location
exit 0
