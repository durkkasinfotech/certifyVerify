import { useParams } from 'react-router-dom';
import Footer from '../components/layout/Footer.jsx';
import NavBar from '../components/layout/NavBar.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import TopBar from '../components/layout/TopBar.jsx';
import VerifyCertificate from '../components/VerifyCertificate.jsx';

const convertLegacyHyphenToSlash = (value) => {
  if (!value || value.includes('/')) return value;
  const prefix = (import.meta.env.VITE_CERT_PREFIX ?? 'DARE/AIR/LP').split('/').length;
  let converted = '';
  let remaining = prefix;

  for (const char of value) {
    if (char === '-' && remaining > 0) {
      converted += '/';
      remaining -= 1;
    } else {
      converted += char;
    }
  }

  return converted;
};

const decodeCertificateParam = (param) => {
  if (!param) return '';

  try {
    const decoded = decodeURIComponent(param);
    if (decoded.includes('/')) {
      return decoded;
    }

    return convertLegacyHyphenToSlash(decoded);
  } catch (error) {
    return convertLegacyHyphenToSlash(param);
  }
};

const Verify = () => {
  const { certificateNo } = useParams();
  const initialCertificate = decodeCertificateParam(certificateNo);

  return (
    <div className="min-h-screen bg-light">
      <TopBar />
      <NavBar />
      <PageHeader
        title="Certificate Verification"
        subtitle="Verify the authenticity of your Dare Centre certificates using the certificate number or QR code."
      />

      <main className="mx-auto max-w-5xl px-4 py-16 lg:px-0">
        <VerifyCertificate initialCertificate={initialCertificate} />

        <section className="mt-16 grid gap-8 rounded-3xl bg-gradient-to-br from-white via-white to-slate-50/50 p-8 shadow-2xl ring-1 ring-slate-200/50 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-1.5">
              <i className="fa fa-info-circle text-primary" aria-hidden="true" />
              <span className="text-xs font-display font-semibold uppercase tracking-wider text-primary">Quick Guide</span>
            </div>
            <h3 className="font-heading text-3xl font-bold tracking-tight text-dark">How to Find Your Certificate Number</h3>
            <ul className="mt-6 space-y-4">
              <li className="group flex items-start gap-4 rounded-xl bg-white/60 p-4 transition-all duration-200 hover:bg-white/80 hover:shadow-md">
                <span className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary/80 text-sm font-display font-bold text-white shadow-lg">1</span>
                <span className="pt-2 text-base leading-relaxed text-slate-700">Check the bottom-right corner of your certificate for the unique identifier.</span>
              </li>
              <li className="group flex items-start gap-4 rounded-xl bg-white/60 p-4 transition-all duration-200 hover:bg-white/80 hover:shadow-md">
                <span className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary/80 text-sm font-display font-bold text-white shadow-lg">2</span>
                <span className="pt-2 text-base leading-relaxed text-slate-700">The code typically begins with <strong className="font-display font-semibold text-dark">DARE</strong> followed by the academic year.</span>
              </li>
              <li className="group flex items-start gap-4 rounded-xl bg-white/60 p-4 transition-all duration-200 hover:bg-white/80 hover:shadow-md">
                <span className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary/80 text-sm font-display font-bold text-white shadow-lg">3</span>
                <span className="pt-2 text-base leading-relaxed text-slate-700">Use the exact format including slashes, e.g. <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm font-semibold text-primary">DARE/AIR/LP/25-26-000</code>.</span>
              </li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/5 p-8 shadow-xl ring-1 ring-primary/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(40,120,235,0.1),transparent)]" />
            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5">
                <i className="fa fa-headset text-primary" aria-hidden="true" />
                <span className="text-xs font-display font-semibold uppercase tracking-wider text-primary">Support</span>
              </div>
              <h4 className="font-heading text-2xl font-bold text-primary">Need Help?</h4>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Contact Dare Centre support for assistance with certificate verification.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 rounded-xl bg-white/80 p-3 transition-all duration-200 hover:bg-white hover:shadow-md">
                  <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
                    <i className="fa fa-phone text-primary" aria-hidden="true" />
                  </div>
                  <a href="tel:+919080587177" className="font-display font-semibold text-primary transition-colors hover:text-primary/80">
                    +91 9080587177
                  </a>
                </li>
                <li className="flex items-center gap-3 rounded-xl bg-white/80 p-3 transition-all duration-200 hover:bg-white hover:shadow-md">
                  <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
                    <i className="fa fa-envelope text-primary" aria-hidden="true" />
                  </div>
                  <a href="mailto:learn@darecentre.in" className="font-display font-semibold text-primary transition-colors hover:text-primary/80">
                    learn@darecentre.in
                  </a>
                </li>
              </ul>
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-white to-slate-50/50 p-5 text-center shadow-lg ring-1 ring-slate-200/50">
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-slate-600">Sample format</p>
                <p className="mt-3 font-mono text-xl font-bold text-secondary">DARE/AIR/LP/25-26-000</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Verify;
