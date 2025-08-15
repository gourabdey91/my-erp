@echo off
echo Testing inquiry creation without surgical category...
echo.

REM First get some real IDs from the database
echo Getting hospital ID...
curl -s "http://localhost:5000/api/hospital" > temp_hospitals.json

echo Getting procedure ID...
curl -s "http://localhost:5000/api/procedures" > temp_procedures.json

echo Getting payment method ID...  
curl -s "http://localhost:5000/api/payment-method" > temp_payment_methods.json

echo Getting material ID...
curl -s "http://localhost:5000/api/material" > temp_materials.json

echo.
echo Creating inquiry without surgical category...

REM Create a test inquiry (you'll need to replace these with actual IDs from your database)
curl -X POST "http://localhost:5000/api/inquiry" ^
-H "Content-Type: application/json" ^
-d "{\"hospital\": \"674032a5ca2b7c001f123456\", \"surgicalProcedure\": \"67403025ca2b7c001f234567\", \"inquiryDate\": \"2024-01-15T10:00:00.000Z\", \"patientName\": \"Test Patient\", \"patientUHID\": \"TEST001\", \"patientAge\": 45, \"patientGender\": \"Male\", \"paymentMethod\": \"674032a5ca2b7c001f789012\", \"items\": [{\"material\": \"674028b8ca2b7c001f345678\", \"description\": \"Test Material\", \"qty\": 2, \"unitPrice\": 100, \"discount\": {\"type\": \"percentage\", \"value\": 5}}], \"remarks\": \"Test inquiry without surgical category - should be derived from procedure\"}"

echo.
echo Test completed. Check the response above.

REM Clean up temp files
del temp_hospitals.json temp_procedures.json temp_payment_methods.json temp_materials.json 2>nul
