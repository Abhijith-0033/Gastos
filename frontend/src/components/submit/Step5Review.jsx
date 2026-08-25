import { CheckSquare, Image, Package, Shield, Smartphone } from 'lucide-react';
import Spinner from '../ui/Spinner';

export default function Step5Review({ data, onChange, onBack, onSubmit, isSubmitting }) {
  const terms = [
    'This app does not contain malicious code, spyware, or harmful payloads.',
    'I hold all necessary rights and licenses for the intellectual property in this APK.',
    'The app complies with standard privacy, user consent, and legal regulations.',
  ];

  return (
    <div className="card space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-700/80 pb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Step 5: Review & Submit for Approval
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Verify your submission details before submitting to the editorial review team.
        </p>
      </div>

      {/* App Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded bg-surface dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
          {data.icon ? (
            <img
              src={URL.createObjectURL(data.icon)}
              alt="Icon"
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-600" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate text-slate-900 dark:text-white">
              {data.name}
            </h3>
            <p className="text-xs text-slate-400 font-mono truncate">{data.package_name}</p>
            <p className="text-[11px] font-medium text-primary mt-0.5">
              {data.category} • v{data.current_version}
            </p>
          </div>
        </div>

        <div className="p-4 rounded bg-surface dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Image className="w-3.5 h-3.5 text-primary" />
            <span>{data.screenshots?.length || 0} Screenshots Uploaded</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span>APK: {data.apk ? `${(data.apk.size / (1024 * 1024)).toFixed(1)} MB` : 'Missing'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>{data.permissions?.length || 0} Declared Permissions</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span>Requires Android {data.min_android_version}+</span>
          </div>
        </div>
      </div>

      {/* Tagline Preview */}
      <div className="p-4 rounded border border-slate-200 dark:border-slate-700">
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-400 block mb-1">
          Tagline
        </span>
        <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
          {data.tagline}
        </p>
      </div>

      {/* Terms and Declarations */}
      <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-3 bg-surface dark:bg-slate-800/50">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-900 dark:text-white">
          Developer Declarations
        </h4>
        <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          {terms.map((t, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <label className="flex items-center gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.agreedToTerms}
            onChange={(e) => onChange({ agreedToTerms: e.target.checked })}
            className="w-4 h-4 rounded text-primary focus:ring-primary"
          />
          <span className="text-xs font-medium text-slate-900 dark:text-white">
            I confirm and agree to all terms of publication
          </span>
        </label>
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !data.agreedToTerms}
          className="btn-primary flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              <span>Uploading & Submitting...</span>
            </>
          ) : (
            <span>Submit App for Review</span>
          )}
        </button>
      </div>
    </div>
  );
}
