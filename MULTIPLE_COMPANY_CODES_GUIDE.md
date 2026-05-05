# Multiple Company Codes Implementation Guide

## Overview
The system has been updated to support **multiple company codes** within a single business unit. Previously, only one company could be configured. Now you can create and manage multiple companies with their own unique company codes.

## Key Changes

### 1. Database Model Changes (`server/models/CompanyDetails.js`)

#### Added Field:
```javascript
companyCode: {
  type: String,
  required: true,
  trim: true,
  uppercase: true
}
```

#### Updated Indexes:
- **Old**: `{ businessUnit: 1, isActive: 1 }` with unique constraint (allowed only 1 active company)
- **New**: 
  - `{ businessUnit: 1, companyCode: 1 }` - ensures unique company code per business unit
  - `{ businessUnit: 1, isActive: 1 }` - for querying all active companies

### 2. API Routes Changes (`server/routes/companyDetails.js`)

#### New Endpoints:

1. **GET /api/company-details** (Updated)
   - Returns all active companies for the business unit
   - Query parameters: `?businessUnitId=xxx`
   - Response: Array of companies

2. **GET /api/company-details/code/:companyCode**
   - Fetch specific company by company code
   - Query parameters: `?businessUnitId=xxx`
   - Response: Single company object

3. **POST /api/company-details** (Updated)
   - Create new company
   - Required fields: `companyCode`, `companyName`, `legalName`, `businessUnit`, `createdBy`
   - Validates unique company code per business unit

4. **PUT /api/company-details/:id** (Updated)
   - Update existing company
   - Optional: update `companyCode` (with duplicate validation)
   - Supports partial updates

5. **DELETE /api/company-details/:id** (New)
   - Deactivate company (soft delete)
   - Sets `isActive: false`
   - Preserves audit trail

### 3. Frontend Component Changes (`client/src/features/company/CompanyDetails.js`)

#### New Features:
- **Company Selector Dropdown**: Switch between existing companies
- **Company Code Field**: Required field for creating new companies
  - Max length: 20 characters
  - Auto-converted to uppercase
  - Cannot be changed after creation
- **+ New Company Button**: Quick access to create new company
- **Company List Display**: Shows all companies in dropdown (Code - Name format)
- **Create vs Edit Mode**: Different button text and form behavior

#### UI Improvements:
- Company selection section at top
- Visual feedback for new vs existing company mode
- Disabled company code field for existing companies
- Helper text explaining company code immutability

### 4. API Service Updates (`client/src/features/company/services/companyDetailsAPI.js`)

#### New Methods:
```javascript
getAll()                    // Get all companies
getByCode(companyCode)      // Get specific company by code
delete(id, updatedBy)       // Deactivate company
```

#### Existing Methods (Updated):
```javascript
get()       // Now returns array of all companies
save()      // Creates new company with company code
update()    // Updates existing company
```

## Usage Guide

### Creating a New Company

1. Click **"+ New Company"** button
2. Enter Company Code (e.g., "CC001", "MAIN", "BRANCH01")
3. Fill in all required fields:
   - Company Name
   - Legal Name
   - Address details
   - Contact information
   - Compliance information (GST, Drug License, etc.)
4. Click **"Create Company"**

### Switching Between Companies

1. Use the dropdown at the top to select from existing companies
2. Form will auto-populate with that company's data
3. Make changes and click **"Save Changes"**

### Managing Multiple Company Codes

- Each company code must be unique within the business unit
- Company codes are immutable (cannot be changed after creation)
- Company codes are auto-converted to uppercase
- You can deactivate companies (via DELETE API)

## Database Migration Steps

> ⚠️ **IMPORTANT**: Execute these steps in order if upgrading existing deployment

### Step 1: Add companyCode to existing records
```javascript
// Use MongoDB compass or CLI
db.companydetails.updateMany(
  { companyCode: { $exists: false } },
  { $set: { companyCode: "DEFAULT" } }
);
```

### Step 2: Drop old index
```javascript
db.companydetails.dropIndex("businessUnit_1_isActive_1");
```

### Step 3: Create new indexes
```javascript
db.companydetails.createIndex({ businessUnit: 1, companyCode: 1 }, { unique: true });
db.companydetails.createIndex({ businessUnit: 1, isActive: 1 });
```

## API Request/Response Examples

### Create New Company
```javascript
POST /api/company-details
Content-Type: application/json

{
  "companyCode": "CC001",
  "companyName": "Main Branch",
  "legalName": "ABC Healthcare Pvt Ltd",
  "businessUnit": "ObjectId",
  "createdBy": "ObjectId",
  "address": {
    "street": "123 Medical Lane",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "contact": {
    "email": "main@example.com",
    "mobile1": "9876543210"
  },
  "compliance": {
    "gstNumber": "27AABCU9603R1Z0",
    "stateCode": "27",
    "dlNumber": "DL/LIC/123456"
  }
}

Response:
{
  "success": true,
  "message": "Company created successfully",
  "data": { ...company object }
}
```

### Get All Companies
```javascript
GET /api/company-details
Response: [
  { companyCode: "CC001", companyName: "Main Branch", ... },
  { companyCode: "CC002", companyName: "Branch 2", ... }
]
```

### Get by Company Code
```javascript
GET /api/company-details/code/CC001
Response: { companyCode: "CC001", companyName: "Main Branch", ... }
```

## Backward Compatibility

- Old code that calls `/api/company-details` will now receive an array instead of single object
- Update any frontend code that expects single company to handle array response
- The old `findOne({ isActive: true })` behavior is replaced with `find({ isActive: true })`

## Troubleshooting

### Duplicate Company Code Error
- Company codes must be unique per business unit
- Solution: Use a different company code

### Company Code Cannot Be Changed
- This is by design - company codes are immutable identifiers
- If you need to change it, create a new company

### Missing businessUnit Field
- Required field: `businessUnit` must be included in POST requests
- The system now stores company hierarchy properly

## Best Practices

1. **Company Code Naming**: Use descriptive codes like:
   - `MAIN` - Main/Head Office
   - `DELHI` - Location-based
   - `BR001`, `BR002` - Branch numbering

2. **Data Entry**: Ensure GST and Drug License numbers match the physical company

3. **Compliance**: Maintain separate compliance records for each company code

4. **Auditing**: All changes are tracked with createdBy/updatedBy timestamps

## Related Changes

This feature integrates with:
- Business Unit management
- User permissions
- Audit logging
- Report filtering by company code

## Support

For issues or questions:
1. Check the API responses for validation errors
2. Verify all required fields are populated
3. Ensure company codes follow naming conventions
4. Check database indexes are properly created
