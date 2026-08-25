import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { adminApi, getErrorMessage } from '../../utils/api';
import StarRating from '../../components/ui/StarRating';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AdminReviews() {
  const [filters, setFilters] = useState({ page: 1, status: '', rating: '', limit: 15 });
  const [activeRespondReview, setActiveRespondReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews-list', filters],
    queryFn: () => adminApi.reviews(filters),
    keepPreviousData: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateReviewStatus(id, status),
    onSuccess: () => {
      toast.success('Review status updated');
      queryClient.invalidateQueries(['admin-reviews-list']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteReview(id),
    onSuccess: () => {
      toast.success('Review deleted');
      queryClient.invalidateQueries(['admin-reviews-list']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const respondMutation = useMutation({
    mutationFn: () =>
      adminApi.respondToReview(activeRespondReview.id, responseText),
    onSuccess: () => {
      toast.success('Response posted');
      setActiveRespondReview(null);
      setResponseText('');
      queryClient.invalidateQueries(['admin-reviews-list']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reviews = data?.data?.reviews || [];
  const pagination = data?.data?.pagination;

  return (
    <>
      <Helmet>
        <title>Reviews Moderation — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Reviews Moderation
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {pagination?.total || 0} user reviews submitted across the store
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="input text-xs w-32"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
            </select>

            <select
              value={filters.rating}
              onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value, page: 1 }))}
              className="input text-xs w-28"
            >
              <option value="">All Stars</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Stars
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={r.app_icon}
                      alt={r.app_name}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                          {r.reviewer_name}
                        </span>
                        <StarRating rating={r.rating} size="sm" />
                        <Badge
                          variant={
                            r.status === 'approved'
                              ? 'approved'
                              : r.status === 'rejected' || r.status === 'flagged'
                              ? 'rejected'
                              : 'pending'
                          }
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        on <span className="font-medium text-primary">{r.app_name}</span> • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <button
                      onClick={() => {
                        setActiveRespondReview(r);
                        setResponseText(r.admin_response || '');
                      }}
                      className="text-primary hover:underline"
                    >
                      Reply
                    </button>

                    {r.status !== 'approved' && (
                      <>
                        <span className="text-slate-200">|</span>
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ id: r.id, status: 'approved' })
                          }
                          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:underline"
                        >
                          Approve
                        </button>
                      </>
                    )}

                    {r.status !== 'flagged' && (
                      <>
                        <span className="text-slate-200">|</span>
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ id: r.id, status: 'flagged' })
                          }
                          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:underline"
                        >
                          Flag
                        </button>
                      </>
                    )}

                    <span className="text-slate-200">|</span>
                    <button
                      onClick={() => {
                        if (confirm('Delete this review permanently?')) deleteMutation.mutate(r.id);
                      }}
                      className="text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {r.title && <h4 className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white">{r.title}</h4>}
                {r.body && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {r.body}
                  </p>
                )}

                {r.admin_response && (
                  <div className="bg-surface dark:bg-slate-700/40 p-3 rounded text-xs border border-slate-200 dark:border-slate-700">
                    <span className="font-medium text-primary block mb-0.5">Admin Response:</span>
                    <p className="text-slate-700 dark:text-slate-300">{r.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Pagination
          page={filters.page}
          totalPages={pagination?.totalPages || 1}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </div>

      {/* Respond Modal */}
      <Modal
        isOpen={Boolean(activeRespondReview)}
        onClose={() => setActiveRespondReview(null)}
        title={`Respond to ${activeRespondReview?.reviewer_name}'s review`}
      >
        <div className="space-y-4">
          <textarea
            rows={4}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-primary text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none"
            placeholder="Type official store response..."
          />
          <div className="flex gap-3">
            <button
              onClick={() => setActiveRespondReview(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => respondMutation.mutate()}
              disabled={respondMutation.isLoading || !responseText.trim()}
              className="btn-primary flex-1 font-medium"
            >
              Post Response
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
