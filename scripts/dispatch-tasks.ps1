#Requires -Version 5.1
<#
.SYNOPSIS
    Ships prompts/prompt-*.md files dropped into the working tree to GitHub as
    task/* branches so the Actions worker (.github/workflows/claude.yml,
    push trigger) picks them up.
.PARAMETER Once
    Run a single sweep and exit (manual runs / tests). Default is watcher mode:
    a FileSystemWatcher on prompts/ that triggers a sweep on new/renamed files,
    with a debounce so Cowork finishes writing before dispatch.
.PARAMETER RepoRoot
    Path to the ai-agents checkout to watch. Defaults to the parent of this
    script's own location (in-repo usage, unchanged). Pass this when running
    from an installed copy outside the repo (see
    .claude/rules/github-automation.md), so the watcher keeps working even
    when the checkout is on a branch that predates scripts/dispatch-tasks.ps1.
#>
param(
    [switch]$Once,
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

# The log always lives next to THIS script (the installed copy, when run
# standalone), not inside $RepoRoot — $RepoRoot may point at a checkout on a
# branch without scripts/, so a repo-relative log path would break there.
$InstallDir = $PSScriptRoot
$PromptsDir = Join-Path $RepoRoot 'prompts'
$DispatchedDir = Join-Path $PromptsDir '_dispatched'
$LogFile = Join-Path $InstallDir 'dispatch.log'
$DebounceSeconds = 60

function Write-DispatchLog {
    param([string]$FileName, [string]$Branch, [string]$Status, [string]$Detail = '')
    $line = '{0} · {1} · {2} · {3}' -f (Get-Date -Format 's'), $FileName, $Branch, $Status
    if ($Detail) { $line += ' · ' + ($Detail -replace '\r?\n', ' ') }
    Add-Content -LiteralPath $LogFile -Value $line
}

# PowerShell 5.1 raises NativeCommandError for any stderr line from a native
# exe when $ErrorActionPreference = 'Stop', even when the stream is redirected
# to $null. Run git through this so its routine stderr chatter (progress,
# "From github.com...") doesn't get treated as a script-terminating error.
function Invoke-Git {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & git @args *>$null
    } finally {
        $ErrorActionPreference = $prevEAP
    }
    return $LASTEXITCODE
}

function Get-DispatchCandidates {
    if (-not (Test-Path $PromptsDir)) { return @() }

    $trackedSet = New-Object 'System.Collections.Generic.HashSet[string]'
    Push-Location $RepoRoot
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $tracked = & git ls-files -- 'prompts/*.md' 2>$null
        } finally {
            $ErrorActionPreference = $prevEAP
        }
    } finally {
        Pop-Location
    }
    foreach ($t in $tracked) {
        $full = Join-Path $RepoRoot ($t -replace '/', '\')
        [void]$trackedSet.Add($full.ToLowerInvariant())
    }

    $now = Get-Date
    $candidates = @()
    Get-ChildItem -LiteralPath $PromptsDir -Filter 'prompt-*.md' -File | ForEach-Object {
        if ($_.Name -eq 'README.md') { return }
        if ($trackedSet.Contains($_.FullName.ToLowerInvariant())) { return }
        $age = ($now - $_.LastWriteTime).TotalSeconds
        if ($age -lt $DebounceSeconds) { return }
        $candidates += $_
    }
    return $candidates
}

function Invoke-Dispatch {
    param([System.IO.FileInfo]$File)

    $fileName = $File.Name
    $slug = ($fileName -replace '\.md$', '') -replace '[^a-zA-Z0-9\-]', '-'
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $branch = "task/$slug-$timestamp"
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-agents-dispatch-" + [guid]::NewGuid().ToString('N'))

    try {
        Push-Location $RepoRoot
        try {
            if ((Invoke-Git fetch origin main) -ne 0) { throw "git fetch origin main failed" }
            if ((Invoke-Git worktree add $tempDir origin/main --detach) -ne 0) { throw "git worktree add failed" }
        } finally {
            Pop-Location
        }

        $destPromptsDir = Join-Path $tempDir 'prompts'
        if (-not (Test-Path $destPromptsDir)) { New-Item -ItemType Directory -Path $destPromptsDir | Out-Null }
        Copy-Item -LiteralPath $File.FullName -Destination (Join-Path $destPromptsDir $fileName) -Force

        Push-Location $tempDir
        try {
            if ((Invoke-Git add "prompts/$fileName") -ne 0) { throw "git add failed" }
            if ((Invoke-Git commit -m "chore: dispatch $fileName") -ne 0) { throw "git commit failed" }
            if ((Invoke-Git push origin "HEAD:refs/heads/$branch") -ne 0) { throw "git push failed" }
        } finally {
            Pop-Location
        }

        Push-Location $RepoRoot
        try {
            Invoke-Git worktree remove --force $tempDir | Out-Null
        } finally {
            Pop-Location
        }

        if (-not (Test-Path $DispatchedDir)) { New-Item -ItemType Directory -Path $DispatchedDir | Out-Null }
        Move-Item -LiteralPath $File.FullName -Destination (Join-Path $DispatchedDir $fileName) -Force

        Write-DispatchLog -FileName $fileName -Branch $branch -Status 'ok'
    }
    catch {
        Write-DispatchLog -FileName $fileName -Branch $branch -Status 'error' -Detail $_.Exception.Message
        Push-Location $RepoRoot
        try {
            if (Test-Path $tempDir) {
                Invoke-Git worktree remove --force $tempDir | Out-Null
            }
        } finally {
            Pop-Location
        }
    }
}

function Invoke-Sweep {
    $candidates = Get-DispatchCandidates
    foreach ($file in $candidates) {
        try {
            Invoke-Dispatch -File $file
        }
        catch {
            Write-DispatchLog -FileName $file.Name -Branch '' -Status 'error' -Detail $_.Exception.Message
        }
    }
}

if (-not (Test-Path (Split-Path $LogFile))) {
    New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null
}

if ($Once) {
    Invoke-Sweep
    return
}

# Watcher mode: run an initial sweep to catch files dropped while not running,
# then watch for new drops. Debounce is handled by the age check in
# Get-DispatchCandidates, so the watcher can re-sweep freely without dispatching early.
Invoke-Sweep

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $PromptsDir
$watcher.Filter = 'prompt-*.md'
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$action = {
    try {
        Invoke-Sweep
    }
    catch {
        Write-DispatchLog -FileName '(watcher)' -Branch '' -Status 'error' -Detail $_.Exception.Message
    }
}

Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

try {
    while ($true) {
        Start-Sleep -Seconds ($DebounceSeconds / 2)
        # Periodic re-sweep as a safety net: catches files whose debounce window
        # elapsed after the triggering watcher event already fired and returned.
        Invoke-Sweep
    }
}
finally {
    Unregister-Event -SourceIdentifier $watcher.Created 2>$null
    $watcher.Dispose()
}
