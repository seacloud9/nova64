[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$ContactSheetPath
)

$ErrorActionPreference = 'Stop'
$invariant = [System.Globalization.CultureInfo]::InvariantCulture

function Find-MediaTool {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }

    $wingetPackages = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    if (Test-Path -LiteralPath $wingetPackages) {
        $candidate = Get-ChildItem -LiteralPath $wingetPackages -Filter "$Name.exe" -File -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        if ($candidate) { return $candidate }
    }
    throw "$Name was not found on PATH or in the WinGet package cache."
}

function Format-Number {
    param([double]$Value)
    return $Value.ToString('0.###', $invariant)
}

$video = (Resolve-Path -LiteralPath $Path).Path
$ffmpeg = Find-MediaTool 'ffmpeg'
$ffprobe = Find-MediaTool 'ffprobe'

$metadata = & $ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate -show_entries format=duration,size -of json $video | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $metadata.streams.Count -eq 0) {
    throw 'ffprobe could not find a video stream.'
}
$duration = [double]$metadata.format.duration
if ($duration -le 0) { throw 'The trailer duration is not positive.' }

& $ffmpeg -hide_banner -loglevel error -i $video -f null NUL
$decodeExit = $LASTEXITCODE
if ($decodeExit -ne 0) { throw "Full trailer decode failed with exit code $decodeExit." }

if (-not $ContactSheetPath) {
    $directory = Split-Path -Parent $video
    $base = [System.IO.Path]::GetFileNameWithoutExtension($video)
    $ContactSheetPath = Join-Path $directory "${base}-contact-sheet.jpg"
}
$contactSheet = [System.IO.Path]::GetFullPath($ContactSheetPath)
$contactDirectory = Split-Path -Parent $contactSheet
if (-not (Test-Path -LiteralPath $contactDirectory)) {
    New-Item -ItemType Directory -Path $contactDirectory -Force | Out-Null
}

$times = @(0.2, 0.5, 0.8) | ForEach-Object { Format-Number ([Math]::Max(0, $duration * $_)) }
$sheetFilter = '[0:v]scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=640:360:(ow-iw)/2:(oh-ih)/2:black[a];[1:v]scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=640:360:(ow-iw)/2:(oh-ih)/2:black[b];[2:v]scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=640:360:(ow-iw)/2:(oh-ih)/2:black[c];[a][b][c]hstack=inputs=3[sheet]'
& $ffmpeg -y -hide_banner -loglevel error -ss $times[0] -i $video -ss $times[1] -i $video -ss $times[2] -i $video -filter_complex $sheetFilter -map '[sheet]' -frames:v 1 -q:v 2 $contactSheet
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $contactSheet)) {
    throw 'Contact-sheet generation failed.'
}

$audioResult = & $ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 $video
$audioCodec = if ($null -eq $audioResult) { '' } else { ([string]$audioResult).Trim() }

[pscustomobject]@{
    path = $video
    codec = $metadata.streams[0].codec_name
    width = $metadata.streams[0].width
    height = $metadata.streams[0].height
    average_frame_rate = $metadata.streams[0].avg_frame_rate
    duration_seconds = [math]::Round($duration, 3)
    bytes = [long]$metadata.format.size
    audio = $(if ($audioCodec) { $audioCodec } else { 'silent' })
    decode_exit = $decodeExit
    sha256 = (Get-FileHash -LiteralPath $video -Algorithm SHA256).Hash
    contact_sheet = $contactSheet
} | ConvertTo-Json
