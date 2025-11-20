# Certificate Generator System - Complete Guide

## Overview

This system generates PDF certificates for multiple students by:
1. Reading student data from JSON file
2. Filling form fields in a fillable PDF template
3. Generating unique certificate numbers
4. Creating QR codes linking to verification URLs
5. Saving individual PDF files for each student

## File Structure

```
├── public/
│   ├── templates/
│   │   └── certificate-template.pdf (YOUR FILLABLE PDF TEMPLATE)
│   └── data/
│       └── studentList.json (60 students)
├── scripts/
│   ├── generateAll.js (Batch generator script)
│   └── README.md
├── src/
│   ├── config/
│   │   └── certificateConfig.js (Configuration)
│   └── utils/
│       └── batchCertificateGenerator.js (Browser-compatible generator)
└── certificates/ (Output directory - created automatically)
```

## Setup Instructions

### 1. Prepare Your PDF Template

1. Create or obtain your certificate PDF template
2. Make it fillable using Sejda (or Adobe Acrobat):
   - Add a text field named exactly: `student_name`
   - Add a text field named exactly: `certificate_no`
   - Position these fields where you want the data to appear
3. Save the PDF as: `public/templates/certificate-template.pdf`

**Important**: The field names must match exactly:
- `student_name` (for student name)
- `certificate_no` (for certificate number)

### 2. Configure Settings

Edit `src/config/certificateConfig.js` to customize:

```javascript
export const certificateConfig = {
    // Path to your template (relative to public folder)
    templatePath: '/templates/certificate-template.pdf',
    
    // QR Code position (adjust these coordinates)
    qrCode: {
        x: 650,  // Horizontal position (left to right)
        y: 80,   // Vertical position (bottom to top)
        size: 100 // Size in PDF points (72 points = 1 inch)
    },
    
    // Certificate prefix
    certificatePrefix: 'DARE/AIR/LP',
    
    // Year segment
    yearSegment: '25-26',
    
    // Verification URL (change to your actual website)
    verifyBaseUrl: 'https://mywebsite.com/verify'
};
```

**Note**: PDF coordinates use bottom-left as origin (0, 0). If your QR code appears in the wrong position, adjust the x and y values.

### 3. Prepare Student List

The student list is already set up at `public/data/studentList.json` with 60 students.

To modify it, edit the JSON file:

```json
[
  {
    "name": "Student Name",
    "roll_no": "25001"
  },
  ...
]
```

## Usage

### Option 1: Generate All Certificates (Recommended)

Run the batch generator script:

```bash
npm run generate:certificates
```

Or directly:

```bash
node scripts/generateAll.js
```

**What it does:**
1. Reads all students from `public/data/studentList.json`
2. Generates unique certificate numbers (DARE/AIR/LP/25-26/001, 002, ... 060)
3. Fills form fields in each PDF
4. Generates QR codes with verification URLs
5. Embeds QR codes into PDFs
6. Saves all certificates to `certificates/` folder

**Output:**
```
certificates/
  dharshini_s_DARE-AIR-LP-25-26-001.pdf
  harini_k_DARE-AIR-LP-25-26-002.pdf
  harini_p_DARE-AIR-LP-25-26-003.pdf
  ...
  jay_DARE-AIR-LP-25-26-060.pdf
```

### Option 2: Generate Single Certificate (Browser)

For generating certificates one at a time in the browser:

```javascript
import { generateCertificatePDF, downloadPDF } from './utils/batchCertificateGenerator';

const student = {
  name: "John Doe",
  roll_no: "25001"
};

const certificateNo = "DARE/AIR/LP/25-26/001";

// Generate PDF
const pdfBlob = await generateCertificatePDF(student, certificateNo);

// Download it
downloadPDF(pdfBlob, 'certificate.pdf');
```

## Certificate Number Format

Certificates are numbered sequentially:
- Format: `{PREFIX}/{YEAR_SEGMENT}/{SEQUENCE}`
- Example: `DARE/AIR/LP/25-26/001`
- Sequence: 001, 002, 003, ... 060

The sequence number is generated automatically based on the student's position in the list.

## QR Code Verification URLs

Each QR code links to:
```
https://mywebsite.com/verify/{certificate_no}
```

For example:
- `https://mywebsite.com/verify/DARE/AIR/LP/25-26/001`
- `https://mywebsite.com/verify/DARE/AIR/LP/25-26/002`
- etc.

**Important**: Change `verifyBaseUrl` in `certificateConfig.js` to your actual website URL.

## Troubleshooting

### 1. Template File Not Found

**Error**: `Failed to load PDF template from /templates/certificate-template.pdf`

**Solution**: 
- Make sure the file exists at: `public/templates/certificate-template.pdf`
- Check the file name matches exactly (case-sensitive)
- If using a different name, update `templatePath` in `certificateConfig.js`

### 2. Form Fields Not Found

**Error**: `Failed to fill field 'student_name': Field not found`

**Solution**:
- Open your PDF template in Sejda/Acrobat
- Verify field names match exactly:
  - `student_name` (not `Student Name` or `studentName`)
  - `certificate_no` (not `Certificate Number` or `certificateNumber`)
- Field names are case-sensitive!

### 3. QR Code Not Visible

**Issue**: QR code doesn't appear or appears in wrong position

**Solution**:
- Adjust coordinates in `certificateConfig.js`:
  ```javascript
  qrCode: {
      x: 650,  // Increase to move right, decrease to move left
      y: 80,   // Increase to move up, decrease to move down
      size: 100 // Increase for larger QR code
  }
  ```
- PDF coordinates: (0,0) is bottom-left corner
- Try different values until positioned correctly

### 4. PDF Template Corrupted

**Error**: `Failed to load PDF document. The template file may be corrupted`

**Solution**:
- Re-save your PDF template
- Try creating a new fillable PDF template
- Ensure it's a valid PDF file (not corrupted)

### 5. No Certificates Generated

**Issue**: Script runs but no output files

**Solution**:
- Check console output for specific errors
- Verify student list JSON is valid format
- Ensure write permissions for `certificates/` directory

## Advanced Configuration

### Custom Certificate Number Format

Edit the `generateCertificateNumber` function in `scripts/generateAll.js`:

```javascript
function generateCertificateNumber(student, sequence) {
    // Custom format example
    const prefix = config.certificatePrefix;
    const year = new Date().getFullYear();
    const seq = String(sequence).padStart(4, '0'); // 4-digit sequence
    return `${prefix}/${year}/${seq}`;
}
```

### Custom QR Code Size/Position

Adjust in `certificateConfig.js`:

```javascript
qrCode: {
    x: 650,      // Horizontal: increase = right, decrease = left
    y: 80,       // Vertical: increase = up, decrease = down
    size: 150    // Size in points (larger = bigger QR code)
}
```

### Custom Verification URL Format

Change the URL generation in `scripts/generateAll.js`:

```javascript
const verifyUrl = `${config.verifyBaseUrl}?cert=${encodeURIComponent(certificateNo)}`;
```

## Production Checklist

- [ ] Template PDF prepared with correct field names
- [ ] Field names verified: `student_name`, `certificate_no`
- [ ] QR code position tested and adjusted
- [ ] Verification URL updated to production domain
- [ ] Student list verified (all 60 students)
- [ ] Test run completed successfully
- [ ] Output PDFs verified (all fields filled, QR codes visible)
- [ ] Certificate numbers verified (sequential, unique)

## Support

For issues:
1. Check console output for specific error messages
2. Verify all file paths and field names
3. Test with a single student first
4. Review the troubleshooting section above

