@echo off
REM Production Database Backup Script for Windows
REM Run this weekly or as needed

REM Configuration
set BACKUP_DIR=.\backups
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%
set BACKUP_NAME=myerp-prod-backup-%DATE%

REM Create backup directory if it doesn't exist
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

echo 🔄 Starting backup of production database...
echo 📅 Backup date: %date% %time%

REM MongoDB dump (requires MongoDB Database Tools)
mongodump ^
  --uri="mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true&w=majority" ^
  --out="%BACKUP_DIR%\%BACKUP_NAME%"

if %errorlevel% equ 0 (
    echo ✅ Backup completed successfully!
    echo 📁 Backup location: %BACKUP_DIR%\%BACKUP_NAME%
    
    REM Compress backup using 7zip or tar (if available)
    cd %BACKUP_DIR%
    if exist "C:\Program Files\7-Zip\7z.exe" (
        "C:\Program Files\7-Zip\7z.exe" a -tzip "%BACKUP_NAME%.zip" "%BACKUP_NAME%"
        rmdir /s /q "%BACKUP_NAME%"
        echo 🗜️  Backup compressed: %BACKUP_NAME%.zip
    ) else (
        echo ⚠️  7-Zip not found. Backup not compressed.
    )
    
    echo ✨ Backup process completed!
) else (
    echo ❌ Backup failed!
    exit /b 1
)
