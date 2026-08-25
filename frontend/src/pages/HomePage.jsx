import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { appsApi } from '../utils/api';
import HeroSection from '../components/home/HeroSection';
import FeaturedCarousel from '../components/home/FeaturedCarousel';
import CategoriesGrid from '../components/home/CategoriesGrid';
import AppSection from '../components/home/AppSection';
import AllAppsGrid from '../components/home/AllAppsGrid';

export default function HomePage() {
  const { data: featuredData } = useQuery({
    queryKey: ['featured'],
    queryFn: appsApi.featured,
  });

  const { data: newReleasesData } = useQuery({
    queryKey: ['new-releases'],
    queryFn: appsApi.newReleases,
  });

  const { data: topDownloadsData } = useQuery({
    queryKey: ['top-downloads'],
    queryFn: appsApi.topDownloads,
  });

  const { data: editorsChoiceData } = useQuery({
    queryKey: ['editors-choice'],
    queryFn: appsApi.editorsChoice,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: appsApi.categories,
  });

  return (
    <>
      <Helmet>
        <title>Gastos App Store — Verified Android Applications</title>
        <meta
          name="description"
          content="Download verified, offline-first Android apps. Experience Gastos expense tracker, finance managers, and smart tools."
        />
      </Helmet>

      {/* Hero */}
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Featured Spotlight Carousel */}
        <FeaturedCarousel apps={featuredData?.data?.apps || []} />

        {/* Categories Grid */}
        <CategoriesGrid categories={categoriesData?.data?.categories || []} />

        {/* Top Downloads */}
        <AppSection
          title="Top Downloaded Apps"
          subtitle="Most installed applications this month"
          apps={topDownloadsData?.data?.apps || []}
          showRank
        />

        {/* Editor's Choice */}
        {editorsChoiceData?.data?.apps?.length > 0 && (
          <AppSection
            title="Editor's Choice"
            subtitle="Hand-picked for exceptional design and usability"
            apps={editorsChoiceData.data.apps}
            badgeText="TOP PICK"
          />
        )}

        {/* New Releases */}
        <AppSection
          title="New Releases"
          subtitle="Recently published tools and updates"
          apps={newReleasesData?.data?.apps || []}
          badgeText="NEW"
        />

        {/* All Apps with Filters & Pagination */}
        <AllAppsGrid />
      </div>
    </>
  );
}
