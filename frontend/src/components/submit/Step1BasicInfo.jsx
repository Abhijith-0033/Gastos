import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { authApi } from '../../utils/api';
import Spinner from '../ui/Spinner';

const CATEGORIES = [
  'Finance',
  'Productivity',
  'Tools',
  'Education',
  'Health',
  'Entertainment',
  'Games',
  'Social',
  'Shopping',
  'Travel',
];
const CONTENT_RATINGS = ['Everyone', '12+', '16+', '18+'];
const ANDROID_VERSIONS = ['5.0', '6.0', '7.0', '8.0', '9.0', '10.0', '11.0', '12.0', '13.0', '14.0'];
const COMMON_TAGS = [
  'Finance',
  'Expense Tracker',
  'Budget',
  'India',
  'Offline',
  'UPI',
  'Productivity',
  'Calculator',
  'Utilities',
  'Dark Mode',
];

export default function Step1BasicInfo({ data, onChange, onNext }) {
  const [pkgStatus, setPkgStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!data.package_name || data.package_name.length < 5) {
      setPkgStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPkgStatus('checking');
      try {
        const res = await authApi.checkPackage(data.package_name);
        setPkgStatus(res.data.available ? 'available' : 'taken');
      } catch {
        setPkgStatus(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data.package_name]);

  const addTag = (tag) => {
    if (!data.tags.includes(tag) && data.tags.length < 10) {
      onChange({ tags: [...data.tags, tag] });
    }
  };

  const removeTag = (tag) => {
    onChange({ tags: data.tags.filter((t) => t !== tag) });
  };

  const validate = () => {
    const errs = {};
    if (!data.name?.trim()) errs.name = 'App name is required.';
    if (!data.package_name?.trim()) {
      errs.package_name = 'Package name is required.';
    } else if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(data.package_name)) {
      errs.package_name = 'Must follow Android format (e.g. com.developer.app)';
    } else if (pkgStatus === 'taken') {
      errs.package_name = 'This package name is already registered.';
    }
    if (!data.tagline?.trim()) errs.tagline = 'Tagline is required.';
    if (!data.category) errs.category = 'Please select a category.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="card space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-700/80 pb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Step 1: App Identity & Category
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          General information displayed to users across the store.
        </p>
      </div>

      {/* App Name */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          App Name *
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={`input ${errors.name ? 'border-danger' : ''}`}
          placeholder="e.g. Gastos Finance Tracker"
          maxLength={100}
        />
        {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
      </div>

      {/* Package Name */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Android Package Name *
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={data.package_name}
            onChange={(e) =>
              onChange({ package_name: e.target.value.toLowerCase().replace(/\s/g, '') })
            }
            className={`input pr-10 font-mono text-xs ${
              errors.package_name ? 'border-danger' : ''
            }`}
            placeholder="com.yourcompany.appname"
          />
          <div className="absolute right-3">
            {pkgStatus === 'checking' && <Spinner size="sm" />}
            {pkgStatus === 'available' && <CheckCircle className="w-4 h-4 text-success" />}
            {pkgStatus === 'taken' && <XCircle className="w-4 h-4 text-danger" />}
          </div>
        </div>
        {errors.package_name && (
          <p className="text-xs text-danger mt-1">{errors.package_name}</p>
        )}
        {pkgStatus === 'available' && (
          <p className="text-xs text-success mt-1">
            Package name is available!
          </p>
        )}
      </div>

      {/* Tagline */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            One-line Tagline *
          </label>
          <span className="text-[11px] text-slate-400">{data.tagline?.length || 0}/80</span>
        </div>
        <input
          type="text"
          value={data.tagline}
          onChange={(e) => onChange({ tagline: e.target.value })}
          className={`input ${errors.tagline ? 'border-danger' : ''}`}
          placeholder="e.g. Smart Indian Expense & Budget Tracker with Multi-Account"
          maxLength={80}
        />
        {errors.tagline && <p className="text-xs text-danger mt-1">{errors.tagline}</p>}
      </div>

      {/* Category & Content Rating */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Category *
          </label>
          <select
            value={data.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className={`input ${errors.category ? 'border-danger' : ''}`}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-danger mt-1">{errors.category}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Min Android Version
          </label>
          <select
            value={data.min_android_version}
            onChange={(e) => onChange({ min_android_version: e.target.value })}
            className="input"
          >
            {ANDROID_VERSIONS.map((v) => (
              <option key={v} value={v}>
                Android {v}+
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Rating Selection */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          Content Rating
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ content_rating: r })}
              className={`px-3 h-8 rounded text-xs font-medium transition-colors border ${
                data.content_rating === r
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          App Tags <span className="text-slate-400 font-normal">(up to 10)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {data.tags?.map((t) => (
            <span key={t} className="badge-info text-[11px] py-0.5">
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="hover:text-danger ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TAGS.filter((t) => !data.tags?.includes(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addTag(t)}
              className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              + {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
        <button onClick={handleNext} className="btn-primary">
          Next: Upload Media →
        </button>
      </div>
    </div>
  );
}
