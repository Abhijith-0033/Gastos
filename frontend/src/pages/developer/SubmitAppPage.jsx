import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { developerApi, getErrorMessage } from '../../utils/api';
import Step1BasicInfo from '../../components/submit/Step1BasicInfo';
import Step2Media from '../../components/submit/Step2Media';
import Step3AppFile from '../../components/submit/Step3AppFile';
import Step4Description from '../../components/submit/Step4Description';
import Step5Review from '../../components/submit/Step5Review';

const STEPS = [
  { label: 'Basic Info', pct: 20 },
  { label: 'Media', pct: 40 },
  { label: 'APK File', pct: 60 },
  { label: 'Description', pct: 80 },
  { label: 'Review', pct: 100 },
];

export default function SubmitAppPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    package_name: '',
    tagline: '',
    category: '',
    content_rating: 'Everyone',
    tags: [],
    min_android_version: '6.0',
    icon: null,
    banner: null,
    screenshots: [],
    video: null,
    current_version: '',
    version_code: '',
    whats_new: 'Initial release',
    apk: null,
    permissions: [],
    description: '',
    agreedToTerms: false,
  });

  const updateForm = (updates) => setFormData((f) => ({ ...f, ...updates }));

  const next = () => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!formData.agreedToTerms) {
      toast.error('You must agree to the developer terms.');
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();

    fd.append('name', formData.name);
    fd.append('package_name', formData.package_name);
    fd.append('tagline', formData.tagline);
    fd.append('description', formData.description);
    fd.append('category', formData.category);
    fd.append('content_rating', formData.content_rating);
    fd.append('current_version', formData.current_version);
    fd.append('version_code', formData.version_code);
    fd.append('min_android_version', formData.min_android_version);
    fd.append('whats_new', formData.whats_new);
    fd.append('tags', JSON.stringify(formData.tags));
    fd.append('permissions', JSON.stringify(formData.permissions));

    if (formData.icon) fd.append('icon', formData.icon);
    if (formData.banner) fd.append('banner', formData.banner);
    if (formData.apk) fd.append('apk', formData.apk);
    if (formData.video) fd.append('video', formData.video);
    (formData.screenshots || []).forEach((file) => fd.append('screenshots', file));

    try {
      const res = await developerApi.submitApp(fd);
      setSubmitted({ app_id: res.data.app_id, slug: res.data.slug });
      toast.success('App submitted successfully!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card text-center py-16 px-6 max-w-xl mx-auto space-y-3">
        <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-neutral-900">
          App Submitted for Review!
        </h2>
        <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
          Your submission is currently in the editorial queue. You will receive an email and in-app alert once review is complete.
        </p>
        <div className="pt-4 flex gap-3 justify-center">
          <button
            onClick={() => navigate('/developer/dashboard')}
            className="btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stepComponents = [
    <Step1BasicInfo data={formData} onChange={updateForm} onNext={next} />,
    <Step2Media data={formData} onChange={updateForm} onNext={next} onBack={prev} />,
    <Step3AppFile data={formData} onChange={updateForm} onNext={next} onBack={prev} />,
    <Step4Description data={formData} onChange={updateForm} onNext={next} onBack={prev} />,
    <Step5Review
      data={formData}
      onChange={updateForm}
      onBack={prev}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />,
  ];

  return (
    <>
      <Helmet>
        <title>Submit App — Developer Portal</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-neutral-900 mb-6">
          Submit New Android Application
        </h1>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  idx === currentStep
                    ? 'text-black'
                    : idx < currentStep
                    ? 'text-neutral-900'
                    : 'text-neutral-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                    idx < currentStep
                      ? 'bg-black text-white'
                      : idx === currentStep
                      ? 'bg-white border-2 border-black text-black'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>

          <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-black rounded-full"
              animate={{ width: `${STEPS[currentStep].pct}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        {/* Wizard Form View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {stepComponents[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
