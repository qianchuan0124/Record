<#
 * 把 Windows 打包需要写文件的目标标回 Medium 完整性。
 *
 * 背景：DSH 的 workspace-write 会在工作区根目录写入可继承的 Low 完整性标签，
 * 整个目录树（包括 node_modules 里的构建工具 exe）都会继承。Windows 按 exe 镜像标签
 * 决定进程完整性，于是 electron-builder 的 app-builder / 7za / NSIS 临时安装器都以
 * Low 运行：写不了 %LOCALAPPDATA%，NSIS 生成卸载器时直接 exit 2，7z -mx=9 报
 * "System ERROR: 未指定的错误"。
 *
 * 本脚本只处理下面几个目标（不动源码），重复执行是幂等的：
 *   - dist_electron（不存在就先建出来）
 *   - node_modules\app-builder-bin\win\x64\app-builder.exe
 *   - node_modules\7zip-bin\win\x64\7za.exe
 *   - node_modules\electron\dist\electron.exe（开发模式 npm run electron:serve 用）
 * 重新 npm install 之后需要再跑一次。
 *
 * 运行时同理：从工作区里直接启动的 exe（win-unpacked / electron.exe）会是 Low 进程，
 * 写不了 %APPDATA%，electron-log 报 EPERM 后可能顺着 sqlite3 原生回调把进程打挂。
 * 本脚本把 electron.exe 也标回 Medium，修好开发模式这条路。
 *
 * 注意：打完补丁后要在普通终端（Medium 及以上）里执行 npm run dist:win；
 * 在 DSH 的 workspace-write 会话里打包，进程本身是 Low，反而写不进已标 Medium 的目录。
 *
 * 用法：npm run fix:win-integrity
 * 彻底恢复整棵树（可选，更激进）：
 *   icacls "<工程目录>" /setintegritylevel "(OI)(CI)Medium" /T /C
 #>
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    Write-Host '[fix-win-integrity] 仅 Windows 需要，跳过'
    exit 0
}

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root 'dist_electron'
$helpers = @(
    (Join-Path $root 'node_modules\app-builder-bin\win\x64\app-builder.exe'),
    (Join-Path $root 'node_modules\7zip-bin\win\x64\7za.exe'),
    (Join-Path $root 'node_modules\electron\dist\electron.exe')
)

$failed = $false

# dist_electron：先确保存在，再整棵树标 Medium（否则首次打包时它会继承 root 的 Low）。
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "[fix-win-integrity] 已创建 $outputDir"
}
& icacls $outputDir /setintegritylevel '"(OI)(CI)Medium"' /T /C | Select-Object -Last 1
if ($LASTEXITCODE -ne 0) { $failed = $true }

foreach ($exe in $helpers) {
    if (-not (Test-Path $exe)) {
        Write-Host "[fix-win-integrity] 缺少 $exe，请先 npm install"
        $failed = $true
        continue
    }
    & icacls $exe /setintegritylevel Medium | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { $failed = $true }
}

Write-Host '[fix-win-integrity] 当前标签：'
foreach ($target in @($outputDir) + $helpers) {
    if (-not (Test-Path $target)) { continue }
    $label = (& icacls $target | Select-String 'Mandatory Label') -join ' '
    if (-not $label) { $label = '(无 Mandatory Label)' }
    Write-Host ("  {0} -> {1}" -f $target, $label.Trim())
}

if ($failed) {
    Write-Host '[fix-win-integrity] 有目标处理失败，可能需要在管理员终端里执行'
    exit 1
}
Write-Host '[fix-win-integrity] 完成，接下来在普通终端里执行: npm run dist:win'
