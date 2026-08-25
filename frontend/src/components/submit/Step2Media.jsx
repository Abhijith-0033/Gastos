import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image, Film, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

function DropBox({ label, hint, file, onDrop, onRemove, accept, multiple = false }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    onDrop,
  });

  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      {file && !multiple ? (
        <div className="relative inline-block">
          <img
            src={URL.createObjectURL(file)}
            alt="Preview"
            className="w-28 h-28 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 bg-danger text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary-light dark:bg-blue-950/40'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <input {...getInputProps()} />
          <Image className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isDragActive ? 'Drop image here' : 'Click or drag image here'}
          </p>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      )}
    </div>
  );
}

export default function Step2Media({ data, onChange, onNext, onBack }) {
  const onDropIcon = useCallback(
    (files) => {
      if (files[0]) onChange({ icon: files[0] });
    },
    [onChange]
  );

  const onDropBanner = useCallback(
    (files) => {
      if (files[0]) onChange({ banner: files[0] });
    },
    [onChange]
  );

  const onDropScreenshots = useCallback(
    (files) => {
      const combined = [...(data.screenshots || []), ...files].slice(0, 8);
      onChange({ screenshots: combined });
    },
    [data.screenshots, onChange]
  );

  const onDropVideo = useCallback(
    (files) => {
      if (files[0]) onChange({ video: files[0] });
    },
    [onChange]
  );

  const removeScreenshot = (idx) => {
    const updated = data.screenshots.filter((_, i) => i !== idx);
    onChange({ screenshots: updated });
  };

  const validate = () => {
    if (!data.icon) {
      toast.error('App Icon is required.');
      return false;
    }
    if (!data.screenshots || data.screenshots.length < 2) {
      toast.error('At least 2 screenshots are required.');
      return false;
    }
    return true;
  };

  const imageAccept = { 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };
  const videoAccept = { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'] };

  return (
    <div className="card space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-700/80 pb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Step 2: App Media & Graphics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          High quality graphics attract downloads and pass editorial approval faster.
        </p>
      </div>

      {/* Icon Drop */}
      <DropBox
        label="App Icon * (PNG or JPG, 512×512 recommended)"
        hint="Square icon with transparent or solid background"
        file={data.icon}
        onDrop={onDropIcon}
        onRemove={() => onChange({ icon: null })}
        accept={imageAccept}
      />

      {/* Feature Banner Drop */}
      <DropBox
        label="Feature Banner (optional, 1024×500)"
        hint="Used in the store carousel spotlight"
        file={data.banner}
        onDrop={onDropBanner}
        onRemove={() => onChange({ banner: null })}
        accept={imageAccept}
      />

      {/* Screenshots */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Screenshots * <span className="text-slate-400 font-normal">(2 to 8 images)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {data.screenshots?.length || 0} / 8 uploaded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {data.screenshots?.map((file, idx) => (
            <div key={idx} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Screen ${idx + 1}`}
                className="w-full h-40 rounded object-cover border border-slate-200 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={() => removeScreenshot(idx)}
                className="absolute top-1.5 right-1.5 bg-danger text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="absolute bottom-1.5 left-1.5 bg-slate-900/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                #{idx + 1}
              </span>
            </div>
          ))}

          {(data.screenshots?.length || 0) < 8 && (
            <div
              {...useDropzone({
                accept: imageAccept,
                multiple: true,
                onDrop: onDropScreenshots,
              }).getRootProps()}
              className="h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-slate-300 text-center p-3 transition-colors"
            >
              <Plus className="w-5 h-5 text-slate-300 mb-1" />
              <span className="text-xs font-medium text-slate-400">Add Screenshots</span>
            </div>
          )}
        </div>
      </div>

      {/* Video */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          App Demo Video <span className="text-slate-400 font-normal">(optional, MP4 max 100MB)</span>
        </label>
        {data.video ? (
          <div className="flex items-center justify-between p-3 rounded border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
              <Film className="w-4 h-4 text-primary" />
              <span className="truncate">{data.video.name}</span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ video: null })}
              className="text-danger hover:text-red-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            {...useDropzone({ accept: videoAccept, onDrop: onDropVideo, multiple: false }).getRootProps()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded p-5 text-center cursor-pointer hover:border-slate-300 transition-colors"
          >
            <Film className="w-5 h-5 text-slate-300 mx-auto mb-1" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Upload App Preview Video
            </p>
          </div>
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
          Next: APK & Permissions →
        </button>
      </div>
    </div>
  );
}
