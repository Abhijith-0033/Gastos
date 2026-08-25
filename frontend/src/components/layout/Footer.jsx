import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 mt-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-black rounded flex-shrink-0" />
              <span className="font-semibold text-sm text-neutral-900">
                Gastos App Store
              </span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Curated, verified Android applications. Safe, transparent, and tested for performance.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-900 mb-3">
              Discover
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>
                <Link to="/" className="hover:text-black transition-colors">Featured Apps</Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-black transition-colors">Search Store</Link>
              </li>
              <li>
                <Link to="/category/finance" className="hover:text-black transition-colors">Finance Apps</Link>
              </li>
              <li>
                <Link to="/category/productivity" className="hover:text-black transition-colors">Productivity</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-900 mb-3">
              Developers
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>
                <Link to="/register" className="hover:text-black transition-colors">Join as Developer</Link>
              </li>
              <li>
                <Link to="/developer/dashboard" className="hover:text-black transition-colors">Developer Dashboard</Link>
              </li>
              <li>
                <Link to="/developer/submit" className="hover:text-black transition-colors">Submit APK</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-900 mb-3">
              About
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>
                <span className="text-neutral-600">100% Virus & Malware Free</span>
              </li>
              <li>
                <span>Manual Editorial Review</span>
              </li>
              <li>
                <span>Direct APK Downloads</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-100 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>© {new Date().getFullYear()} Gastos App Store. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with React, Vite & TailwindCSS
          </p>
        </div>
      </div>
    </footer>
  );
}
