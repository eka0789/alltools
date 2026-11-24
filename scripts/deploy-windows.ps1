[CmdletBinding()]
param(
    [string]$AppDir = "",
    [string]$Branch = "master",
    [string]$AppName = "aktifkoding",
    [int]$Port = 0,
    [string]$NodeDir = "",
    [switch]$ForceInstall,
    [switch]$SkipPull
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [string[]]$ArgsList = @(),
        [switch]$AllowFailure,
        [switch]$CaptureOutput
    )

    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($CaptureOutput) {
            $output = & $Exe @ArgsList
            $code = $LASTEXITCODE
        } else {
            & $Exe @ArgsList
            $code = $LASTEXITCODE
        }
    } finally {
        $ErrorActionPreference = $prevPref
    }

    if (-not $AllowFailure -and $code -ne 0) {
        throw "Command failed (exit code $code): $Exe $($ArgsList -join ' ')"
    }

    if ($CaptureOutput) {
        return @{
            ExitCode = $code
            Output   = $output
        }
    }
    return $code
}

function Add-PathCandidates {
    param([string[]]$Candidates)

    $existing = @()
    if (-not [string]::IsNullOrWhiteSpace($env:Path)) {
        $existing = @($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    $existingLower = @{}
    foreach ($p in $existing) {
        $existingLower[$p.TrimEnd('\').ToLowerInvariant()] = $true
    }

    $toPrepend = @()
    foreach ($candidate in $Candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $normalized = $candidate.Trim().TrimEnd('\')
        if ([string]::IsNullOrWhiteSpace($normalized)) { continue }
        if (-not (Test-Path $normalized)) { continue }
        $key = $normalized.ToLowerInvariant()
        if (-not $existingLower.ContainsKey($key)) {
            $toPrepend += $normalized
            $existingLower[$key] = $true
        }
    }

    if ($toPrepend.Count -gt 0) {
        $env:Path = (($toPrepend + $existing) -join ';')
    }
}

if ([string]::IsNullOrWhiteSpace($AppDir)) {
    $AppDir = Split-Path -Parent $PSScriptRoot
}
$AppDir = [System.IO.Path]::GetFullPath($AppDir)

$pathCandidates = @(
    $NodeDir,
    $env:NODE_DIR,
    $(if ($env:APPDATA) { Join-Path $env:APPDATA "npm" } else { "" }),
    "C:\Program Files\nodejs",
    $env:NVM_SYMLINK,
    $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Volta\bin" } else { "" }),
    $(if ($env:ProgramFiles) { Join-Path $env:ProgramFiles "Git\cmd" } else { "" })
)
Add-PathCandidates -Candidates $pathCandidates

foreach ($cmdName in @("git", "node", "npm", "npx", "pm2")) {
    if (-not (Get-Command $cmdName -ErrorAction SilentlyContinue)) {
        if ($cmdName -eq "pm2") {
            throw "Required command 'pm2' not found in PATH. Run 'npm install -g pm2' or configure -NodeDir / NODE_DIR."
        }
        throw "Required command '$cmdName' not found in PATH. Ensure it is installed or configure -NodeDir / NODE_DIR."
    }
}

if (-not (Test-Path (Join-Path $AppDir "package.json"))) {
    throw "Invalid AppDir '${AppDir}': package.json not found."
}
if (-not (Test-Path (Join-Path $AppDir ".git"))) {
    throw "Invalid AppDir '${AppDir}': .git directory not found."
}

$exitCode = 0
Push-Location $AppDir
try {
    foreach ($envFile in @(".env", ".env.local")) {
        if (Test-Path $envFile) {
            Write-Host "[deploy] Loading environment from $envFile"
            $lines = Get-Content -Path $envFile -Encoding UTF8
            foreach ($rawLine in $lines) {
                if ($null -eq $rawLine) { continue }
                $trimmed = $rawLine.Trim()
                if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
                    continue
                }
                if ($rawLine -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                    $key = $Matches[1]
                    $val = $Matches[2].Trim()
                    if ($val.Length -ge 2) {
                        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                            $val = $val.Substring(1, $val.Length - 2)
                        }
                    }
                    [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
                }
            }
        }
    }

    $effectivePort = 3000
    if ($Port -gt 0) {
        $effectivePort = $Port
    } elseif ($env:PORT -match '^\d+$') {
        $effectivePort = [int]$env:PORT
    }

    if (-not $SkipPull) {
        $statusRes = Invoke-Native -Exe "git" -ArgsList @("status", "--porcelain", "--untracked-files=no") -CaptureOutput
        $dirtyFiles = @($statusRes.Output | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($dirtyFiles.Count -gt 0) {
            Write-Host "[deploy] Dirty tracked files detected in ${AppDir}:"
            foreach ($line in $dirtyFiles) {
                Write-Host "  $line"
            }
            throw "Working tree has uncommitted changes to tracked files. Commit, stash, or deploy to a separate clean folder."
        }

        $branchRes = Invoke-Native -Exe "git" -ArgsList @("rev-parse", "--abbrev-ref", "HEAD") -CaptureOutput
        $currentBranch = ($branchRes.Output | Out-String).Trim()
        if ($currentBranch -ne $Branch) {
            Write-Host "[deploy] Checking out branch '$Branch' (was '$currentBranch')..."
            [void](Invoke-Native -Exe "git" -ArgsList @("checkout", $Branch))
        }

        Write-Host "[deploy] Pulling latest changes from origin/$Branch..."
        [void](Invoke-Native -Exe "git" -ArgsList @("fetch", "origin", $Branch))
        [void](Invoke-Native -Exe "git" -ArgsList @("pull", "--ff-only", "origin", $Branch))
    } else {
        Write-Host "[deploy] SkipPull enabled: keeping current working tree."
    }

    $logRes = Invoke-Native -Exe "git" -ArgsList @("log", "-1", "--oneline") -CaptureOutput
    $deployedCommit = ($logRes.Output | Out-String).Trim()
    Write-Host "[deploy] Deploying commit: $deployedCommit"

    $currHash = (Get-FileHash -Algorithm SHA256 -Path "package-lock.json").Hash
    $prevHash = ""
    if (Test-Path ".deploy-lock.sha256") {
        $rawPrev = Get-Content -Path ".deploy-lock.sha256" -Raw -ErrorAction SilentlyContinue
        if ($null -ne $rawPrev) {
            $prevHash = $rawPrev.Trim()
        }
    }
    $needInstall = $ForceInstall.IsPresent -or (-not (Test-Path "node_modules")) -or ($prevHash -ne $currHash)

    $pm2Desc = Invoke-Native -Exe "pm2" -ArgsList @("describe", $AppName) -AllowFailure -CaptureOutput
    if ($pm2Desc.ExitCode -eq 0) {
        Write-Host "[deploy] Stopping existing PM2 app '$AppName'..."
        [void](Invoke-Native -Exe "pm2" -ArgsList @("stop", $AppName))
        Start-Sleep -Seconds 2
    }

    $hasBackup = $false
    if (Test-Path ".next") {
        if (Test-Path ".next.bak") {
            Remove-Item -Path ".next.bak" -Recurse -Force
        }
        Write-Host "[deploy] Backing up current .next build to .next.bak..."
        Rename-Item -Path ".next" -NewName ".next.bak"
        $hasBackup = $true
    }

    try {
        if ($needInstall) {
            Write-Host "[deploy] Installing dependencies with npm ci..."
            $ciCode = Invoke-Native -Exe "npm" -ArgsList @("ci") -AllowFailure
            if ($ciCode -ne 0) {
                Write-Host "[deploy] npm ci failed (exit $ciCode); waiting 3s and retrying once..."
                Start-Sleep -Seconds 3
                [void](Invoke-Native -Exe "npm" -ArgsList @("ci"))
            }
            Set-Content -Path ".deploy-lock.sha256" -Value $currHash -Encoding Ascii
        } else {
            Write-Host "[deploy] package-lock.json unchanged; skipping npm ci."
        }

        $catalogPath = Join-Path "src" (Join-Path "data" "catalog.generated.json")
        $isRemoteDb = (-not [string]::IsNullOrWhiteSpace($env:ALLTOOLS_DB_URL)) -and ($env:ALLTOOLS_DB_URL -notmatch '^file:')
        $hasLocalDb = Test-Path (Join-Path "data" "alltools.db")

        if ($isRemoteDb) {
            Write-Host "[deploy] Refreshing catalog snapshot from remote database..."
            $exportCode = Invoke-Native -Exe "node" -ArgsList @("scripts/export-catalog.mjs") -AllowFailure
            if ($exportCode -ne 0) {
                if ($hasLocalDb) {
                    Write-Host "[deploy] Remote catalog export failed; trying local SQLite database..."
                    $savedUrl = $env:ALLTOOLS_DB_URL
                    $env:ALLTOOLS_DB_URL = ""
                    try {
                        [void](Invoke-Native -Exe "node" -ArgsList @("scripts/export-catalog.mjs") -AllowFailure)
                    } finally {
                        $env:ALLTOOLS_DB_URL = $savedUrl
                    }
                }
                if (-not (Test-Path $catalogPath)) {
                    Write-Host "[deploy] Generating fallback catalog snapshot with ensure-catalog.mjs..."
                    [void](Invoke-Native -Exe "node" -ArgsList @("scripts/ensure-catalog.mjs"))
                }
            }
        } elseif ($hasLocalDb) {
            Write-Host "[deploy] Refreshing catalog snapshot from local SQLite database..."
            [void](Invoke-Native -Exe "node" -ArgsList @("scripts/export-catalog.mjs"))
        } else {
            Write-Host "[deploy] Local database not found; running ensure-catalog.mjs..."
            [void](Invoke-Native -Exe "node" -ArgsList @("scripts/ensure-catalog.mjs"))
        }

        if (-not (Test-Path $catalogPath)) {
            throw "Catalog snapshot missing at $catalogPath."
        }

        $env:NEXT_TELEMETRY_DISABLED = "1"
        Write-Host "[deploy] Running Next.js production build..."
        [void](Invoke-Native -Exe "npx" -ArgsList @("next", "build"))

        $env:PM2_APP_NAME = $AppName
        $env:PORT = "$effectivePort"
        Write-Host "[deploy] Starting PM2 process '$AppName' on port $effectivePort..."
        [void](Invoke-Native -Exe "pm2" -ArgsList @("delete", $AppName) -AllowFailure)
        [void](Invoke-Native -Exe "pm2" -ArgsList @("start", "ecosystem.config.cjs", "--update-env"))
        [void](Invoke-Native -Exe "pm2" -ArgsList @("save") -AllowFailure)

        $healthUrl = "http://127.0.0.1:$effectivePort/"
        $healthy = $false
        Write-Host "[deploy] Checking server health at $healthUrl ..."
        for ($attempt = 1; $attempt -le 20; $attempt++) {
            try {
                $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    $healthy = $true
                    Write-Host "[deploy] Health check passed (HTTP 200 on attempt $attempt)."
                    break
                }
            } catch {
                # Server may still be starting up
            }
            Start-Sleep -Seconds 2
        }

        if (-not $healthy) {
            Write-Host "[deploy] Recent PM2 logs for '${AppName}':"
            [void](Invoke-Native -Exe "pm2" -ArgsList @("logs", $AppName, "--nostream", "--lines", "30") -AllowFailure)
            throw "Health check failed on $healthUrl"
        }

        if ($hasBackup -and (Test-Path ".next.bak")) {
            Remove-Item -Path ".next.bak" -Recurse -Force
        }

        Write-Host "[deploy] Deployment succeeded! Commit [$deployedCommit] is running on '$AppName' ($healthUrl)."
    } catch {
        Write-Host "[deploy] ERROR: $($_.Exception.Message)"
        if ($hasBackup -and (Test-Path ".next.bak")) {
            Write-Host "[deploy] Rolling back to previous .next build..."
            try {
                [void](Invoke-Native -Exe "pm2" -ArgsList @("stop", $AppName) -AllowFailure)
                Start-Sleep -Seconds 2
                if (Test-Path ".next") {
                    Remove-Item -Path ".next" -Recurse -Force
                }
                Rename-Item -Path ".next.bak" -NewName ".next"
                $env:PM2_APP_NAME = $AppName
                $env:PORT = "$effectivePort"
                [void](Invoke-Native -Exe "pm2" -ArgsList @("delete", $AppName) -AllowFailure)
                [void](Invoke-Native -Exe "pm2" -ArgsList @("start", "ecosystem.config.cjs", "--update-env") -AllowFailure)
                Write-Host "[deploy] Rollback complete: restored previous build and restarted '$AppName'."
            } catch {
                Write-Host "[deploy] Rollback failed: $($_.Exception.Message)"
            }
        }
        $exitCode = 1
    }
} finally {
    Pop-Location
}

if ($exitCode -ne 0) {
    exit $exitCode
}
