/**
 * Batch Certificate Generator Script
 * 
 * This script generates PDF certificates for all students in the studentList.json file.
 * It reads the fillable PDF template, fills in form fields, generates QR codes,
 * and saves individual PDF files for each student.
 * 
 * Usage: node scripts/generateAll.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Configuration
const config = {
    templatePath: join(projectRoot, 'public', 'templates', 'certificate-template.pdf'),
    studentListPath: join(projectRoot, 'public', 'data', 'studentList.json'),
    outputDir: join(projectRoot, 'certificates'),
    fields: {
        studentName: 'student_name',
        certificateNumber: 'certificate_no'
    },
    qrCode: {
        x: 650,
        y: 80,
        size: 100
    },
    certificatePrefix: 'DARE/AIR/LP',
    yearSegment: '25-26',
    verifyBaseUrl: 'https://mywebsite.com/verify'
};

/**
 * Generate a unique certificate number
 * @param {Object} student - Student data
 * @param {number} sequence - Sequence number
 * @returns {string} Certificate number
 */
function generateCertificateNumber(student, sequence) {
    const prefix = config.certificatePrefix;
    const yearSegment = config.yearSegment;
    const seq = String(sequence).padStart(3, '0');
    return `${prefix}/${yearSegment}/${seq}`;
}

/**
 * Generate QR code data URL
 * @param {string} url - URL to encode in QR code
 * @returns {Promise<string>} QR code data URL
 */
async function generateQRCode(url) {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
            errorCorrectionLevel: 'M'
        });
        return qrCodeDataUrl;
    } catch (error) {
        throw new Error(`Failed to generate QR code: ${error.message}`);
    }
}

/**
 * Generate a single certificate PDF
 * @param {Object} student - Student data
 * @param {string} certificateNo - Certificate number
 * @param {Uint8Array} templateBytes - PDF template bytes
 * @returns {Promise<Uint8Array>} Generated PDF bytes
 */
async function generateSingleCertificate(student, certificateNo, templateBytes) {
    try {
        // Load PDF document
        const pdfDoc = await PDFDocument.load(templateBytes);
        const form = pdfDoc.getForm();
        const pages = pdfDoc.getPages();

        if (pages.length === 0) {
            throw new Error('PDF template has no pages');
        }

        const firstPage = pages[0];

        // Fill form fields
        try {
            const nameField = form.getTextField(config.fields.studentName);
            const nameValue = student.name ? student.name.toUpperCase() : '';
            nameField.setText(nameValue);
            console.log(`  ✓ Filled '${config.fields.studentName}' with: ${nameValue}`);
        } catch (error) {
            throw new Error(`Failed to fill field '${config.fields.studentName}': ${error.message}`);
        }

        try {
            const certNoField = form.getTextField(config.fields.certificateNumber);
            certNoField.setText(certificateNo);
            console.log(`  ✓ Filled '${config.fields.certificateNumber}' with: ${certificateNo}`);
        } catch (error) {
            throw new Error(`Failed to fill field '${config.fields.certificateNumber}': ${error.message}`);
        }

        // Flatten the form (makes it read-only)
        form.flatten();
        console.log(`  ✓ Form flattened`);

        // Generate and embed QR code
        try {
            const verifyUrl = `${config.verifyBaseUrl}/${encodeURIComponent(certificateNo)}`;
            console.log(`  ✓ Generating QR code for: ${verifyUrl}`);
            
            const qrCodeDataUrl = await generateQRCode(verifyUrl);
            const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

            firstPage.drawImage(qrImage, {
                x: config.qrCode.x,
                y: config.qrCode.y,
                width: config.qrCode.size,
                height: config.qrCode.size
            });
            console.log(`  ✓ QR code inserted at (${config.qrCode.x}, ${config.qrCode.y})`);
        } catch (error) {
            console.warn(`  ⚠ Failed to generate QR code: ${error.message}`);
            // Continue without QR code
        }

        // Save PDF
        const pdfBytes = await pdfDoc.save();
        return pdfBytes;

    } catch (error) {
        throw new Error(`Failed to generate certificate for ${student.name}: ${error.message}`);
    }
}

/**
 * Generate sanitized filename from student name
 * @param {string} name - Student name
 * @param {string} certificateNo - Certificate number
 * @returns {string} Sanitized filename
 */
function generateFilename(name, certificateNo) {
    // Remove special characters and spaces, replace with underscores
    const sanitizedName = name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
    return `${sanitizedName}_${certificateNo.replace(/\//g, '-')}.pdf`;
}

/**
 * Main function to generate all certificates
 */
async function generateAllCertificates() {
    try {
        console.log('🚀 Starting batch certificate generation...\n');

        // Read student list
        console.log(`📖 Reading student list from: ${config.studentListPath}`);
        const studentListData = readFileSync(config.studentListPath, 'utf-8');
        const students = JSON.parse(studentListData);
        console.log(`✓ Loaded ${students.length} students\n`);

        // Read PDF template
        console.log(`📄 Reading PDF template from: ${config.templatePath}`);
        const templateBytes = readFileSync(config.templatePath);
        console.log(`✓ Template loaded (${(templateBytes.length / 1024).toFixed(2)} KB)\n`);

        // Create output directory if it doesn't exist
        try {
            mkdirSync(config.outputDir, { recursive: true });
            console.log(`📁 Output directory: ${config.outputDir}\n`);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }

        // Generate certificates for each student
        console.log('📝 Generating certificates...\n');
        const results = {
            success: [],
            failed: []
        };

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const sequence = i + 1;
            const certificateNo = generateCertificateNumber(student, sequence);
            const filename = generateFilename(student.name, certificateNo);
            const outputPath = join(config.outputDir, filename);

            console.log(`[${sequence}/${students.length}] Generating certificate for: ${student.name}`);
            console.log(`  Certificate No: ${certificateNo}`);
            console.log(`  Output: ${filename}`);

            try {
                const pdfBytes = await generateSingleCertificate(student, certificateNo, templateBytes);
                writeFileSync(outputPath, pdfBytes);
                console.log(`  ✅ Successfully generated: ${filename}\n`);
                results.success.push({
                    student: student.name,
                    certificateNo,
                    filename
                });
            } catch (error) {
                console.error(`  ❌ Failed: ${error.message}\n`);
                results.failed.push({
                    student: student.name,
                    certificateNo,
                    error: error.message
                });
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 GENERATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successfully generated: ${results.success.length} certificates`);
        console.log(`❌ Failed: ${results.failed.length} certificates`);
        console.log(`📁 Output directory: ${config.outputDir}`);
        console.log('='.repeat(60) + '\n');

        if (results.failed.length > 0) {
            console.log('⚠️  Failed certificates:');
            results.failed.forEach(({ student, error }) => {
                console.log(`   - ${student}: ${error}`);
            });
            console.log();
        }

        if (results.success.length > 0) {
            console.log('✅ Successfully generated certificates:');
            results.success.slice(0, 10).forEach(({ student, filename }) => {
                console.log(`   - ${student} → ${filename}`);
            });
            if (results.success.length > 10) {
                console.log(`   ... and ${results.success.length - 10} more`);
            }
        }

        console.log('\n✨ Batch generation complete!\n');

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the generator
generateAllCertificates();

