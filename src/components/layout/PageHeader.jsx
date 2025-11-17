
const PageHeader = ({ title, subtitle }) => (
  <div
    className="relative overflow-hidden bg-[url('/assets/img/page-header.webp')] bg-cover bg-center"
  >
    <div className="bg-hero-overlay">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-heading text-4xl font-semibold text-white md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-base text-white/80 md:text-lg">{subtitle}</p>
        ) : null}
      </div>
    </div>
  </div>
);

export default PageHeader;
