# Face iconitele aplicatiei: fulgerul galben pe albastrul pixului (culorile jocului).
Add-Type -AssemblyName System.Drawing
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$albastru = [System.Drawing.Color]::FromArgb(0x28, 0x51, 0xD8)
$galben = [System.Drawing.Color]::FromArgb(0xFF, 0xC4, 0x3A)
# Fulgerul din joc, in coordonatele 0..24 x 0..28.
$puncte = @(@(13.4, 1.5), @(3.4, 15), @(10.3, 15), @(8.2, 26.5), @(20.6, 11.8), @(13.5, 11.8))
foreach ($m in @(@{n = 'icon-192.png'; s = 192}, @{n = 'icon-512.png'; s = 512}, @{n = 'apple-touch-icon.png'; s = 180})) {
    $s = $m.s
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear($albastru)   # patrat plin: telefonul rotunjeste singur colturile
    $scara = $s * 0.62 / 28
    $dx = ($s - 24 * $scara) / 2
    $dy = ($s - 28 * $scara) / 2
    $pts = $puncte | ForEach-Object { New-Object System.Drawing.PointF(($dx + $_[0] * $scara), ($dy + $_[1] * $scara)) }
    $g.FillPolygon((New-Object System.Drawing.SolidBrush($galben)), [System.Drawing.PointF[]]$pts)
    $bmp.Save((Join-Path $dir $m.n), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}
"Iconite gata."
