import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { reviewsApi, getErrorMessage } from '../../utils/api';
import StarRating from '../ui/StarRating';
import Spinner from '../ui/Spinner';
import { CheckCircle, Send } from 'lucide-react';

export default function ReviewForm({ appSlug, onSuccess }) {
  const [form, setForm] = useState({
    reviewer_name: '',
    reviewer_email: '',
    rating: 5,
    title: '',
    body: '',
    device_info: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating || form.rating < 1) {
      toast.error('Please select a star rating.');
      return;
    }
    if (!form.reviewer_name.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await reviewsApi.submit(appSlug, form);
      setSubmitted(true);
      toast.success(res.data.message || 'Review submitted!');
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-green-50 rounded p-4 flex items-center gap-3 border border-green-200 my-4"
      >
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-xs text-green-900">
            Thank you for your review!
          </h4>
          <p className="text-[11px] text-green-700 mt-0.5">
            Your honest feedback helps millions of Android users make informed decisions.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded p-5 my-4">
      <h3 className="font-semibold text-xs uppercase tracking-[0.05em] text-neutral-900 mb-4">
        Rate & Review This App
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-[0.05em] mb-2">
            Your Rating *
          </label>
          <StarRating
            rating={form.rating}
            size="lg"
            interactive
            onRate={(r) => setForm((f) => ({ ...f, rating: r }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Your Name *</label>
            <input
              type="text"
              required
              value={form.reviewer_name}
              onChange={updateField('reviewer_name')}
              className="input text-xs"
              placeholder="e.g. Rahul Sharma"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Email <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={form.reviewer_email}
              onChange={updateField('reviewer_email')}
              className="input text-xs"
              placeholder="for developer response alerts"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Review Title</label>
          <input
            type="text"
            value={form.title}
            onChange={updateField('title')}
            className="input text-xs"
            placeholder="Sum up your experience in one sentence"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Detailed Review</label>
          <textarea
            rows={3}
            value={form.body}
            onChange={updateField('body')}
            className="w-full p-3 bg-white border border-neutral-200 rounded text-xs focus:outline-none focus:border-black text-neutral-900 placeholder-neutral-400 resize-none"
            placeholder="Tell us what you loved or how the app could improve..."
            maxLength={1000}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <input
            type="text"
            value={form.device_info}
            onChange={updateField('device_info')}
            className="input text-xs sm:max-w-xs"
            placeholder="Device model (e.g. OnePlus 12)"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary text-xs h-9 px-5 flex items-center justify-center gap-2"
          >
            {isLoading ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit Review</span>
          </button>
        </div>
      </form>
    </div>
  );
}
