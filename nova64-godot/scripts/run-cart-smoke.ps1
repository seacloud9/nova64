# run-cart-smoke.ps1 — PowerShell port of run-cart-smoke.sh.
#
# Boots every ported real Nova64 cart through the headless conformance runner
# and reports which ones run cleanly. Apply the same gate as the bash version:
#   1. cart must print init=true update=true draw=true
#   2. cart must NOT print any `[nova64] cart (init|update|draw):` runtime
#      error lines during the run.
#
# Usage:
#   pwsh nova64-godot/scripts/run-cart-smoke.ps1                    # all carts
#   pwsh nova64-godot/scripts/run-cart-smoke.ps1 hello-world demoscene
#
# Honours $env:GODOT and $env:SMOKE_FRAMES.

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Names
)

$ErrorActionPreference = 'Continue'

$godot = if ($env:GODOT) { $env:GODOT } else { 'C:\Program Files\Godot_v4.4.1-stable_win64.exe\Godot_v4.4.1-stable_win64_console.exe' }
if (-not (Test-Path $godot)) {
    Write-Error "Godot binary not found at: $godot"
    exit 2
}

$frames = if ($env:SMOKE_FRAMES) { [int]$env:SMOKE_FRAMES } else { 20 }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Resolve-Path (Join-Path $scriptDir '..\godot_project')
$cartsRoot = Join-Path $projectDir 'carts'

# Discover carts: prefer args; otherwise enumerate carts/ excluding 0?-* / 10-*
if ($Names -and $Names.Count -gt 0) {
    $cartNames = $Names
} else {
    $cartNames = Get-ChildItem -Path $cartsRoot -Directory |
        Where-Object { $_.Name -notmatch '^(0[0-9]-|10-)' } |
        Where-Object { Test-Path (Join-Path $_.FullName 'code.js') } |
        Sort-Object Name |
        ForEach-Object { $_.Name }
}

# Sync first (best effort).
$syncSh = Join-Path $scriptDir 'sync-carts.sh'
if (Test-Path $syncSh) {
    & wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && bash nova64-godot/scripts/sync-carts.sh > /dev/null 2>&1" | Out-Null
}

$pass = 0
$fail = 0
$failNames = @()

foreach ($name in $cartNames) {
    $cart = "res://carts/$name"
    $args = @(
        '--headless',
        '--path', "$projectDir",
        '--script', 'res://scripts/conformance_runner.gd',
        '--',
        "--cart=$cart",
        "--frames=$frames"
    )

    # Native bridge has occasional non-deterministic shutdown crashes that
    # don't correspond to cart bugs. Retry crash-only failures a few times
    # before reporting them.
    $reason = ''
    $crashRetries = 6
    for ($attempt = 0; $attempt -le $crashRetries; $attempt++) {
        $out = & $godot @args 2>&1 | Out-String

        $reason = ''
        if ($out -notmatch 'init=true update=true draw=true') {
            $reason = 'hooks missing'
        } elseif ($out -match '\[nova64\] cart (init|update|draw):\s*(.+)') {
            $reason = $matches[0].Trim()
        } elseif ($out -match 'CrashHandlerException') {
            $reason = 'native crash'
        }

        # Only retry pure native crashes — real cart errors fail immediately.
        if ($reason -ne 'native crash') { break }
    }

    if (-not $reason) {
        Write-Host "PASS  $name"
        $pass++
    } else {
        Write-Host "FAIL  $name  ($reason)"
        $fail++
        $failNames += $name
    }
}

Write-Host ''
Write-Host "Cart smoke: $pass pass / $fail fail ($($cartNames.Count) total, $frames frames each)"
if ($fail -gt 0) {
    Write-Host "Failures: $($failNames -join ' ')"
    exit 1
}
