# Certificate Generator Scripts

This directory contains scripts for batch generating PDF certificates.

## Setup

1. Make sure you have the fillable PDF template at:
   ```
   public/templates/certificate-template.pdf
   ```

2. Ensure the template has form fields named exactly:
   - `student_name` (text field)
   - `certificate_no` (text field)

3. Student list is located at:
   ```
   public/data/studentList.json
   ```

## Usage

### Generate All Certificates (Node.js)

Run the batch generator script:

```bash
node scripts/generateAll.js
```

This will:
1. Read all 60 students from `public/data/studentList.json`
2. Load the PDF template from `public/templates/certificate-template.pdf`
3. Generate unique certificate numbers for each student
4. Fill form fields in the PDF
5. Generate QR codes linking to verification URLs
6. Embed QR codes into PDFs
7. Save all certificates to `certificates/` directory

### Output Structure

```
certificates/
  dharshini_s_DARE-AIR-LP-25-26-001.pdf
  harini_k_DARE-AIR-LP-25-26-002.pdf
  harini_p_DARE-AIR-LP-25-26-003.pdf
  ...
  jay_DARE-AIR-LP-25-26-060.pdf
```

## Configuration

Edit `src/config/certificateConfig.js` to customize:
- Template path
- QR code position (x, y, size)
- Certificate prefix
- Verification URL base

## Browser Usage

For generating certificates one at a time in the browser, use:

```javascript
import { generateCertificatePDF, downloadPDF } from '../utils/batchCertificateGenerator';

const student = {
  name: "John Doe",
  roll_no: "25001"
};

const pdfBlob = await generateCertificatePDF(student);
downloadPDF(pdfBlob, 'certificate.pdf');
```

## Requirements

- Node.js 18+ (for batch script)
- pdf-lib
- qrcode
- fillable PDF template with form fields

## Troubleshooting

1. **Template not found**: Make sure `certificate-template.pdf` exists in `public/templates/`
2. **Form fields not found**: Verify field names match exactly (`student_name`, `certificate_no`)
3. **QR code not visible**: Adjust x, y coordinates in `certificateConfig.js`

