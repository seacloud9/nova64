[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ManifestPath
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

function Get-ManifestValue {
    param($Object, [string]$Name, $Default)

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value -or $property.Value -eq '') {
        return $Default
    }
    return $property.Value
}

function Format-Number {
    param([double]$Value)
    return $Value.ToString('0.###', $invariant)
}

function Resolve-ManifestPath {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ([System.IO.Path]::IsPathRooted($Value)) {
        return [System.IO.Path]::GetFullPath($Value)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $manifestDirectory $Value))
}

function Escape-FilterPath {
    param([Parameter(Mandatory = $true)][string]$Value)
    return $Value.Replace('\', '/').Replace(':', '\:').Replace("'", "\'")
}

function Escape-DrawText {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    return $Value.Replace('\', '\\').Replace(':', '\:').Replace("'", "\'").Replace('%', '\%')
}

function Normalize-Color {
    param([string]$Value)
    $color = $Value.Trim().TrimStart('#')
    if ($color -notmatch '^[0-9A-Fa-f]{6}$') {
        throw "Color '$Value' must contain exactly six hexadecimal digits."
    }
    return "0x$color"
}

$manifestFile = (Resolve-Path -LiteralPath $ManifestPath).Path
$manifestDirectory = Split-Path -Parent $manifestFile
$manifest = Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json

if ($null -eq $manifest.clips -or @($manifest.clips).Count -eq 0) {
    throw 'The manifest must contain a nonempty clips array.'
}
if ($null -eq $manifest.output -or [string]::IsNullOrWhiteSpace([string]$manifest.output)) {
    throw 'The manifest must define output.'
}

$width = [int](Get-ManifestValue $manifest 'width' 1920)
$height = [int](Get-ManifestValue $manifest 'height' 1080)
$fps = [int](Get-ManifestValue $manifest 'fps' 30)
if ($width -lt 320 -or $height -lt 240 -or $width % 2 -ne 0 -or $height % 2 -ne 0) {
    throw 'width and height must be even integers of at least 320x240.'
}
if ($fps -lt 1 -or $fps -gt 120) {
    throw 'fps must be between 1 and 120.'
}

$backgroundColor = Normalize-Color ([string](Get-ManifestValue $manifest 'background_color' '030612'))
$fontPath = Resolve-ManifestPath ([string](Get-ManifestValue $manifest 'font_path' 'C:\Windows\Fonts\arialbd.ttf'))
if (-not (Test-Path -LiteralPath $fontPath)) {
    throw "Font file not found: $fontPath"
}
$escapedFont = Escape-FilterPath $fontPath
$transition = [double](Get-ManifestValue $manifest 'transition_seconds' 0.35)
if ($transition -lt 0 -or $transition -gt 2) {
    throw 'transition_seconds must be between 0 and 2.'
}

$title = [string](Get-ManifestValue $manifest 'title' '')
$subtitle = [string](Get-ManifestValue $manifest 'subtitle' '')
$outroTitle = [string](Get-ManifestValue $manifest 'outro_title' '')
$outroSubtitle = [string](Get-ManifestValue $manifest 'outro_subtitle' '')
$introSeconds = [double](Get-ManifestValue $manifest 'intro_seconds' $(if ($title) { 1.5 } else { 0 }))
$outroSeconds = [double](Get-ManifestValue $manifest 'outro_seconds' $(if ($outroTitle) { 1.5 } else { 0 }))
if ($introSeconds -lt 0 -or $outroSeconds -lt 0) {
    throw 'intro_seconds and outro_seconds cannot be negative.'
}

$ffmpeg = Find-MediaTool 'ffmpeg'
$ffprobe = Find-MediaTool 'ffprobe'
$outputPath = Resolve-ManifestPath ([string]$manifest.output)
$outputDirectory = Split-Path -Parent $outputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$inputArguments = @()
$clipData = @()
$totalDuration = $introSeconds + $outroSeconds
$clipIndex = 0
foreach ($clip in @($manifest.clips)) {
    $clipPath = Resolve-ManifestPath ([string]$clip.path)
    if (-not (Test-Path -LiteralPath $clipPath)) {
        throw "Clip not found: $clipPath"
    }
    if ([string]::Equals($clipPath, $outputPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The output path cannot overwrite an input clip.'
    }

    $start = [double](Get-ManifestValue $clip 'start' 0)
    $duration = [double](Get-ManifestValue $clip 'duration' 0)
    if ($start -lt 0 -or $duration -lt 0.2) {
        throw "Clip $clipIndex must have start >= 0 and duration >= 0.2 seconds."
    }

    $sourceDurationText = & $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $clipPath
    if ($LASTEXITCODE -ne 0) { throw "Could not probe clip: $clipPath" }
    $sourceDuration = [double]::Parse(([string]$sourceDurationText).Trim(), $invariant)
    if ($start + $duration -gt $sourceDuration + 0.05) {
        throw "Clip $clipIndex ends after its source duration ($sourceDuration seconds)."
    }

    $inputArguments += @('-i', $clipPath)
    $clipData += [pscustomobject]@{
        Index = $clipIndex
        Path = $clipPath
        Start = $start
        Duration = $duration
        Label = [string](Get-ManifestValue $clip 'label' '')
    }
    $totalDuration += $duration
    $clipIndex++
}

$musicPath = [string](Get-ManifestValue $manifest 'music_path' '')
$musicIndex = -1
if ($musicPath) {
    $musicPath = Resolve-ManifestPath $musicPath
    if (-not (Test-Path -LiteralPath $musicPath)) { throw "Music file not found: $musicPath" }
    $musicIndex = $clipData.Count
    $inputArguments += @('-stream_loop', '-1', '-i', $musicPath)
}

$filters = [System.Collections.Generic.List[string]]::new()
$concatLabels = [System.Collections.Generic.List[string]]::new()

if ($introSeconds -gt 0) {
    $d = Format-Number $introSeconds
    $fade = [Math]::Min(0.35, $introSeconds / 3)
    $fadeText = Format-Number $fade
    $fadeOut = Format-Number ($introSeconds - $fade)
    $chain = "color=c=${backgroundColor}:s=${width}x${height}:r=${fps}:d=${d},format=yuv420p"
    if ($title) {
        $chain += ",drawtext=fontfile='${escapedFont}':text='$(Escape-DrawText $title)':fontcolor=0x66E7FF:fontsize=112:x=(w-text_w)/2:y=h*0.38"
    }
    if ($subtitle) {
        $chain += ",drawtext=fontfile='${escapedFont}':text='$(Escape-DrawText $subtitle)':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=h*0.54"
    }
    if ($fade -gt 0) {
        $chain += ",fade=t=in:st=0:d=${fadeText},fade=t=out:st=${fadeOut}:d=${fadeText}"
    }
    $filters.Add("${chain}[intro]")
    $concatLabels.Add('[intro]')
}

foreach ($clip in $clipData) {
    $i = $clip.Index
    $start = Format-Number $clip.Start
    $duration = Format-Number $clip.Duration
    $fade = [Math]::Min($transition, $clip.Duration / 3)
    $fadeText = Format-Number $fade
    $fadeOut = Format-Number ($clip.Duration - $fade)
    $labelEnd = Format-Number ([Math]::Min(2.8, $clip.Duration - 0.1))

    $filters.Add("[${i}:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,split=2[c${i}bg][c${i}fg]")
    $filters.Add("[c${i}bg]scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=2,crop=${width}:${height},boxblur=25:5[c${i}b]")
    $filters.Add("[c${i}fg]scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2[c${i}f]")
    $chain = "[c${i}b][c${i}f]overlay=(W-w)/2:(H-h)/2,format=yuv420p"
    if ($clip.Label) {
        $chain += ",drawtext=fontfile='${escapedFont}':text='$(Escape-DrawText $clip.Label)':fontcolor=white:fontsize=54:x=64:y=h-th-60:box=1:boxcolor=black@0.55:boxborderw=22:enable='between(t,0.35,${labelEnd})'"
    }
    if ($fade -gt 0) {
        $chain += ",fade=t=in:st=0:d=${fadeText},fade=t=out:st=${fadeOut}:d=${fadeText}"
    }
    $chain += ",fps=${fps}[segment${i}]"
    $filters.Add($chain)
    $concatLabels.Add("[segment${i}]")
}

if ($outroSeconds -gt 0) {
    $d = Format-Number $outroSeconds
    $fade = [Math]::Min(0.35, $outroSeconds / 3)
    $fadeText = Format-Number $fade
    $fadeOut = Format-Number ($outroSeconds - $fade)
    $chain = "color=c=${backgroundColor}:s=${width}x${height}:r=${fps}:d=${d},format=yuv420p"
    if ($outroTitle) {
        $chain += ",drawtext=fontfile='${escapedFont}':text='$(Escape-DrawText $outroTitle)':fontcolor=0x66E7FF:fontsize=104:x=(w-text_w)/2:y=h*0.38"
    }
    if ($outroSubtitle) {
        $chain += ",drawtext=fontfile='${escapedFont}':text='$(Escape-DrawText $outroSubtitle)':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=h*0.54"
    }
    if ($fade -gt 0) {
        $chain += ",fade=t=in:st=0:d=${fadeText},fade=t=out:st=${fadeOut}:d=${fadeText}"
    }
    $filters.Add("${chain}[outro]")
    $concatLabels.Add('[outro]')
}

$filters.Add("$($concatLabels -join '')concat=n=$($concatLabels.Count):v=1:a=0,fps=${fps},format=yuv420p[vout]")

$hasMusic = $musicIndex -ge 0
if ($hasMusic) {
    $musicVolume = [double](Get-ManifestValue $manifest 'music_volume' 0.25)
    if ($musicVolume -lt 0 -or $musicVolume -gt 2) { throw 'music_volume must be between 0 and 2.' }
    $musicFade = [Math]::Min(0.8, $totalDuration / 4)
    $filters.Add("[${musicIndex}:a]atrim=duration=$(Format-Number $totalDuration),asetpts=PTS-STARTPTS,volume=$(Format-Number $musicVolume),afade=t=in:st=0:d=$(Format-Number $musicFade),afade=t=out:st=$(Format-Number ($totalDuration-$musicFade)):d=$(Format-Number $musicFade)[aout]")
}

$filterGraph = $filters -join ';'
$arguments = @('-y', '-hide_banner', '-loglevel', 'error') + $inputArguments + @(
    '-filter_complex', $filterGraph,
    '-map', '[vout]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart'
)
if ($hasMusic) {
    $arguments += @('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-shortest')
} else {
    $arguments += '-an'
}
$arguments += $outputPath

& $ffmpeg @arguments
if ($LASTEXITCODE -ne 0) { throw "FFmpeg trailer export failed with exit code $LASTEXITCODE." }

$result = Get-Item -LiteralPath $outputPath
[pscustomobject]@{
    output = $result.FullName
    bytes = $result.Length
    duration_seconds = [math]::Round($totalDuration, 3)
    resolution = "${width}x${height}"
    fps = $fps
    clips = $clipData.Count
    audio = $(if ($hasMusic) { 'aac music' } else { 'silent' })
    manifest = $manifestFile
} | ConvertTo-Json
