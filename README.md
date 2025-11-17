# Certificate Verification System

A React-based certificate verification system with QR code generation and verification capabilities, built with Vite and Supabase.

## Features

- 📋 Certificate management with Excel bulk upload
- 🔍 Certificate verification via QR code scanning
- 📱 QR code generation with name and registration number
- 🔐 Admin authentication
- 📊 Certificate listing and export (Excel/PDF)

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Supabase** - Backend and authentication
- **Tailwind CSS** - Styling
- **jsPDF** - PDF generation
- **XLSX** - Excel file handling
- **QRCode.react** - QR code generation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/durkkasinfotech/certifyVerify.git
cd certificate-verification
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CERT_PREFIX=DARE/AIR/LP
VITE_PUBLIC_SITE_URL=http://localhost:5173
```

4. Set up the database:
   - Run the SQL script in `database/schema.sql` in your Supabase SQL editor

5. Start the development server:
```bash
npm run dev
```

## Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub (already done)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository: `durkkasinfotech/certifyVerify`
5. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. Add Environment Variables in Vercel:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `VITE_CERT_PREFIX` - Certificate prefix (optional, default: DARE/AIR/LP)
   - `VITE_PUBLIC_SITE_URL` - Your Vercel deployment URL (optional, will auto-detect)

7. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Add environment variables:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_CERT_PREFIX
vercel env add VITE_PUBLIC_SITE_URL
```

5. Redeploy with environment variables:
```bash
vercel --prod
```

### Important Notes for Vercel

- The `vercel.json` file is already configured for SPA routing
- All routes will be served through `index.html` for client-side routing
- Environment variables prefixed with `VITE_` are exposed to the client-side code
- After deployment, update `VITE_PUBLIC_SITE_URL` with your Vercel domain for QR code generation

## Project Structure

```
certificate-verification/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── utils/           # Utility functions
│   └── main.jsx         # Entry point
├── database/            # Database schema
├── public/             # Static assets
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

Private project for Dare Centre
