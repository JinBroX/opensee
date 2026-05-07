@echo off
chcp 65001 >nul
echo Creating 64 hexagram folders...
echo.

set count=0
for /l %%i in (1,1,64) do (
    echo Processing Q%%i...
    
    if not exist "Q%%i" mkdir "Q%%i"
    
    if exist "Q%%i.json" (
        move "Q%%i.json" "Q%%i\semantic-v1.json" >nul
        echo   Moved: Q%%i.json
    ) else (
        echo   Warning: Q%%i.json not found
    )
    
    if exist "Q%%i.svg" (
        move "Q%%i.svg" "Q%%i\image.svg" >nul
        echo   Moved: Q%%i.svg
    ) else (
        echo   Warning: Q%%i.svg not found
    )
    
    echo { > "Q%%i\info.json"
    echo   "id": "Q%%i", >> "Q%%i\info.json"
    echo   "name": "Hexagram %%i", >> "Q%%i\info.json"
    echo   "description": "I Ching Hexagram %%i", >> "Q%%i\info.json"
    echo   "attributes": ["yang", "strong"], >> "Q%%i\info.json"
    echo   "element": "heaven" >> "Q%%i\info.json"
    echo } >> "Q%%i\info.json"
    echo   Created: info.json
    echo.
    
    set /a count+=1
)

echo Completed! Created %count% folders.
pause