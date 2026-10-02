[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProcessName,

    [Parameter(Mandatory = $true)]
    [string]$ScenarioPath,

    [ValidateRange(1, 30)]
    [int]$FocusTimeoutSeconds = 5
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class GodotPlaybackInput
{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, UIntPtr extraInfo);
}
'@

function Resolve-KeyCode {
    param([Parameter(Mandatory = $true)][string]$Name)

    $normalized = $Name.Trim().ToUpperInvariant()
    $named = @{
        'SPACE' = 0x20; 'ENTER' = 0x0D; 'RETURN' = 0x0D; 'ESC' = 0x1B; 'ESCAPE' = 0x1B
        'TAB' = 0x09; 'SHIFT' = 0x10; 'CTRL' = 0x11; 'CONTROL' = 0x11; 'ALT' = 0x12
        'LEFT' = 0x25; 'ARROWLEFT' = 0x25; 'UP' = 0x26; 'ARROWUP' = 0x26
        'RIGHT' = 0x27; 'ARROWRIGHT' = 0x27; 'DOWN' = 0x28; 'ARROWDOWN' = 0x28
        'PAGEUP' = 0x21; 'PAGEDOWN' = 0x22; 'HOME' = 0x24; 'END' = 0x23
        'BACKSPACE' = 0x08; 'DELETE' = 0x2E; 'INSERT' = 0x2D
    }

    if ($named.ContainsKey($normalized)) {
        return [byte]$named[$normalized]
    }
    if ($normalized -match '^F([1-9]|1[0-2])$') {
        return [byte](0x70 + [int]$Matches[1] - 1)
    }
    if ($normalized -match '^DIGIT([0-9])$') {
        return [byte][char]$Matches[1]
    }
    if ($normalized.Length -eq 1 -and $normalized -match '^[A-Z0-9]$') {
        return [byte][char]$normalized
    }

    throw "Unsupported key '$Name'. Use A-Z, 0-9/Digit0-Digit9, F1-F12, arrows, or a named control key."
}

function Set-KeyDown {
    param([byte]$Code)
    [GodotPlaybackInput]::keybd_event($Code, 0, 0, [UIntPtr]::Zero)
}

function Set-KeyUp {
    param([byte]$Code)
    [GodotPlaybackInput]::keybd_event($Code, 0, 2, [UIntPtr]::Zero)
}

function Get-ActionKeys {
    param($Action)

    $names = @()
    if ($null -ne $Action.keys) {
        $names += @($Action.keys)
    } elseif ($null -ne $Action.key) {
        $names += $Action.key
    } else {
        throw "Action '$($Action.action)' requires 'key' or 'keys'."
    }
    return @($names | ForEach-Object { Resolve-KeyCode -Name ([string]$_) })
}

function Assert-Foreground {
    param([IntPtr]$Handle)

    [GodotPlaybackInput]::ShowWindow($Handle, 5) | Out-Null
    [GodotPlaybackInput]::SetForegroundWindow($Handle) | Out-Null
    $deadline = [DateTime]::UtcNow.AddSeconds($FocusTimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ([GodotPlaybackInput]::GetForegroundWindow() -eq $Handle) {
            return
        }
        Start-Sleep -Milliseconds 100
    }
    throw 'The target window could not be verified as foreground. Activate it manually and retry; no gameplay keys were sent.'
}

$scenarioFile = (Resolve-Path -LiteralPath $ScenarioPath).Path
$parsed = Get-Content -LiteralPath $scenarioFile -Raw | ConvertFrom-Json
$actions = if ($parsed -is [System.Array]) {
    @($parsed)
} elseif ($parsed.PSObject.Properties.Name -contains 'actions') {
    @($parsed.actions)
} else {
    @($parsed)
}
if ($actions.Count -eq 0) {
    throw 'The scenario contains no actions.'
}

$target = $null
$deadline = [DateTime]::UtcNow.AddSeconds($FocusTimeoutSeconds)
while ([DateTime]::UtcNow -lt $deadline -and $null -eq $target) {
    $target = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } |
        Select-Object -First 1
    if ($null -eq $target) {
        Start-Sleep -Milliseconds 200
    }
}
if ($null -eq $target) {
    throw "No visible window was found for process '$ProcessName'."
}

$pressed = [System.Collections.Generic.HashSet[byte]]::new()
try {
    foreach ($modifier in 0x5B, 0x5C, 0x12, 0x11, 0x10) {
        Set-KeyUp -Code ([byte]$modifier)
    }
    Assert-Foreground -Handle $target.MainWindowHandle

    foreach ($item in $actions) {
        $kind = ([string]$item.action).Trim().ToLowerInvariant()
        if ($kind -eq 'wait') {
            $duration = [int]$item.duration_ms
            if ($duration -lt 0) { throw 'wait duration_ms cannot be negative.' }
            Start-Sleep -Milliseconds $duration
        } elseif ($kind -eq 'tap' -or $kind -eq 'hold') {
            Assert-Foreground -Handle $target.MainWindowHandle
            $codes = @(Get-ActionKeys -Action $item)
            foreach ($code in $codes) {
                Set-KeyDown -Code $code
                $pressed.Add($code) | Out-Null
            }
            $duration = if ($null -ne $item.duration_ms) { [int]$item.duration_ms } elseif ($kind -eq 'tap') { 80 } else { 500 }
            if ($duration -lt 1) { throw "$kind duration_ms must be positive." }
            Start-Sleep -Milliseconds $duration
            $releaseCodes = [byte[]]$codes
            [array]::Reverse($releaseCodes)
            foreach ($code in $releaseCodes) {
                Set-KeyUp -Code $code
                $pressed.Remove($code) | Out-Null
            }
        } else {
            throw "Unsupported action '$kind'. Use wait, tap, or hold."
        }

        if ($null -ne $item.after_ms) {
            $after = [int]$item.after_ms
            if ($after -lt 0) { throw 'after_ms cannot be negative.' }
            Start-Sleep -Milliseconds $after
        }
    }
} finally {
    foreach ($code in @($pressed)) {
        Set-KeyUp -Code $code
    }
    foreach ($modifier in 0x5B, 0x5C, 0x12, 0x11, 0x10) {
        Set-KeyUp -Code ([byte]$modifier)
    }
}

[pscustomobject]@{
    process = $target.ProcessName
    process_id = $target.Id
    actions_completed = $actions.Count
    scenario = $scenarioFile
} | ConvertTo-Json
