# Function-by-Function Documentation

## Complete Function Reference Guide

This document provides detailed documentation for every function in the Certificate Verification System.

---

## 📁 Component: VerifyCertificate.jsx

### 1. `normalizeCertificateNumber(value)`
**Purpose:** Normalizes certificate number input  
**Parameters:**
- `value` (string): Raw certificate number input

**Returns:** (string) Uppercase, trimmed certificate number

**Process:**
1. Converts to string
2. Trims whitespace
3. Converts to uppercase
4. Removes all spaces

**Example:**
```javascript
normalizeCertificateNumber("  dare/air/lp/25-26/001  ")
// Returns: "DARE/AIR/LP/25-26/001"
```

---

### 2. `convertLegacyHyphenToSlash(value)`
**Purpose:** Converts legacy hyphen format to slash format  
**Parameters:**
- `value` (string): Certificate number with hyphens

**Returns:** (string) Certificate number with slashes

**Process:**
1. Checks if value already contains slashes
2. Converts first N hyphens to slashes (based on prefix count)
3. Preserves remaining hyphens

**Example:**
```javascript
convertLegacyHyphenToSlash("DARE-AIR-LP-25-26-001")
// Returns: "DARE/AIR/LP/25-26-001"
```

---

### 3. `toCanonicalCertificate(value)`
**Purpose:** Converts any certificate format to canonical format  
**Parameters:**
- `value` (string): Certificate number in any format

**Returns:** (string) Canonical certificate number

**Process:**
1. Normalizes input
2. If contains slash, normalizes sequence separator
3. Otherwise converts legacy format

**Example:**
```javascript
toCanonicalCertificate("DARE/AIR/LP/25-26-001")
// Returns: "DARE/AIR/LP/25-26/001"
```

---

### 4. `normalizeForLookup(value)`
**Purpose:** Creates array of possible certificate formats for database lookup  
**Parameters:**
- `value` (string): Certificate number input

**Returns:** (array) Array of possible formats

**Process:**
1. Gets canonical format
2. Adds hyphen variant if applicable
3. Removes duplicates

**Example:**
```javascript
normalizeForLookup("DARE/AIR/LP/25-26/001")
// Returns: ["DARE/AIR/LP/25-26/001", "DARE/AIR/LP/25-26-001"]
```

---

### 5. `toPathCertificate(value)`
**Purpose:** Encodes certificate number for URL  
**Parameters:**
- `value` (string): Certificate number

**Returns:** (string) URL-encoded certificate number

**Example:**
```javascript
toPathCertificate("DARE/AIR/LP/25-26/001")
// Returns: "DARE%2FAIR%2FLP%2F25-26%2F001"
```

---

### 6. `handleVerify(value)`
**Purpose:** Main verification function  
**Parameters:**
- `value` (string, optional): Certificate number to verify

**Process:**
1. Validates Supabase configuration
2. Normalizes input
3. Tries exact match with multiple formats
4. Falls back to case-insensitive search
5. Sets result or error
6. Updates URL without navigation

**State Updates:**
- `isLoading`: true during search
- `result`: certificate data or null
- `error`: error message or empty
- `visibleItems`: resets for animation

**Returns:** (void)

---

### 7. `useEffect` - Auto-verification
**Purpose:** Auto-verifies when certificate number in URL  
**Dependencies:** `[initialCertificate]`

**Process:**
1. Checks if initialCertificate exists
2. Normalizes certificate number
3. Sets certificate number in state
4. Calls handleVerify after 100ms delay
5. Cleans up timeout on unmount

---

### 8. `useEffect` - Animation
**Purpose:** Staggered animation for certificate display  
**Dependencies:** `[result]`

**Process:**
1. Resets visibility when result changes
2. Uses requestAnimationFrame for DOM readiness
3. Badge appears after 50ms
4. Name appears after 1000ms
5. Details appear one by one (2000ms + index * 1000ms)

**Cleanup:** Clears all timeouts and animation frame

---

## 📁 Component: Admin.jsx

### 9. `handleLogout()`
**Purpose:** Logs out admin user  
**Parameters:** None

**Process:**
1. Calls Supabase signOut
2. Removes session from sessionStorage
3. Navigates to login page
4. Handles errors gracefully

**Returns:** (Promise<void>)

---

### 10. `fetchCertificates()`
**Purpose:** Fetches all certificates from database  
**Parameters:** None

**Process:**
1. Checks Supabase configuration
2. Sets loading state
3. Queries certificates table
4. Orders by certificate_no (ascending)
5. Updates certificates state
6. Handles errors

**State Updates:**
- `isTableLoading`: true/false
- `certificates`: array of certificate objects

**Returns:** (Promise<void>)

---

### 11. `useEffect` - Initialization
**Purpose:** Initializes admin dashboard  
**Dependencies:** `[supabaseConfigured]`

**Process:**
1. Checks Supabase configuration
2. Fetches certificates
3. Sets initialization complete

---

## 📁 Component: UploadExcel.jsx

### 12. `downloadSampleExcel()`
**Purpose:** Downloads sample Excel template  
**Parameters:** None

**Process:**
1. Defines column headers in exact order
2. Creates sample data rows
3. Sets column widths
4. Creates workbook and worksheet
5. Downloads file as 'certificate_sample.xlsx'

**Column Order:**
1. S.No
2. Roll No
3. Name
4. Email
5. Dep
6. Year
7. Ins
8. Location
9. Phone Number
10. Certificate Number
11. Mode
12. Issued By
13. Date Issued
14. QR_URL
15. Create Date

**Returns:** (void)

---

### 13. `handleFileSelect(event)`
**Purpose:** Handles Excel file selection  
**Parameters:**
- `event`: File input change event

**Process:**
1. Gets selected file
2. Validates file type (.xlsx, .xls)
3. Calls parseExcelFile
4. Updates rows state
5. Handles errors

**State Updates:**
- `fileName`: selected file name
- `rows`: parsed certificate data
- `error`: error message if any

**Returns:** (Promise<void>)

---

### 14. `handleClearFile()`
**Purpose:** Clears selected file without saving  
**Parameters:** None

**Process:**
1. Resets fileName
2. Clears rows
3. Clears error and success messages
4. Resets file input element

**State Updates:**
- `fileName`: empty string
- `rows`: empty array
- `error`: empty string
- `successMessage`: empty string

**Returns:** (void)

---

### 15. `handleUpload()`
**Purpose:** Uploads parsed certificates to database  
**Parameters:** None

**Process:**
1. Validates Supabase configuration
2. Validates rows exist
3. Sets uploading state
4. Processes each row:
   - Normalizes dates
   - Generates certificate numbers if missing
   - Creates QR code URLs
   - Builds payload
5. Batch inserts into database
6. Shows success/error summary
7. Refreshes certificate list

**State Updates:**
- `isUploading`: true/false
- `successMessage`: summary message
- `error`: error message if any

**Returns:** (Promise<void>)

---

### 16. `parsedSummary` (useMemo)
**Purpose:** Calculates upload statistics  
**Dependencies:** `[totalRows, rows]`

**Returns:** (object)
```javascript
{
  total: number,
  online: number,
  offline: number
}
```

**Process:**
1. Counts total rows
2. Categorizes by mode (Online/Offline)
3. Returns summary object

---

## 📁 Component: ManualEntry.jsx

### 17. `resetForm()`
**Purpose:** Resets form to initial state  
**Parameters:** None

**Process:**
1. Resets all entry fields to empty
2. Clears error messages
3. Clears success messages
4. Clears email error

**State Updates:**
- `entry`: all fields empty
- `error`: empty string
- `successMessage`: empty string
- `emailError`: empty string

**Returns:** (void)

---

### 18. `validateEmail(email)`
**Purpose:** Validates email format  
**Parameters:**
- `email` (string): Email to validate

**Returns:** (boolean) true if valid or empty, false if invalid

**Validation:**
- Empty email is valid (optional field)
- Must contain @ symbol
- Must have valid domain
- Regex: `/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/`

**Example:**
```javascript
validateEmail("user@example.com") // Returns: true
validateEmail("invalid") // Returns: false
validateEmail("") // Returns: true (optional)
```

---

### 19. `handleInputChange(field, value)`
**Purpose:** Handles input field changes  
**Parameters:**
- `field` (string): Field name
- `value` (any): New field value

**Process:**
1. Updates entry state
2. Clears error messages
3. Clears success messages
4. Validates email in real-time if field is email

**State Updates:**
- `entry[field]`: new value
- `error`: empty string
- `successMessage`: empty string
- `emailError`: validation message if email invalid

**Returns:** (void)

---

### 20. `handleOpenModal()`
**Purpose:** Opens manual entry modal  
**Parameters:** None

**Process:**
1. Resets form
2. Opens modal
3. Hides "Add Another" prompt

**State Updates:**
- `isModalOpen`: true
- `showAddAnother`: false
- Form fields: reset

**Returns:** (void)

---

### 21. `handleCloseModal()`
**Purpose:** Closes manual entry modal  
**Parameters:** None

**Process:**
1. Closes modal
2. Hides "Add Another" prompt
3. Resets form

**State Updates:**
- `isModalOpen`: false
- `showAddAnother`: false
- Form fields: reset

**Returns:** (void)

---

### 22. `handleSubmit()`
**Purpose:** Submits manual certificate entry  
**Parameters:** None

**Process:**
1. Validates Supabase configuration
2. Validates required fields (name, date_issued)
3. Validates email if provided
4. Normalizes date
5. Gets or generates academic year
6. Generates certificate number if missing
7. Builds payload object
8. Inserts into database
9. Shows success message
10. Prompts for "Add Another" after 500ms

**State Updates:**
- `isUploading`: true/false
- `error`: error message if any
- `successMessage`: success message
- `showAddAnother`: true after success

**Returns:** (Promise<void>)

---

### 23. `handleAddAnother()`
**Purpose:** Resets form for another entry  
**Parameters:** None

**Process:**
1. Resets form
2. Hides "Add Another" prompt

**State Updates:**
- Form fields: reset
- `showAddAnother`: false

**Returns:** (void)

---

### 24. `useEffect` - Background Scroll Prevention
**Purpose:** Prevents background scrolling when modal is open  
**Dependencies:** `[isModalOpen]`

**Process:**
1. Sets body overflow to hidden when modal opens
2. Restores overflow when modal closes
3. Cleans up on unmount

**Returns:** Cleanup function

---

## 📁 Component: CertificateList.jsx

### 25. `filterRecords(records, query)`
**Purpose:** Filters records by search query  
**Parameters:**
- `records` (array): Array of certificate records
- `query` (string): Search query

**Returns:** (array) Filtered records

**Process:**
1. Returns all records if query is empty
2. Converts query to lowercase
3. Filters records where any field contains query
4. Searches: certificate_no, name, date_issued, mode

**Example:**
```javascript
filterRecords(certificates, "john")
// Returns: certificates where name contains "john"
```

---

### 26. `filteredCertificates` (useMemo)
**Purpose:** Applies all filters and sorting  
**Dependencies:** `[certificates, search, columnFilters]`

**Returns:** (array) Filtered and sorted certificates

**Process:**
1. Applies global search filter
2. Applies column-specific filters
3. Sorts by certificate number (ascending)
4. Uses extractSequenceNumber for proper numeric sorting

**Sorting Logic:**
- Extracts sequence numbers
- Compares numerically
- Falls back to string comparison if sequences equal

---

### 27. `handleColumnFilterChange(columnKey, value)`
**Purpose:** Updates column-specific filter  
**Parameters:**
- `columnKey` (string): Column to filter
- `value` (string): Filter value

**State Updates:**
- `columnFilters[columnKey]`: new value

**Returns:** (void)

---

### 28. `clearAllFilters()`
**Purpose:** Clears all filters  
**Parameters:** None

**State Updates:**
- `search`: empty string
- `columnFilters`: all fields empty

**Returns:** (void)

---

### 29. `getQrElementId(certificateNo)`
**Purpose:** Generates unique ID for QR code canvas  
**Parameters:**
- `certificateNo` (string): Certificate number

**Returns:** (string) Unique element ID

**Format:** `qr-{sanitized-certificate-number}`

**Example:**
```javascript
getQrElementId("DARE/AIR/LP/25-26/001")
// Returns: "qr-DARE-AIR-LP-25-26-001"
```

---

### 30. `handleExportExcel()`
**Purpose:** Exports filtered certificates to Excel  
**Parameters:** None

**Process:**
1. Validates filtered certificates exist
2. Creates Excel workbook
3. Converts to ArrayBuffer
4. Creates Blob
5. Downloads using file-saver

**File Format:** .xlsx  
**Filename:** `certificate-export-{timestamp}.xlsx`

**Returns:** (void)

---

### 31. `generatePdfSummary()`
**Purpose:** Generates PDF with table columns only  
**Parameters:** None

**Returns:** (jsPDF object) or null

**Process:**
1. Validates filtered certificates exist
2. Creates new jsPDF document (landscape)
3. Adds title and timestamp
4. Creates table with columns:
   - Certificate Number
   - Name
   - Date Issued
   - Mode
5. Formats table
6. Returns PDF document

**Features:**
- Landscape orientation
- Professional styling
- Auto-table formatting

---

### 32. `generatePdfDetails()`
**Purpose:** Generates PDF with all database fields  
**Parameters:** None

**Returns:** (jsPDF object) or null

**Process:**
1. Validates filtered certificates exist
2. Creates new jsPDF document (landscape)
3. Adds title and timestamp
4. Creates table with all fields:
   - S.No, Certificate Number, Name
   - Roll No, Email, Phone
   - Date Issued, Issued By, Mode
   - Location / Institution
5. Formats table
6. Returns PDF document

**Features:**
- Comprehensive data export
- All certificate information
- Professional formatting

---

### 33. `handleViewPdfSummary()`
**Purpose:** Opens summary PDF in browser  
**Parameters:** None

**Process:**
1. Generates PDF
2. Converts to Blob
3. Creates object URL
4. Opens in new tab
5. Cleans up URL after 100ms

**Returns:** (void)

---

### 34. `handleViewPdfDetails()`
**Purpose:** Opens details PDF in browser  
**Parameters:** None

**Process:**
1. Generates PDF
2. Converts to Blob
3. Creates object URL
4. Opens in new tab
5. Cleans up URL after 100ms

**Returns:** (void)

---

### 35. `handleExportPdfSummary()`
**Purpose:** Downloads summary PDF  
**Parameters:** None

**Process:**
1. Generates PDF
2. Saves with filename: `certificate-summary-{timestamp}.pdf`

**Returns:** (void)

---

### 36. `handleExportPdfDetails()`
**Purpose:** Downloads details PDF  
**Parameters:** None

**Process:**
1. Generates PDF
2. Saves with filename: `certificate-details-{timestamp}.pdf`

**Returns:** (void)

---

### 37. `handleDownloadQr(record)`
**Purpose:** Downloads QR code as PNG  
**Parameters:**
- `record` (object): Certificate record

**Process:**
1. Gets QR code canvas element
2. Sanitizes filename
3. Creates filename: `{name}_{certificate_no}_{roll_no}.png`
4. Converts canvas to PNG
5. Downloads file

**Filename Format:**
- Includes name if available
- Includes certificate number
- Includes roll number if available
- Sanitized for file system

**Returns:** (void)

---

## 📁 Utility: certificateHelpers.js

### 38. `extractSequenceNumber(certificateNo)`
**Purpose:** Extracts numeric sequence from certificate number  
**Parameters:**
- `certificateNo` (string): Certificate number

**Returns:** (number) Sequence number or 0

**Process:**
1. Matches pattern: `(\d{2}-\d{2})[\/-](\d{3,})$`
2. Extracts sequence part
3. Converts to integer
4. Returns 0 if no match

**Example:**
```javascript
extractSequenceNumber("DARE/AIR/LP/25-26/001")
// Returns: 1

extractSequenceNumber("DARE/AIR/LP/25-26-001")
// Returns: 1
```

---

### 39. `makeCertificateNumber(sequence, yearSegment, prefix)`
**Purpose:** Creates formatted certificate number  
**Parameters:**
- `sequence` (number): Sequence number
- `yearSegment` (string): Year segment (e.g., "25-26")
- `prefix` (string, optional): Certificate prefix

**Returns:** (string) Formatted certificate number

**Format:** `{PREFIX}/{YEAR_SEGMENT}/{SEQUENCE}`

**Example:**
```javascript
makeCertificateNumber(1, "25-26", "DARE/AIR/LP")
// Returns: "DARE/AIR/LP/25-26/001"
```

---

### 40. `getNextSequence({ prefix, yearSegment })`
**Purpose:** Gets next available sequence number  
**Parameters:**
- `prefix` (string): Certificate prefix
- `yearSegment` (string): Year segment

**Returns:** (Promise<number>) Next sequence number

**Process:**
1. Queries database for certificates with same prefix/year
2. Searches both slash and hyphen formats
3. Extracts all sequence numbers
4. Finds maximum
5. Returns max + 1

**Example:**
```javascript
await getNextSequence({ prefix: "DARE/AIR/LP", yearSegment: "25-26" })
// Returns: 61 (if highest is 60)
```

---

### 41. `getAcademicYearSegment(date)`
**Purpose:** Generates year segment from date  
**Parameters:**
- `date` (Date): Date object

**Returns:** (string) Year segment

**Format:** `YY-YY` (e.g., "25-26" for 2025-2026)

**Process:**
1. Gets full year
2. Extracts last 2 digits
3. Calculates next year
4. Returns formatted string

**Example:**
```javascript
getAcademicYearSegment(new Date("2025-10-31"))
// Returns: "25-26"
```

---

### 42. `buildQrCodeUrl(certificateNo)`
**Purpose:** Creates verification URL for QR code  
**Parameters:**
- `certificateNo` (string): Certificate number

**Returns:** (string) Full verification URL

**Format:** `{SITE_URL}/verify/{ENCODED_CERTIFICATE_NUMBER}`

**Example:**
```javascript
buildQrCodeUrl("DARE/AIR/LP/25-26/001")
// Returns: "https://cv.darecentre.in/verify/DARE%2FAIR%2FLP%2F25-26%2F001"
```

---

### 43. `formatDateForDb(date)`
**Purpose:** Formats date for database storage  
**Parameters:**
- `date` (Date): Date object

**Returns:** (string) Formatted date

**Format:** `YYYY-MM-DD`

**Example:**
```javascript
formatDateForDb(new Date("2025-10-31"))
// Returns: "2025-10-31"
```

---

### 44. `normalizeDate(value)`
**Purpose:** Converts various date formats to Date object  
**Parameters:**
- `value` (string|Date): Date in various formats

**Returns:** (Date) Date object or null

**Supported Formats:**
- `DD/MM/YYYY` (e.g., "31/10/2025")
- `YYYY-MM-DD` (e.g., "2025-10-31")
- Date objects
- ISO strings

**Example:**
```javascript
normalizeDate("31/10/2025")
// Returns: Date object for October 31, 2025

normalizeDate("2025-10-31")
// Returns: Date object for October 31, 2025
```

---

## 📁 Utility: excelParser.js

### 45. `normaliseHeader(value)`
**Purpose:** Normalizes Excel header names  
**Parameters:**
- `value` (string): Raw header name

**Returns:** (string) Normalized header name

**Process:**
1. Converts to string
2. Trims whitespace
3. Converts to lowercase
4. Replaces spaces with underscores

**Example:**
```javascript
normaliseHeader("Phone Number")
// Returns: "phone_number"

normaliseHeader("S.No")
// Returns: "s.no"
```

---

### 46. `parseExcelFile(file)`
**Purpose:** Parses Excel file and extracts certificate data  
**Parameters:**
- `file` (File): Excel file object

**Returns:** (Promise<array>) Array of certificate objects

**Process:**
1. Reads file as ArrayBuffer
2. Creates workbook from buffer
3. Gets first worksheet
4. Converts to JSON array
5. Extracts header row
6. Normalizes headers
7. Validates required headers (name, date_issued)
8. Maps rows to certificate objects
9. Returns parsed data

**Error Handling:**
- Empty file error
- Missing required columns error
- File read errors

---

### 47. `getValueByAliases(row, aliases)`
**Purpose:** Gets value from row using multiple possible header names  
**Parameters:**
- `row` (array): Data row
- `aliases` (array): Array of possible header names

**Returns:** (string) Value or empty string

**Process:**
1. Iterates through aliases
2. Finds matching header index
3. Returns first non-empty value found
4. Trims string values

**Example:**
```javascript
getValueByAliases(row, ['phone_number', 'phone'])
// Returns: phone value from row
```

---

### 48. `toExcelWorkbook(records)`
**Purpose:** Creates Excel workbook from certificate records  
**Parameters:**
- `records` (array): Array of certificate objects

**Returns:** (Workbook) XLSX workbook object

**Process:**
1. Creates header row
2. Maps records to data rows
3. Creates worksheet
4. Creates workbook
5. Returns workbook

**Columns:**
- sno, roll_no, name, phone, email
- date_issued, issued_by, mode
- location_or_institution, certificate_no

---

## 📁 Component: Login.jsx

### 49. `handleLogin(email, password)`
**Purpose:** Authenticates admin user  
**Parameters:**
- `email` (string): Admin email
- `password` (string): Admin password

**Process:**
1. Validates Supabase configuration
2. Validates email and password
3. Calls Supabase signIn
4. Stores session in sessionStorage
5. Navigates to admin dashboard
6. Handles errors

**State Updates:**
- `isLoading`: true/false
- `error`: error message if any

**Returns:** (Promise<void>)

---

## 📁 Component: ProtectedRoute.jsx

### 50. `ProtectedRoute` Component
**Purpose:** Protects admin routes from unauthorized access  
**Props:**
- `children`: React component to protect

**Process:**
1. Checks sessionStorage for auth_session
2. Renders children if authenticated
3. Redirects to login if not authenticated

**Returns:** (JSX) Protected component or redirect

---

## 📊 Summary Statistics

### Total Functions Documented: 50

**By Category:**
- Verification Functions: 8
- Admin Functions: 3
- Upload Functions: 5
- Manual Entry Functions: 8
- Certificate List Functions: 13
- Helper Functions: 7
- Parser Functions: 4
- Authentication Functions: 2

### Function Types:
- **State Management:** 15 functions
- **Data Processing:** 12 functions
- **UI/UX:** 10 functions
- **Validation:** 5 functions
- **Export/Import:** 8 functions

---

*End of Function Documentation*

