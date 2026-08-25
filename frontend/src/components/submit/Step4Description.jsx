import { useState } from 'react';
import { Eye, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

function renderMarkdown(text = '') {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-5 space-y-1">$1</ul>')
    .replace(/\n/g, '<br />');
}

export default function Step4Description({ data, onChange, onNext, onBack }) {
  const [isPreview, setIsPreview] = useState(false);

  const validate = () => {
    if (!data.description?.trim() || data.description.trim().length < 50) {
      toast.error('Description must be at least 50 characters long.');
      return false;
    }
    return true;
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Step 4: Detailed App Description
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tell users and reviewers everything about your app.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPreview((p) => !p)}
          className="btn-secondary text-xs h-8 px-3 flex items-center gap-1.5"
        >
          {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isPreview ? 'Edit' : 'Preview'}</span>
        </button>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Description * <span className="text-slate-400 font-normal">(Markdown supported)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {data.description?.length || 0} characters
          </span>
        </div>

        {isPreview ? (
          <div
            className="p-5 rounded border border-slate-200 dark:border-slate-700 min-h-[250px] text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-surface dark:bg-slate-800/50"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(data.description) }}
          />
        ) : (
          <textarea
            rows={10}
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs sm:text-sm focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono"
            placeholder={`Describe your app in detail. Example:

Gastos is India's premier offline-first expense tracker and budgeting app.

**Key Features:**
• Multi-Account Balance Tracking (Bank, Cash, UPI)
• Monthly category-wise budgets with proactive alerts
• EMI and loan schedule tracker
• Visual charts and spending breakdown`}
          />
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (validate()) onNext();
          }}
          className="btn-primary"
        >
          Next: Review & Submit →
        </button>
      </div>
    </div>
  );
}
