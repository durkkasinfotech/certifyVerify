
const PageHeader = ({ title, subtitle }) => (
  <div
    className="relative overflow-hidden bg-[url('/assets/img/page-header.webp')] bg-cover bg-center"
  >
    <div className="bg-hero-overlay">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-3 py-12 text-center sm:px-4 sm:py-16 md:py-20">
        <h1 className="font-heading text-2xl font-semibold text-white sm:text-3xl md:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-white/80 sm:mt-4 sm:text-base md:text-lg">{subtitle}</p>
        ) : null}
      </div>
    </div>
  </div>
);

export default PageHeader;
