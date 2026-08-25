import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  Pause,
  Star,
  Trophy,
  ShieldCheck,
  HardDrive,
  Globe,
  Camera,
  MapPin,
  Mic,
  Users,
  Zap,
} from 'lucide-react';
import { adminApi, getErrorMessage } from '../../utils/api';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const REJECTION_REASONS = [
  'Insufficient description or missing core details',
  'Screenshots do not represent actual application functionality',
  'Broken APK package or app crashes on launch',
  'Potential security / copyright policy violation',
  'Excessive or unjustified system permissions requested',
  'Content rating mismatch',
  'Other custom feedback (specify below)',
];

const PERMISSION_ICONS = {
  INTERNET: Globe,
  CAMERA: Camera,
  STORAGE: HardDrive,
  READ_EXTERNAL_STORAGE: HardDrive,
  WRITE_EXTERNAL_STORAGE: HardDrive,
  LOCATION: MapPin,
  ACCESS_FINE_LOCATION: MapPin,
  MICROPHONE: Mic,
  RECORD_AUDIO: Mic,
  CONTACTS: Users,
  READ_CONTACTS: Users,
  VIBRATE: Zap,
};

function formatBytes(bytes) {
  if (!bytes) return '–';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export default function AdminAppReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [adminNotes, setAdminNotes] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReasonText, setCustomReasonText] = useState('');

  const [checklist, setChecklist] = useState({
    icon: false,
    screenshots: false,
    description: false,
    apk: false,
    permissions: false,
    rating: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-app-detail', id],
    queryFn: () => adminApi.appDetail(id),
  });

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveApp(id, { notes: adminNotes }),
    onSuccess: () => {
      toast.success('App approved and published to store!');
      queryClient.invalidateQueries(['admin-pending-apps']);
      navigate('/admin/apps/pending');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      const reason =
        selectedReason === 'Other custom feedback (specify below)'
          ? customReasonText
          : selectedReason;
      return adminApi.rejectApp(id, { notes: reason });
    },
    onSuccess: () => {
      toast.success('App rejected and developer notified.');
      queryClient.invalidateQueries(['admin-pending-apps']);
      navigate('/admin/apps/pending');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const featureMutation = useMutation({
    mutationFn: () => adminApi.featureApp(id),
    onSuccess: (res) => {
      toast.success(res.data.is_featured ? 'App featured in spotlight!' : 'App unfeatured');
      queryClient.invalidateQueries(['admin-app-detail', id]);
    },
  });

  const editorsMutation = useMutation({
    mutationFn: () => adminApi.editorsChoice(id),
    onSuccess: (res) => {
      toast.success(res.data.is_editors_choice ? "Added to Editor's Choice!" : "Removed from Editor's Choice");
      queryClient.invalidateQueries(['admin-app-detail', id]);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendApp(id, { notes: adminNotes || 'Suspended by admin' }),
    onSuccess: () => {
      toast.success('App suspended');
      queryClient.invalidateQueries(['admin-app-detail', id]);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const { app, screenshots = [], permissions = [] } = data?.data || {};
  if (!app) return <div className="p-8 text-center text-neutral-400">App record not found</div>;

  const downloadUrl = `${import.meta.env.VITE_API_URL || '/api/v1'}/apps/${app.slug}/download`;

  const handleConfirmReject = () => {
    const reason =
      selectedReason === 'Other custom feedback (specify below)'
        ? customReasonText
        : selectedReason;
    if (!reason?.trim()) {
      toast.error('Please specify a rejection reason.');
      return;
    }
    rejectMutation.mutate();
  };

  return (
    <>
      <Helmet>
        <title>Review: {app.name} — Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Navigation & Status Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin/apps/pending"
            className="text-xs font-medium text-neutral-500 hover:text-black transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Pending Apps</span>
          </Link>
          <Badge
            variant={
              app.status === 'approved'
                ? 'approved'
                : app.status === 'rejected'
                ? 'rejected'
                : 'pending'
            }
          >
            {app.status.toUpperCase()}
          </Badge>
        </div>

        {/* 2-Column Review Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: App Inspection (65%) */}
          <div className="flex-1 min-w-0 space-y-6 w-full">
            {/* App Profile */}
            <div className="card p-6 flex flex-col sm:flex-row items-start gap-4">
              <img
                src={app.icon_url}
                alt={app.name}
                className="w-20 h-20 rounded-xl object-cover border border-neutral-200 bg-white flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-neutral-900">
                    {app.name}
                  </h1>
                  <span className="badge-category">{app.category}</span>
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">{app.package_name}</p>
                <p className="text-xs text-neutral-600 mt-2 font-medium">
                  {app.tagline}
                </p>
              </div>
            </div>

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div className="card p-6">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-3">
                  Submitted Screenshots ({screenshots.length})
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {screenshots.map((ss, idx) => (
                    <img
                      key={idx}
                      src={ss.url}
                      alt={`Screen ${idx + 1}`}
                      className="h-60 w-auto rounded object-cover border border-neutral-200 bg-white flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="card p-6">
              <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-3">
                App Description
              </h3>
              <div className="text-xs sm:text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {app.description}
              </div>
            </div>

            {/* APK Package Details */}
            <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-1">
                  APK Package Details
                </h3>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span>Version: v{app.current_version} ({app.version_code})</span>
                  <span>•</span>
                  <span>Size: {formatBytes(app.apk_size_bytes)}</span>
                  <span>•</span>
                  <span>Min Android: {app.min_android_version}+</span>
                </div>
              </div>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs h-8 px-3 font-medium flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>Download APK for Local Test</span>
              </a>
            </div>

            {/* Declared Permissions */}
            {permissions.length > 0 && (
              <div className="card p-6">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-3">
                  Permissions Declared ({permissions.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {permissions.map((p, idx) => {
                    const Icon = PERMISSION_ICONS[p.permission] || ShieldCheck;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded border flex items-center gap-2.5 text-xs ${
                          p.is_dangerous
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-neutral-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-black flex-shrink-0" />
                        <span className="font-medium">{p.permission}</span>
                        {Boolean(p.is_dangerous) && (
                          <span className="badge badge-yellow text-[10px] ml-auto py-0">Sensitive</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Editorial Actions & Checklist (35%) */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4 lg:sticky lg:top-20">
            {/* Developer Metadata */}
            <div className="card p-5 space-y-2 text-xs">
              <h4 className="font-semibold uppercase tracking-[0.05em] text-neutral-400 text-[11px] mb-3">
                Developer Info
              </h4>
              <div className="flex justify-between">
                <span className="text-neutral-400">Studio / Author:</span>
                <span className="font-medium text-neutral-900 truncate ml-2">
                  {app.developer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Contact Email:</span>
                <span className="font-mono text-black truncate ml-2">{app.developer_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Submitted At:</span>
                <span className="text-neutral-700">{new Date(app.submitted_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Editorial Checklist */}
            <div className="card p-5 space-y-2">
              <h4 className="font-semibold uppercase tracking-[0.05em] text-neutral-400 text-[11px] mb-3">
                Editorial Review Checklist
              </h4>
              {[
                { key: 'icon', label: 'Icon 512×512 without ads/badges' },
                { key: 'screenshots', label: 'Screenshots accurately reflect app' },
                { key: 'description', label: 'Clear description of functionality' },
                { key: 'apk', label: 'APK is signed and verified safe' },
                { key: 'permissions', label: 'Permissions are justified' },
                { key: 'rating', label: 'Content rating is appropriate' },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 rounded mt-0.5 text-black"
                  />
                  <span className={checklist[item.key] ? 'line-through text-neutral-400' : 'text-neutral-700'}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="card p-5 space-y-2.5">
              {app.status !== 'approved' && (
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve & Publish Live</span>
                </button>
              )}

              {app.status === 'pending' && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="w-full btn-danger flex items-center justify-center gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Submission</span>
                </button>
              )}

              {app.status === 'approved' && (
                <>
                  <button
                    onClick={() => featureMutation.mutate()}
                    className={`w-full h-9 rounded font-medium text-xs flex items-center justify-center gap-2 border transition-all ${
                      app.is_featured
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'border-neutral-200 text-neutral-600 hover:border-amber-400 hover:text-amber-600'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${app.is_featured ? 'fill-current' : ''}`} />
                    <span>{app.is_featured ? 'Unfeature in Spotlight' : 'Feature in Spotlight'}</span>
                  </button>

                  <button
                    onClick={() => editorsMutation.mutate()}
                    className={`w-full h-9 rounded font-medium text-xs flex items-center justify-center gap-2 border transition-all ${
                      app.is_editors_choice
                        ? 'bg-neutral-100 text-neutral-900 border-neutral-300'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>{app.is_editors_choice ? "Remove Editor's Choice" : "Set Editor's Choice"}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Suspend ${app.name}? It will be hidden from the store.`)) {
                        suspendMutation.mutate();
                      }
                    }}
                    className="w-full h-9 rounded font-medium text-xs text-neutral-500 hover:text-danger hover:bg-red-50 border border-neutral-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Suspend App</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── APPROVE CONFIRMATION MODAL ── */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Application">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-base text-neutral-900">
            Publish "{app.name}" to Gastos App Store?
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The application will immediately become discoverable and downloadable by all users. The developer will receive an approval confirmation email.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => setShowApproveModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => {
                approveMutation.mutate();
                setShowApproveModal(false);
              }}
              disabled={approveMutation.isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {approveMutation.isLoading ? <Spinner size="sm" /> : null}
              <span>Confirm & Publish</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── REJECT MODAL ── */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Application">
        <div className="space-y-4">
          <p className="text-xs text-neutral-400">
            Select an actionable rejection reason. The developer will receive this feedback via email to fix and re-submit.
          </p>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Reason Category *</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="input text-xs"
            >
              <option value="">Select reason...</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Reviewer Notes / Guidance *
            </label>
            <textarea
              rows={4}
              value={customReasonText}
              onChange={(e) => setCustomReasonText(e.target.value)}
              className="w-full p-3 bg-white border border-neutral-200 rounded text-xs focus:outline-none focus:border-black text-neutral-900 placeholder-neutral-400 resize-none"
              placeholder="Detail specific instructions on what must be resolved..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={rejectMutation.isLoading}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
            >
              {rejectMutation.isLoading ? <Spinner size="sm" /> : <XCircle className="w-4 h-4" />}
              <span>Send Rejection</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
