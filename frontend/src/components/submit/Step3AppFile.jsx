import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Package, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const COMMON_PERMISSIONS = [
  { name: 'INTERNET', dangerous: false },
  { name: 'VIBRATE', dangerous: false },
  { name: 'RECEIVE_BOOT_COMPLETED', dangerous: false },
  { name: 'USE_BIOMETRIC', dangerous: false },
  { name: 'CAMERA', dangerous: true },
  { name: 'READ_EXTERNAL_STORAGE', dangerous: true },
  { name: 'WRITE_EXTERNAL_STORAGE', dangerous: true },
  { name: 'ACCESS_FINE_LOCATION', dangerous: true },
  { name: 'RECORD_AUDIO', dangerous: true },
  { name: 'READ_CONTACTS', dangerous: true },
];

export default function Step3AppFile({ data, onChange, onNext, onBack }) {
  const onDropApk = useCallback(
    (files) => {
      const file = files[0];
      if (file) {
        if (!file.name.toLowerCase().endsWith('.apk')) {
          toast.error('Only .apk files are supported.');
          return;
        }
        onChange({ apk: file });
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.android.package-archive': ['.apk'],
      'application/octet-stream': ['.apk'],
    },
    multiple: false,
    onDrop: onDropApk,
  });

  const addPermission = (permName, isDangerous = false) => {
    if (!data.permissions?.some((p) => p.permission === permName)) {
      const updated = [
        ...(data.permissions || []),
        { permission: permName, reason: '', is_dangerous: isDangerous },
      ];
      onChange({ permissions: updated });
    }
  };

  const removePermission = (index) => {
    const updated = data.permissions.filter((_, i) => i !== index);
    onChange({ permissions: updated });
  };

  const updatePermReason = (index, reason) => {
    const updated = data.permissions.map((p, i) =>
      i === index ? { ...p, reason } : p
    );
    onChange({ permissions: updated });
  };

  const validate = () => {
    if (!data.current_version?.trim()) {
      toast.error('Version name is required (e.g. 1.0.0).');
      return false;
    }
    if (!data.version_code || parseInt(data.version_code, 10) < 1) {
      toast.error('Version code must be a positive integer (e.g. 1).');
      return false;
    }
    if (!data.apk) {
      toast.error('APK binary package file is required.');
      return false;
    }
    return true;
  };

  return (
    <div className="card space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-700/80 pb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Step 3: APK Binary & App Permissions
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload your signed release APK and declare required system permissions.
        </p>
      </div>

      {/* Version Name and Version Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Version Name * <span className="text-slate-400 font-normal">(e.g. 1.0.0)</span>
          </label>
          <input
            type="text"
            value={data.current_version}
            onChange={(e) => onChange({ current_version: e.target.value })}
            className="input text-xs"
            placeholder="1.0.0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Version Code * <span className="text-slate-400 font-normal">(Integer, e.g. 1)</span>
          </label>
          <input
            type="number"
            value={data.version_code}
            onChange={(e) => onChange({ version_code: e.target.value })}
            className="input text-xs"
            placeholder="1"
            min="1"
          />
        </div>
      </div>

      {/* APK Dropzone */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          Signed APK Package * (Max 150MB)
        </label>
        {data.apk ? (
          <div className="flex items-center justify-between p-4 rounded border border-success-border dark:border-green-800 bg-success-bg dark:bg-green-950/20">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-success" />
              <div>
                <p className="font-medium text-xs sm:text-sm text-green-900 dark:text-green-100">
                  {data.apk.name}
                </p>
                <p className="text-[11px] text-green-700 dark:text-green-400">
                  {(data.apk.size / (1024 * 1024)).toFixed(1)} MB • Ready for upload
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ apk: null })}
              className="p-1 rounded text-danger hover:bg-danger-bg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary-light dark:bg-blue-950/40'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <input {...getInputProps()} />
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Drag and drop your signed .APK file here
            </p>
            <p className="text-xs text-slate-400 mt-1">or click to browse from device</p>
          </div>
        )}
      </div>

      {/* What's New */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Release Notes / What's New in this Build
        </label>
        <textarea
          rows={3}
          value={data.whats_new}
          onChange={(e) => onChange({ whats_new: e.target.value })}
          className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none"
          placeholder="e.g. Initial public release, fixed layout issues, added dark mode..."
        />
      </div>

      {/* Permissions Section */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          Declared Permissions
        </label>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {COMMON_PERMISSIONS.filter(
            (p) => !data.permissions?.some((dp) => dp.permission === p.name)
          ).map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => addPermission(p.name, p.dangerous)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-colors ${
                p.dangerous
                  ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
              }`}
            >
              + {p.name} {p.dangerous && '(Sensitive)'}
            </button>
          ))}
        </div>

        {/* Selected permissions */}
        <div className="space-y-2">
          {data.permissions?.map((p, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
                p.is_dangerous
                  ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {p.is_dangerous && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                <span>{p.permission}</span>
              </div>
              <input
                type="text"
                value={p.reason || ''}
                onChange={(e) => updatePermReason(idx, e.target.value)}
                placeholder="Reason / justification (optional)"
                className="input text-xs py-1 sm:max-w-xs"
              />
              <button
                type="button"
                onClick={() => removePermission(idx)}
                className="text-danger hover:text-red-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
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
          Next: Description →
        </button>
      </div>
    </div>
  );
}
