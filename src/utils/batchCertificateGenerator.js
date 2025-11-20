/**
 * Batch Certificate Generator (Browser-compatible version)
 * 
 * This utility can be used in the browser to generate certificates one by one.
 * For bulk generation, use the Node.js script: scripts/generateAll.js
 */

import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { certificateConfig } from '../config/certificateConfig';

/**
 * Generate a certificate PDF for a single student
 * @param {Object} studentData - Student data with name and roll_no
 * @param {string} certificateNo - Certificate number (optional, will be generated if not provided)
 * @returns {Promise<Blob>} PDF blob
 */
export async function generateCertificatePDF(studentData, certificateNo = null) {
    try {
        console.log('Starting certificate generation for:', studentData.name);

        // Validate required fields
        if (!studentData || !studentData.name) {
            throw new Error('Student name is required');
        }

        // Generate certificate number if not provided
        const finalCertNo = certificateNo || generateCertificateNumber(studentData);

        // 1. Load the template
        const templateBytes = await fetch(certificateConfig.templatePath).then(res => {
            if (!res.ok) {
                throw new Error(
                    `Failed to load PDF template from ${certificateConfig.templatePath}. ` +
                    `Status: ${res.status} ${res.statusText}. ` +
                    `Make sure the template file exists in public/templates/ folder.`
                );
            }
            return res.arrayBuffer();
        });

        // 2. Load PDF document
        let pdfDoc;
        try {
            pdfDoc = await PDFDocument.load(templateBytes);
        } catch (error) {
            throw new Error(`Failed to load PDF document. The template file may be corrupted. Error: ${error.message}`);
        }

        const form = pdfDoc.getForm();
        const pages = pdfDoc.getPages();
        
        if (pages.length === 0) {
            throw new Error('PDF template has no pages');
        }
        
        const firstPage = pages[0];

        // DEBUG: Log all available fields
        const fieldsList = form.getFields().map(f => ({
            name: f.getName(),
            type: f.constructor.name
        }));
        console.log('Available fields in PDF:', fieldsList);

        // 3. Fill form fields using getTextField().setText()
        const { fields } = certificateConfig;

        // Fill student_name field
        try {
            const nameField = form.getTextField(fields.studentName);
            const nameValue = studentData.name ? studentData.name.toUpperCase() : '';
            nameField.setText(nameValue);
            console.log(`✓ Filled field '${fields.studentName}' with: ${nameValue}`);
        } catch (error) {
            throw new Error(`Failed to fill field '${fields.studentName}': ${error.message}. Make sure the field exists in the PDF template.`);
        }

        // Fill certificate_no field
        try {
            const certNoField = form.getTextField(fields.certificateNumber);
            certNoField.setText(finalCertNo);
            console.log(`✓ Filled field '${fields.certificateNumber}' with: ${finalCertNo}`);
        } catch (error) {
            throw new Error(`Failed to fill field '${fields.certificateNumber}': ${error.message}. Make sure the field exists in the PDF template.`);
        }

        // 4. Flatten the form (removes editable fields and makes it read-only)
        form.flatten();
        console.log('✓ Form flattened');

        // 5. Generate and Embed QR Code
        try {
            const verifyUrl = `${certificateConfig.verifyBaseUrl}/${encodeURIComponent(finalCertNo)}`;
            console.log('Generating QR code for URL:', verifyUrl);
            
            const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
                width: 300,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' },
                errorCorrectionLevel: 'M'
            });

            const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

            const { qrCode } = certificateConfig;
            firstPage.drawImage(qrImage, {
                x: qrCode.x,
                y: qrCode.y,
                width: qrCode.size,
                height: qrCode.size
            });
            console.log(`✓ QR code inserted at (${qrCode.x}, ${qrCode.y})`);
        } catch (error) {
            console.warn('Failed to generate QR code:', error);
            // Continue without QR code - don't fail the entire generation
        }

        // 6. Save PDF
        const pdfBytes = await pdfDoc.save();
        console.log('✓ PDF generated successfully');
        return new Blob([pdfBytes], { type: 'application/pdf' });

    } catch (error) {
        console.error('Certificate Generation Error:', error);
        throw error;
    }
}

/**
 * Generate a unique certificate number for a student
 * @param {Object} studentData - Student data
 * @returns {string} Certificate number
 */
function generateCertificateNumber(studentData) {
    const prefix = certificateConfig.certificatePrefix || 'DARE/AIR/LP';
    const yearSegment = certificateConfig.yearSegment || '25-26';
    
    let sequence;
    if (studentData.roll_no) {
        // Extract last 3 digits from roll_no (e.g., 25002 -> 002)
        const rollNoStr = String(studentData.roll_no);
        const last3Digits = rollNoStr.slice(-3); // Get last 3 digits
        sequence = Number.parseInt(last3Digits, 10) || 1;
    } else {
        // Fallback: use random sequence
        sequence = Math.floor(Math.random() * 1000);
    }
    
    // Pad to 3 digits (001, 002, 003, etc.)
    const seqStr = String(sequence).padStart(3, '0');
    return `${prefix}/${yearSegment}/${seqStr}`;
}

/**
 * Helper to download the generated PDF (Browser environment)
 * @param {Blob} pdfBlob - PDF blob
 * @param {string} filename - Filename
 */
export function downloadPDF(pdfBlob, filename) {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Helper to view the generated PDF in a new tab (Browser environment)
 * @param {Blob} pdfBlob - PDF blob
 */
export function viewPDF(pdfBlob) {
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

