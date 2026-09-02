[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = 'Stop'

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

$video = (Resolve-Path -LiteralPath $Path).Path
$ffmpeg = Find-MediaTool -Name 'ffmpeg'
$ffprobe = Find-MediaTool -Name 'ffprobe'

$metadata = & $ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate -show_entries format=duration,size -of json $video | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $metadata.streams.Count -eq 0) {
    throw 'ffprobe could not find a decodable video stream.'
}

& $ffmpeg -v error -i $video -f null NUL
$decodeExit = $LASTEXITCODE
if ($decodeExit -ne 0) {
    throw "Full video decode failed with exit code $decodeExit."
}

[pscustomobject]@{
    path = $video
    codec = $metadata.streams[0].codec_name
    width = $metadata.streams[0].width
    height = $metadata.streams[0].height
    average_frame_rate = $metadata.streams[0].avg_frame_rate
    duration_seconds = [math]::Round([double]$metadata.format.duration, 3)
    bytes = [long]$metadata.format.size
    decode_exit = $decodeExit
    sha256 = (Get-FileHash -LiteralPath $video -Algorithm SHA256).Hash
} | ConvertTo-Json
