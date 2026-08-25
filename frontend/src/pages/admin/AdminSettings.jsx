import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Save } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../utils/api';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [form, setForm] = useState({
    store_name: 'Gastos App Store',
    store_tagline: 'Premium Android Apps, Carefully Reviewed',
    require_review_approval: 'false',
    max_apk_size_mb: '150',
    max_screenshots: '8',
    maintenance_mode: 'false',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.settings,
  });

  useEffect(() => {
    if (data?.data?.settings) {
      setForm((prev) => ({ ...prev, ...data.data.settings }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (settings) => adminApi.updateSettings(settings),
    onSuccess: () => toast.success('Store settings saved successfully!'),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Store Configuration — Admin</title>
      </Helmet>

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Store Global Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage system policies, submission limits, and store branding
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Store Branding Name
            </label>
            <input
              type="text"
              value={form.store_name}
              onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Store Tagline
            </label>
            <input
              type="text"
              value={form.store_tagline}
              onChange={(e) => setForm((f) => ({ ...f, store_tagline: e.target.value }))}
              className="input text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Max APK File Size (MB)
              </label>
              <input
                type="number"
                value={form.max_apk_size_mb}
                onChange={(e) => setForm((f) => ({ ...f, max_apk_size_mb: e.target.value }))}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Max Screenshots per Submission
              </label>
              <input
                type="number"
                value={form.max_screenshots}
                onChange={(e) => setForm((f) => ({ ...f, max_screenshots: e.target.value }))}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.require_review_approval === 'true'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, require_review_approval: String(e.target.checked) }))
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Moderate User Reviews (requires admin approval before reviews go live)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.maintenance_mode === 'true'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maintenance_mode: String(e.target.checked) }))
                }
                className="w-4 h-4 rounded text-danger focus:ring-danger"
              />
              <span className="text-xs font-medium text-danger">
                Enable Maintenance Mode (disables new submissions temporarily)
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="submit"
              disabled={saveMutation.isLoading}
              className="btn-primary h-9 px-5 font-medium"
            >
              {saveMutation.isLoading ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
