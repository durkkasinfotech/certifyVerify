import * as XLSX from 'xlsx';

const EXPECTED_HEADERS = [
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
];

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

        const missingHeaders = EXPECTED_HEADERS.filter(
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

        const parsedRows = rows
          .filter((row) => row.some((cell) => `${cell}`.trim() !== ''))
          .map((row, index) => {
            const getValue = (header) => {
              const cell = row[headerIndex[header]];
              return typeof cell === 'string' ? cell.trim() : cell;
            };

            return {
              sno: getValue('sno') || index + 1,
              roll_no: getValue('roll_no'),
              name: getValue('name'),
              phone: `${getValue('phone') ?? ''}`.trim(),
              email: `${getValue('email') ?? ''}`.toLowerCase(),
              date_issued_raw: getValue('date_issued'),
              issued_by: getValue('issued_by'),
              mode: getValue('mode'),
              location_or_institution: getValue('location_or_institution'),
              certificate_no_raw: getValue('certificate_no'),
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
