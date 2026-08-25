import { Link } from 'react-router-dom';
import {
  Wallet, Zap, Wrench, BookOpen, Heart,
  Film, Gamepad2, Users, ShoppingBag, Plane, Grid
} from 'lucide-react';

const CATEGORY_ICONS = {
  Finance:       Wallet,
  Productivity:  Zap,
  Tools:         Wrench,
  Education:     BookOpen,
  Health:        Heart,
  Entertainment: Film,
  Games:         Gamepad2,
  Social:        Users,
  Shopping:      ShoppingBag,
  Travel:        Plane,
};

export default function CategoriesGrid({ categories = [] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-neutral-900">
          Browse by Category
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.name] || Grid;
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="bg-white border border-neutral-200 rounded p-4 text-center
                         hover:border-black hover:bg-neutral-50 transition-colors group"
            >
              <Icon className="w-5 h-5 text-neutral-500 mx-auto mb-2 group-hover:text-black transition-colors" />
              <span className="block font-medium text-xs text-neutral-900">{cat.name}</span>
              <span className="block text-[11px] text-neutral-400 mt-0.5">
                {cat.app_count || 0} app{cat.app_count !== 1 ? 's' : ''}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
