[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [ValidateRange(1, 3600)]
    [int]$DurationSeconds = 15,

    [ValidateRange(1, 240)]
    [int]$Framerate = 30,

    [string]$WindowTitle,

    [ValidateRange(0, 16384)]
    [int]$CropWidth = 0,

    [ValidateRange(0, 16384)]
    [int]$CropHeight = 0,

    [ValidateRange(0, 16384)]
    [int]$CropX = 0,

    [ValidateRange(0, 16384)]
    [int]$CropY = 0
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class GodotCaptureDesktop
{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
'@

function Find-FFmpeg {
    $command = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }

    $wingetPackages = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    if (Test-Path -LiteralPath $wingetPackages) {
        $candidate = Get-ChildItem -LiteralPath $wingetPackages -Filter ffmpeg.exe -File -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        if ($candidate) { return $candidate }
    }
    throw 'FFmpeg was not found on PATH or in the WinGet package cache.'
}

if (($CropWidth -eq 0) -xor ($CropHeight -eq 0)) {
    throw 'CropWidth and CropHeight must be provided together.'
}
if (-not [Environment]::UserInteractive) {
    throw 'Desktop capture requires an interactive Windows session.'
}
if ([GodotCaptureDesktop]::GetForegroundWindow() -eq [IntPtr]::Zero) {
    throw 'No interactive foreground desktop is available. Unlock or reconnect the Windows session before capturing.'
}

$ffmpeg = Find-FFmpeg
$absoluteOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $absoluteOutput
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$inputSource = if ($WindowTitle) { "title=$WindowTitle" } else { 'desktop' }
$arguments = @(
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'gdigrab', '-framerate', $Framerate,
    '-draw_mouse', '0', '-i', $inputSource, '-t', $DurationSeconds
)
if ($CropWidth -gt 0) {
    $arguments += @('-vf', "crop=${CropWidth}:${CropHeight}:${CropX}:${CropY}")
}
$arguments += @(
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', $absoluteOutput
)

& $ffmpeg @arguments
if ($LASTEXITCODE -ne 0) {
    throw "FFmpeg capture failed with exit code $LASTEXITCODE."
}
if (-not (Test-Path -LiteralPath $absoluteOutput) -or (Get-Item -LiteralPath $absoluteOutput).Length -eq 0) {
    throw 'FFmpeg completed without producing a nonempty video.'
}

Get-Item -LiteralPath $absoluteOutput | Select-Object FullName, Length, LastWriteTime | ConvertTo-Json
