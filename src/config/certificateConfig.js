export const certificateConfig = {
    // Path to your fillable PDF template (must be in public/templates/)
    // IMPORTANT: Use a filename without spaces for better production compatibility
    // Production-friendly filename (no spaces) for Vercel deployment
    templatePath: '/templates/certificate-template.pdf', // Using certificate-template.pdf (production-safe filename)

    // Form field names (must match exactly what you set in the PDF using Sejda)
    fields: {
        studentName: 'student_name',
        certificateNumber: 'certificate_no',
    },

    // QR Code position - adjust these coordinates as needed
    // Coordinates are in PDF points (72 points = 1 inch)
    // Bottom-left corner is (0, 0)
    // null values = auto-calculate (center horizontally, bottom vertically)
    qrCode: {
        x: null,        // null = center horizontally (auto-calculated)
        y: null,        // null = bottom with margin (auto-calculated)
        size: 100,      // QR code size in points
        bottomMargin: 50, // Distance from bottom in points (used when y is null)
        // CSS-like positioning - move relative to base position
        paddingLeft: 0,    // Move right (positive) or left (negative) - in points
        paddingTop: 10,     // Move up (positive) or down (negative) - in points
        marginLeft: 0,     // Additional left spacing - in points
        marginTop: 0       // Additional top spacing - in points
    },

    // Certificate number prefix and format
    certificatePrefix: 'DARE/AIR/LP',
    
    // Year segment for certificate numbers (e.g., 25-26 for 2025-2026)
    yearSegment: '25-26',
    
    // Verify URL base (for QR codes)
    // Actual website URL for certificate verification
    verifyBaseUrl: 'https://cv.darecentre.in/verify',
    
    // Text positions (used when PDF has no form fields)
    // PDF coordinates: (0,0) is bottom-left corner
    // Adjust these values based on your PDF template size
    // For A4 size (595 x 842 points), typical positions:
    textPositions: {
        studentName: {
            x: null,        // null = center horizontally (auto-calculated)
            y: null,        // null = center vertically + 100 (auto-calculated to show above line)
            fontSize: 28,   // Font size in points (increased for better visibility)
            align: 'center', // 'center', 'left', or 'right'
            // CSS-like positioning - move relative to base position
            paddingLeft: 0,    // Move right (positive) or left (negative) - in points
            paddingTop: 10,     // Move up (positive) or down (negative) - in points
            marginLeft: 0,     // Additional left spacing - in points
            marginTop: 0       // Additional top spacing - in points
        },
        certificateNumber: {
            x: null,        // null = center horizontally (auto-calculated)
            y: null,        // null = center vertically - 150 (auto-calculated, below name)
            fontSize: 14,   // Font size in points
            align: 'right', // 'center', 'left', or 'right'
            // Font settings - using regular font (not bold)
            fontFamily: 'Helvetica', // Font family - 'Helvetica' (regular, not bold)
            // CSS-like positioning - move relative to base position
            paddingLeft: -5,    // Move right (positive) or left (negative) - in points
            paddingTop: -10,     // Move up (positive) or down (negative) - in points
            marginLeft: 0,     // Additional left spacing - in points
            marginTop: 0       // Additional top spacing - in points
        }
    }
};

export function formatCertificateDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}
