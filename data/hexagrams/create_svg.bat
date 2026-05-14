@echo off
chcp 65001 >nul
echo Generating 64 hexagram SVG backgrounds...

if not exist "svg_output" mkdir "svg_output"

for /l %%i in (1,1,64) do (
    echo Generating Q%%i.svg...
    
    setlocal enabledelayedexpansion
    set /a "color_index=%%i %% 6"
    
    rem 定义不同的颜色主题
    if !color_index!==0 (
        set "primary=#4A6572"
        set "secondary=#344955" 
        set "accent=#F9AA33"
    )
    if !color_index!==1 (
        set "primary=#5D4037"
        set "secondary=#4E342E"
        set "accent=#FF8A65"
    )
    if !color_index!==2 (
        set "primary=#33691E"
        set "secondary=#1B5E20"
        set "accent=#AED581"
    )
    if !color_index!==3 (
        set "primary=#01579B"
        set "secondary=#0277BD"
        set "accent=#4FC3F7"
    )
    if !color_index!==4 (
        set "primary=#4A148C"
        set "secondary=#6A1B9A"
        set "accent=#BA68C8"
    )
    if !color_index!==5 (
        set "primary=#B71C1C"
        set "secondary=#C62828"
        set "accent=#EF5350"
    )
    
    echo ^<?xml version="1.0" encoding="UTF-8"?^> > "svg_output\Q%%i.svg"
    echo ^<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"^> >> "svg_output\Q%%i.svg"
    echo   ^<rect width="800" height="600" fill="!primary!" opacity="0.8"/^> >> "svg_output\Q%%i.svg"
    echo   ^<defs^> >> "svg_output\Q%%i.svg"
    echo     ^<filter id="blur%%i"^> >> "svg_output\Q%%i.svg"
    echo       ^<feGaussianBlur stdDeviation="2"/^> >> "svg_output\Q%%i.svg"
    echo     ^</filter^> >> "svg_output\Q%%i.svg"
    echo   ^</defs^> >> "svg_output\Q%%i.svg"
    
    rem 生成一些随机圆形
    for /l %%j in (1,1,8) do (
        set /a "cx=!random! %% 600 + 100"
        set /a "cy=!random! %% 400 + 100" 
        set /a "r=!random! %% 50 + 30"
        set /a "op=!random! %% 10 + 5"
        echo   ^<circle cx="!cx!" cy="!cy!" r="!r!" fill="!secondary!" opacity="0.!op!" filter="url(#blur%%i)"/^> >> "svg_output\Q%%i.svg"
    )
    
    rem 生成一些线条
    for /l %%j in (1,1,5) do (
        set /a "x1=!random! %% 700 + 50"
        set /a "y1=!random! %% 500 + 50"
        set /a "x2=!random! %% 700 + 50"
        set /a "y2=!random! %% 500 + 50"
        set /a "op=!random! %% 10 + 5"
        echo   ^<line x1="!x1!" y1="!y1!" x2="!x2!" y2="!y2!" stroke="!accent!" stroke-width="2" opacity="0.!op!" stroke-linecap="round"/^> >> "svg_output\Q%%i.svg"
    )
    
    echo   ^<text x="50" y="50" font-family="Arial" font-size="24" fill="!accent!" opacity="0.3"^>%%i^</text^> >> "svg_output\Q%%i.svg"
    echo ^</svg^> >> "svg_output\Q%%i.svg"
    
    endlocal
)

echo.
echo All SVG backgrounds generated in 'svg_output' folder!
pause