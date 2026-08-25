import { useState } from 'react';
import { ThumbsUp, CheckCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { reviewsApi } from '../../utils/api';
import StarRating from '../ui/StarRating';
import toast from 'react-hot-toast';

export default function ReviewCard({ review }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count || 0);
  const [votedHelpful, setVotedHelpful] = useState(false);

  const handleHelpful = async () => {
    if (votedHelpful) return;
    try {
      const res = await reviewsApi.markHelpful(review.id);
      setHelpfulCount(res.data.helpful_count);
      setVotedHelpful(true);
      toast.success('Thanks for your feedback!');
    } catch {
      toast.error('Could not record vote');
    }
  };

  const initial = review.reviewer_name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="card p-4 sm:p-5 hover:border-neutral-300 transition-colors">
      {/* Reviewer Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-black text-white font-medium text-xs flex items-center justify-center flex-shrink-0">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs sm:text-sm text-neutral-900">
                {review.reviewer_name}
              </span>
              {Boolean(review.is_verified_download) && (
                <span className="badge-approved text-[10px] py-0">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-[11px] text-neutral-400">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Body */}
      {review.title && (
        <h4 className="font-medium text-sm text-neutral-900 mb-1">
          {review.title}
        </h4>
      )}
      {review.body && (
        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
          {review.body}
        </p>
      )}
      {review.device_info && (
        <p className="text-[11px] text-neutral-400 mt-2 font-mono">
          Reviewed on {review.device_info}
        </p>
      )}

      {/* Helpful Action */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100">
        <button
          onClick={handleHelpful}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            votedHelpful ? 'text-black font-medium' : 'text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Helpful ({helpfulCount})</span>
        </button>
      </div>

      {/* Developer Response */}
      {review.admin_response && (
        <div className="mt-3.5 bg-neutral-50 rounded p-3 border-l-2 border-black">
          <p className="text-xs font-medium text-black flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Developer Response
          </p>
          <p className="text-xs text-neutral-700 leading-relaxed">
            {review.admin_response}
          </p>
        </div>
      )}
    </div>
  );
}
