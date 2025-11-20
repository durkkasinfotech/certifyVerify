import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { certificateConfig } from '../config/certificateConfig';
import { makeCertificateNumber } from './certificateHelpers';

/**
 * Generate a certificate PDF by filling form fields
 * @param {Object} studentData - Student data object with name and other info
 * @param {string} certificateNo - Certificate number (if not provided, will be generated)
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generateCertificatePDF(studentData, certificateNo = null) {
    try {
        console.log('Starting certificate generation for:', studentData.name);

        // Validate required fields
        if (!studentData || !studentData.name) {
            throw new Error('Student name is required');
        }

        // Generate certificate number if not provided
        const finalCertNo = certificateNo || await generateCertificateNumber(studentData);

        // 1. Load the template
        // Use absolute URL in production to ensure proper static file serving
        // In development, use relative path; in production, use full URL
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const baseUrl = isProduction ? window.location.origin : '';
        const templatePath = `${baseUrl}${certificateConfig.templatePath}`;
        
        console.log('Loading PDF template from:', templatePath);
        
        const templateBytes = await fetch(templatePath, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf'
            },
            cache: 'default'
        }).then(async (res) => {
            if (!res.ok) {
                // Try to get more info about the error
                let errorText = '';
                try {
                    errorText = await res.text();
                } catch (e) {
                    // Ignore if can't read error text
                }
                
                throw new Error(
                    `Failed to load PDF template from ${certificateConfig.templatePath}. ` +
                    `Status: ${res.status} ${res.statusText}. ` +
                    (res.status === 404 ? `\nFile not found. Make sure the template file exists in public/templates/ folder. ` : '') +
                    (errorText.includes('<html') ? `\nGot HTML response (404 page). The file might not be deployed to production or path is incorrect. ` : '') +
                    `\nTried path: ${templatePath}`
                );
            }
            
            // Check if response is actually a PDF
            const contentType = res.headers.get('content-type');
            if (contentType && !contentType.includes('application/pdf')) {
                let errorText = '';
                try {
                    errorText = await res.text();
                } catch (e) {
                    // Ignore if can't read error text
                }
                
                throw new Error(
                    `Expected PDF file but got ${contentType}. ` +
                    `The file at ${certificateConfig.templatePath} might not exist or is not a valid PDF. ` +
                    (errorText.includes('<html') ? `\nGot HTML response (404 page). The file might not be deployed to production. ` : '') +
                    `Available files in public/templates/: certificate-template.pdf, testing.pdf` +
                    `\nTried path: ${templatePath}`
                );
            }
            
            const arrayBuffer = await res.arrayBuffer();
            
            // Validate PDF header (should start with %PDF)
            const uint8Array = new Uint8Array(arrayBuffer);
            const header = String.fromCharCode(...uint8Array.slice(0, 4));
            if (header !== '%PDF') {
                // If we got HTML or invalid content, log the first few bytes for debugging
                const preview = String.fromCharCode(...uint8Array.slice(0, 100));
                throw new Error(
                    `Invalid PDF file: The file at ${certificateConfig.templatePath} is not a valid PDF. ` +
                    `PDF files should start with "%PDF". ` +
                    `Got: "${preview.substring(0, 50)}..." ` +
                    `\nThis might be an HTML 404 page. Make sure the file exists in public/templates/ and is deployed to production. ` +
                    `Available files in public/templates/: certificate-template.pdf, testing.pdf` +
                    `\nTried path: ${templatePath}`
                );
            }
            
            return arrayBuffer;
        });

        // 2. Load PDF document
        const pdfDoc = await PDFDocument.load(templateBytes);
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
        console.log(`Total form fields found: ${fieldsList.length}`);

        // 3. Fill form fields or draw text directly
        const { fields } = certificateConfig;
        const hasFormFields = fieldsList.length > 0;

        if (hasFormFields) {
            // Method 1: Fill form fields using getTextField().setText()
            console.log('Using form fields to fill PDF...');
            
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

            // Flatten the form (removes editable fields and makes it read-only)
            form.flatten();
            console.log('✓ Form flattened');
        } else {
            // Method 2: Draw text directly on the PDF (when no form fields exist)
            console.log('No form fields found. Drawing text directly on PDF...');
            console.warn('⚠️  For better results, add form fields to your PDF template using Sejda.');
            console.warn('   Expected field names: "student_name" and "certificate_no"');
            
            // Embed fonts
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            
            const { width, height } = firstPage.getSize();
            console.log(`PDF page size: ${width} x ${height} points`);
            
            // Get text positions from config or use default positions
            // Handle null values properly - null means use default position
            // Increased spacing to prevent overlap
            const namePos = certificateConfig.textPositions?.studentName || {};
            const nameX = (namePos.x !== null && namePos.x !== undefined) ? namePos.x : (width / 2);
            // Position name higher (above center) to show above a line - adjust spacing based on font size
            const nameSize = (namePos.fontSize !== null && namePos.fontSize !== undefined) ? namePos.fontSize : 28;
            const nameY = (namePos.y !== null && namePos.y !== undefined) ? namePos.y : (height / 2 + 100);
            const nameAlign = namePos.align || 'center';
            
            const certNoPos = certificateConfig.textPositions?.certificateNumber || {};
            const certNoX = (certNoPos.x !== null && certNoPos.x !== undefined) ? certNoPos.x : (width / 2);
            const certNoSize = (certNoPos.fontSize !== null && certNoPos.fontSize !== undefined) ? certNoPos.fontSize : 14;
            // Position certificate number lower (below name) to prevent overlap
            const certNoY = (certNoPos.y !== null && certNoPos.y !== undefined) ? certNoPos.y : (height / 2 - 150);
            const certNoAlign = certNoPos.align || 'center';

            // Draw student name
            const nameValue = studentData.name ? studentData.name.toUpperCase() : '';
            if (nameValue) {
                const nameWidth = helveticaBold.widthOfTextAtSize(nameValue, nameSize);
                let nameXPos = nameX;
                if (nameAlign === 'center') {
                    nameXPos = nameX - (nameWidth / 2);
                } else if (nameAlign === 'right') {
                    nameXPos = nameX - nameWidth;
                }
                
                // Apply CSS-like padding and margin for fine-tuning position
                const namePaddingLeft = namePos.paddingLeft || 0;
                const namePaddingTop = namePos.paddingTop || 0;
                const nameMarginLeft = namePos.marginLeft || 0;
                const nameMarginTop = namePos.marginTop || 0;
                
                // Final position with padding and margin adjustments
                const nameFinalX = nameXPos + namePaddingLeft + nameMarginLeft;
                const nameFinalY = nameY + namePaddingTop + nameMarginTop;
                
                firstPage.drawText(nameValue, {
                    x: nameFinalX,
                    y: nameFinalY,
                    size: nameSize,
                    font: helveticaBold,
                    color: rgb(0, 0, 0),
                });
                console.log(`✓ Drew student name "${nameValue}" at (${nameFinalX.toFixed(2)}, ${nameFinalY.toFixed(2)})`);
                if (namePaddingLeft !== 0 || namePaddingTop !== 0 || nameMarginLeft !== 0 || nameMarginTop !== 0) {
                    console.log(`  Position adjusted with padding: (${namePaddingLeft}, ${namePaddingTop}), margin: (${nameMarginLeft}, ${nameMarginTop})`);
                }
            }

            // Draw certificate number
            if (finalCertNo) {
                // Use font from config (default to Helvetica-Bold for better appearance)
                const certNoFontFamily = certNoPos.fontFamily || 'Helvetica-Bold';
                const certNoFont = certNoFontFamily === 'Helvetica-Bold' ? helveticaBold : helvetica;
                
                const certNoWidth = certNoFont.widthOfTextAtSize(finalCertNo, certNoSize);
                let certNoXPos = certNoX;
                if (certNoAlign === 'center') {
                    certNoXPos = certNoX - (certNoWidth / 2);
                } else if (certNoAlign === 'right') {
                    certNoXPos = certNoX - certNoWidth;
                }
                
                // Apply CSS-like padding and margin for fine-tuning position
                const paddingLeft = certNoPos.paddingLeft || 0;
                const paddingTop = certNoPos.paddingTop || 0;
                const marginLeft = certNoPos.marginLeft || 0;
                const marginTop = certNoPos.marginTop || 0;
                
                // Final position with padding and margin adjustments
                const finalX = certNoXPos + paddingLeft + marginLeft;
                const finalY = certNoY + paddingTop + marginTop;
                
                firstPage.drawText(finalCertNo, {
                    x: finalX,
                    y: finalY,
                    size: certNoSize,
                    font: certNoFont, // Using Helvetica-Bold for better appearance
                    color: rgb(0, 0, 0),
                });
                console.log(`✓ Drew certificate number "${finalCertNo}" at (${finalX.toFixed(2)}, ${finalY.toFixed(2)})`);
                console.log(`  Font: ${certNoFontFamily} (changed for better appearance)`);
                if (paddingLeft !== 0 || paddingTop !== 0 || marginLeft !== 0 || marginTop !== 0) {
                    console.log(`  Position adjusted with padding: (${paddingLeft}, ${paddingTop}), margin: (${marginLeft}, ${marginTop})`);
                }
            }
            
            console.log('⚠️  Note: Text positions may need adjustment. Edit textPositions in certificateConfig.js to customize.');
        }

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
            const { width: pageWidth, height: pageHeight } = firstPage.getSize();
            
            // Calculate QR code position (bottom center by default)
            let qrX, qrY;
            
            if (qrCode.x !== null && qrCode.x !== undefined) {
                qrX = qrCode.x;
            } else {
                // Center horizontally: (page width / 2) - (qr size / 2)
                qrX = (pageWidth / 2) - (qrCode.size / 2);
            }
            
            if (qrCode.y !== null && qrCode.y !== undefined) {
                qrY = qrCode.y;
            } else {
                // Bottom with margin: margin from bottom
                const bottomMargin = qrCode.bottomMargin || 50;
                qrY = bottomMargin;
            }
            
            // Apply CSS-like padding and margin for fine-tuning position
            const qrPaddingLeft = qrCode.paddingLeft || 0;
            const qrPaddingTop = qrCode.paddingTop || 0;
            const qrMarginLeft = qrCode.marginLeft || 0;
            const qrMarginTop = qrCode.marginTop || 0;
            
            // Final position with padding and margin adjustments
            const qrFinalX = qrX + qrPaddingLeft + qrMarginLeft;
            const qrFinalY = qrY + qrPaddingTop + qrMarginTop;
            
            firstPage.drawImage(qrImage, {
                x: qrFinalX,
                y: qrFinalY,
                width: qrCode.size,
                height: qrCode.size
            });
            console.log(`✓ QR code inserted at bottom center (${qrFinalX.toFixed(2)}, ${qrFinalY.toFixed(2)})`);
            console.log(`  Page size: ${pageWidth.toFixed(2)} x ${pageHeight.toFixed(2)} points`);
            console.log(`  QR size: ${qrCode.size} points`);
            if (qrPaddingLeft !== 0 || qrPaddingTop !== 0 || qrMarginLeft !== 0 || qrMarginTop !== 0) {
                console.log(`  Position adjusted with padding: (${qrPaddingLeft}, ${qrPaddingTop}), margin: (${qrMarginLeft}, ${qrMarginTop})`);
            }
        } catch (error) {
            console.warn('Failed to generate QR code:', error);
            // Continue without QR code - don't fail the entire generation
        }

        // 6. Save PDF
        const pdfBytes = await pdfDoc.save();
        console.log('✓ PDF generated successfully');
        
        // Return as Blob for browser compatibility
        return new Blob([pdfBytes], { type: 'application/pdf' });

    } catch (error) {
        console.error('Certificate Generation Error:', error);
        throw error;
    }
}

/**
 * Generate a unique certificate number for a student
 * @param {Object} studentData - Student data
 * @returns {Promise<string>} Certificate number
 */
async function generateCertificateNumber(studentData) {
    // Generate certificate number using sequential format
    // Extract sequence from roll_no (last 3 digits) or use database sequence
    const prefix = certificateConfig.certificatePrefix || 'DARE/AIR/LP';
    const yearSegment = certificateConfig.yearSegment || '25-26';
    
    let sequence;
    if (studentData.roll_no) {
        // Extract last 3 digits from roll_no (e.g., 25002 -> 002)
        const rollNoStr = String(studentData.roll_no);
        const last3Digits = rollNoStr.slice(-3); // Get last 3 digits
        sequence = Number.parseInt(last3Digits, 10) || 1;
    } else {
        // Fallback: use database sequence or random
        sequence = Math.floor(Math.random() * 1000);
    }
    
    return makeCertificateNumber(sequence, yearSegment, prefix);
}

/**
 * Save PDF bytes to a file (Node.js environment)
 * @param {Uint8Array} pdfBytes - PDF bytes
 * @param {string} filePath - File path to save
 * @param {Object} fs - Node.js fs module (must be imported)
 */
export async function savePDFToFile(pdfBytes, filePath, fs) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, pdfBytes, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(filePath);
            }
        });
    });
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
