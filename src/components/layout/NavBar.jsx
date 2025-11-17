import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const menuItems = [
  { label: 'Home', href: 'https://darecentre.in/' },
  { label: 'About', href: 'https://darecentre.in/about.html' },
  { label: 'Our Divisions', href: 'https://darecentre.in/division.html' },
  { label: 'Courses', href: 'https://darecentre.in/courses.html' },
  { label: 'Edukoot', href: 'https://darecentre.in/edukoot.html' },
  { label: 'Events', href: 'https://darecentre.in/event.html' },
  { label: 'Contact', href: 'https://darecentre.in/contact.html' },
];

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-0">
        <Link to="/" className="flex items-center gap-3">
          <img src="/assets/img/dare1.png" alt="Dare Centre" className="h-16 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary lg:hidden"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
        >
          <i className={`fa ${isOpen ? 'fa-times' : 'fa-bars'} text-lg`} aria-hidden="true" />
        </button>
        <div
          className={`absolute left-0 right-0 top-full origin-top bg-white px-6 pb-6 pt-4 shadow-lg transition-all duration-200 lg:static lg:block lg:w-auto lg:translate-y-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
            isOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 lg:scale-y-100 lg:opacity-100'
          }`}
        >
          <ul className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:text-primary"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `text-sm font-semibold uppercase tracking-wide transition ${
                    isActive ? 'text-primary' : 'text-slate-700 hover:text-primary'
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                Verify Certificate
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="hidden lg:flex">
          <img src="/assets/img/aicraaa.jpg" alt="AICRA" className="h-16 w-auto rounded" />
        </div>
      </nav>
    </div>
  );
};

export default NavBar;
