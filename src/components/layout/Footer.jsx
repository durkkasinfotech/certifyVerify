
const Footer = () => (
  <footer className="bg-dark text-white">
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-0">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h5 className="text-xl font-semibold text-primary">Dare Centre</h5>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Creating Effective Learners through innovative educational programs in AI,
            Robotics, Languages, and Digital Skills.
          </p>
        </div>
        <div>
          <h5 className="text-xl font-semibold text-primary">Quick Links</h5>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="https://darecentre.in/" className="transition hover:text-secondary">
                Home
              </a>
            </li>
            <li>
              <a href="https://darecentre.in/about.html" className="transition hover:text-secondary">
                About
              </a>
            </li>
            <li>
              <a href="https://darecentre.in/courses.html" className="transition hover:text-secondary">
                Courses
              </a>
            </li>
            <li>
              <a href="https://darecentre.in/contact.html" className="transition hover:text-secondary">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="text-xl font-semibold text-primary">Contact Info</h5>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <i className="fa fa-phone mt-0.5 text-secondary" aria-hidden="true" />
              <span>+91 9080587177</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fa fa-envelope mt-0.5 text-secondary" aria-hidden="true" />
              <span>learn@darecentre.in</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fa fa-map-marker-alt mt-0.5 text-secondary" aria-hidden="true" />
              <span>Aruppukottai, Tamilnadu</span>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="text-xl font-semibold text-primary">Follow Us</h5>
          <div className="mt-3 flex items-center gap-3 text-lg">
            <a
              href="https://www.facebook.com/darecentreapk/"
              className="transition hover:text-secondary"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f" aria-hidden="true" />
            </a>
            <a
              href="https://x.com/darecentreapk"
              className="transition hover:text-secondary"
              aria-label="X"
            >
              <i className="fab fa-twitter" aria-hidden="true" />
            </a>
            <a
              href="https://www.linkedin.com/company/darecentre/"
              className="transition hover:text-secondary"
              aria-label="LinkedIn"
            >
              <i className="fab fa-linkedin-in" aria-hidden="true" />
            </a>
            <a
              href="https://www.instagram.com/darecentreapk"
              className="transition hover:text-secondary"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/70">
        &copy; {new Date().getFullYear()} Dare Centre. All Rights Reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
