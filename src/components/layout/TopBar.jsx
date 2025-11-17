const socialLinks = [
  {
    href: 'https://www.facebook.com/darecentreapk/',
    icon: 'fab fa-facebook-f',
    label: 'Facebook',
  },
  {
    href: 'https://x.com/darecentreapk',
    icon: 'fab fa-twitter',
    label: 'X',
  },
  {
    href: 'https://www.linkedin.com/company/darecentre/',
    icon: 'fab fa-linkedin-in',
    label: 'LinkedIn',
  },
  {
    href: 'https://www.instagram.com/darecentreapk',
    icon: 'fab fa-instagram',
    label: 'Instagram',
  },
  {
    href: 'https://youtube.com/@darecentreapk',
    icon: 'fab fa-youtube',
    label: 'YouTube',
  },
];

const TopBar = () => (
  <div className="bg-dark text-white text-sm">
    <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
        <a
          href="tel:+919080587177"
          className="inline-flex items-center gap-2 text-white transition hover:text-secondary"
        >
          <i className="fa fa-phone-alt" aria-hidden="true" />
          <span>+91 9080587177</span>
        </a>
        <span className="hidden text-white md:inline">|</span>
        <a
          href="mailto:learn@darecentre.in"
          className="inline-flex items-center gap-2 text-white transition hover:text-secondary"
        >
          <i className="fa fa-envelope" aria-hidden="true" />
          <span>learn@darecentre.in</span>
        </a>
      </div>
      <div className="flex items-center justify-center gap-3">
        {socialLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-white transition hover:text-secondary"
            aria-label={link.label}
          >
            <i className={link.icon} aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  </div>
);

export default TopBar;
