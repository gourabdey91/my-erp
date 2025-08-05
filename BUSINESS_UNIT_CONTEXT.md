# Business Unit Context Persistence

## Overview
The business unit context in the ERP application is designed to persist throughout the user's session and only gets reset when the user logs out. This ensures a seamless user experience while maintaining proper data security.

## How It Works

### 1. **Session Persistence**
- Business unit data is stored in both React state and localStorage
- When the user refreshes the page, the business unit context is restored from localStorage
- The selected business unit remains active across page refreshes and navigation

### 2. **Context Initialization**
```javascript
// When user logs in:
1. Login API returns user data with populated business units
2. TestBusinessUnitInitializer loads business units from user object
3. BusinessUnitContext initializes with user's business units
4. Current business unit is set (default or first available)
5. Data is saved to localStorage for persistence
```

### 3. **Context Persistence**
- **localStorage Keys:**
  - `currentUser`: User data including business units
  - `currentBusinessUnit`: Currently selected business unit
  - `userBusinessUnits`: Array of all business units user has access to

### 4. **Context Clearing (Logout Only)**
The business unit context is cleared in these scenarios:

#### **Explicit Logout**
```javascript
// When user clicks logout:
1. AuthContext.logout() is called
2. Removes currentUser from localStorage
3. Removes currentBusinessUnit from localStorage  
4. Removes userBusinessUnits from localStorage
5. Resets all React state to null/empty
```

#### **Cross-Tab Logout Detection**
```javascript
// If user logs out in another browser tab:
1. Storage event listener detects currentUser removal
2. Automatically clears business unit context
3. Prevents stale data from remaining
```

#### **Invalid Session Detection**
```javascript
// On app startup:
1. Checks if currentUser exists in localStorage
2. If no user, automatically clears any stale BU data
3. Prevents orphaned business unit data
```

## Key Features

### ✅ **What Persists**
- Selected business unit across page refreshes
- Business unit list and permissions
- User's default business unit preference
- Business unit switching history

### ❌ **What Gets Cleared**
- All business unit data on logout
- Stale data when no valid user session
- Context when user logs out in another tab

### 🔄 **Business Unit Switching**
- Users can switch between assigned business units
- Switch persists across page refreshes
- New selection is immediately saved to localStorage
- Context updates automatically across all components

## Security Considerations

1. **Data Isolation**: Business unit context ensures users only see data for their assigned units
2. **Session Management**: Context is tied to user authentication state
3. **Cross-Tab Sync**: Logout in one tab clears context in all tabs
4. **Stale Data Prevention**: Automatic cleanup of orphaned business unit data

## Developer Notes

### Context Structure
```javascript
const businessUnitContext = {
  currentBusinessUnit: {
    _id: "68920a453993bf82a0512c02",
    code: "MAIN", 
    name: "Main Office"
  },
  userBusinessUnits: [
    { _id: "...", code: "MAIN", name: "Main Office" },
    { _id: "...", code: "BRANCH", name: "Branch Office" }
  ],
  loading: false,
  switchBusinessUnit: (bu) => {...},
  initializeBusinessUnits: (bus, defaultBU) => {...},
  clearBusinessUnitContext: () => {...}
}
```

### Usage in Components
```javascript
const { currentBusinessUnit, switchBusinessUnit } = useBusinessUnit();

// Display current BU
console.log('Current BU:', currentBusinessUnit?.name);

// Switch BU
switchBusinessUnit(newBusinessUnit);
```

## Testing the Persistence

1. **Login** with credentials
2. **Select a business unit** from dropdown
3. **Refresh the page** → Business unit should remain selected
4. **Navigate between pages** → Business unit should persist
5. **Logout** → All business unit data should be cleared
6. **Login again** → Fresh business unit context is loaded

This ensures a robust and secure business unit context that maintains user experience while properly handling session management.
