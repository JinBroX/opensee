@echo off
chcp 65001 >nul
echo Moving SVG files from svg_output to Q1-Q64 folders...

if not exist "svg_output" (
    echo svg_output folder not found!
    pause
    exit /b 1
)

set count=0
for /l %%i in (1,1,64) do (
    if exist "svg_output\Q%%i.svg" (
        if exist "Q%%i" (
            move "svg_output\Q%%i.svg" "Q%%i\image.svg" >nul
            echo Moved: Q%%i.svg
            set /a count+=1
        )
    )
)

echo.
echo Done! Moved %count% SVG files.
pause