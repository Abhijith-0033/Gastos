import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 Page Not Found — Gastos App Store</title>
      </Helmet>
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div className="card max-w-md w-full p-8">
          <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            404
          </h1>
          <h2 className="text-sm font-semibold text-neutral-700 mb-2">
            Page Not Found
          </h2>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Link to="/" className="btn-primary inline-flex items-center justify-center gap-2">
            <Home className="w-4 h-4" />
            <span>Return to Store Home</span>
          </Link>
        </div>
      </div>
    </>
  );
}
