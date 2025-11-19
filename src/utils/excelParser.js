import * as XLSX from 'xlsx';

// Required headers for parsing
const REQUIRED_HEADERS = ['name', 'date_issued'];

// All possible headers (flexible parsing) - for reference only
// The parser will handle various header name variations

const normaliseHeader = (value) =>
  `${value}`.trim().toLowerCase().replace(/\s+/g, '_');

export const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result ?? new ArrayBuffer(0));
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!json.length) {
          reject(new Error('The selected file has no data.'));
          return;
        }

        const [headerRow, ...rows] = json;
        const normalizedHeaders = headerRow.map(normaliseHeader);

        // Check for required headers
        const normalizedRequired = REQUIRED_HEADERS.map(normaliseHeader);
        const missingHeaders = normalizedRequired.filter(
          (header) => !normalizedHeaders.includes(header)
        );

        if (missingHeaders.length) {
          reject(
            new Error(
              `The uploaded file is missing required columns: ${missingHeaders.join(', ')}.`
            )
          );
          return;
        }

        const headerIndex = Object.fromEntries(
          normalizedHeaders.map((header, index) => [header, index])
        );

        // Helper to get value with multiple possible header names
        const getValueByAliases = (row, aliases) => {
          for (const alias of aliases) {
            const index = headerIndex[alias];
            if (index !== undefined && row[index] !== undefined && row[index] !== '') {
              const cell = row[index];
              return typeof cell === 'string' ? cell.trim() : cell;
            }
          }
          return '';
        };

        const parsedRows = rows
          .filter((row) => row.some((cell) => `${cell}`.trim() !== ''))
          .map((row, index) => {
            return {
              sno: getValueByAliases(row, ['s_no', 'sno']) || index + 1,
              roll_no: getValueByAliases(row, ['roll_no', 'roll_no']),
              name: getValueByAliases(row, ['name']),
              department: getValueByAliases(row, ['dep', 'department']),
              academic_year: getValueByAliases(row, ['year', 'academic_year']),
              location_or_institution: getValueByAliases(row, ['ins', 'location_or_institution']),
              location: getValueByAliases(row, ['location']),
              phone: `${getValueByAliases(row, ['phone_number', 'phone']) ?? ''}`.trim(),
              certificate_no_raw: getValueByAliases(row, ['certificate_number', 'certificate_no']),
              mode: getValueByAliases(row, ['mode']),
              issued_by: getValueByAliases(row, ['issued_by']),
              qr_code_url: getValueByAliases(row, ['qr_url', 'qr_code_url']),
              created_at: getValueByAliases(row, ['create_date', 'created_at']),
              email: `${getValueByAliases(row, ['email']) ?? ''}`.toLowerCase(),
              date_issued_raw: getValueByAliases(row, ['date_issued']),
            };
          });

        resolve(parsedRows);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = () => {
      reject(new Error('Failed to read the uploaded file. Please try again.'));
    };

    fileReader.readAsArrayBuffer(file);
  });

export const toExcelWorkbook = (records) => {
  const worksheetData = [
    [
      'sno',
      'roll_no',
      'name',
      'phone',
      'email',
      'date_issued',
      'issued_by',
      'mode',
      'location_or_institution',
      'certificate_no',
    ],
    ...records.map((record) => [
      record.sno ?? '',
      record.roll_no,
      record.name,
      record.phone,
      record.email,
      record.date_issued,
      record.issued_by,
      record.mode,
      record.location_or_institution,
      record.certificate_no,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates');
  return workbook;
};
