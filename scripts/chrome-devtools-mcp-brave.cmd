@echo off
setlocal

if "%BRAVE_DEVTOOLS_BROWSER_URL%"=="" (
  set "BRAVE_DEVTOOLS_BROWSER_URL=http://127.0.0.1:9222"
)

npx -y chrome-devtools-mcp@latest --browser-url="%BRAVE_DEVTOOLS_BROWSER_URL%" --no-usage-statistics --no-performance-crux %*
