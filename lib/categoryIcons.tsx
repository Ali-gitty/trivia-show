import { createElement } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  Calculator,
  Car,
  Clapperboard,
  Cpu,
  Drama,
  Dumbbell,
  Earth,
  Film,
  FlaskConical,
  Gamepad2,
  Globe2,
  Goal,
  Landmark,
  Lightbulb,
  MapPinned,
  Mic2,
  Mountain,
  Music2,
  Paintbrush,
  PawPrint,
  PersonStanding,
  Plane,
  Puzzle,
  Rocket,
  Shield,
  Sparkles,
  Timer,
  Tv,
  UtensilsCrossed,
  Wifi,
  Zap,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "التاريخ والحضارات": Landmark,
  "الجغرافيا وعجائب العالم": Mountain,
  العلوم: FlaskConical,
  الفضاء: Rocket,
  "جسم الإنسان": PersonStanding,
  "عالم الحيوان": PawPrint,
  أنمي: Sparkles,
  أفلام: Clapperboard,
  مسلسلات: Tv,
  "أفلام ديزني": Film,
  "أبطال خارقون": Shield,
  كرتون: Drama,
  "ألعاب فيديو": Gamepad2,
  تقنية: Cpu,
  إنترنت: Wifi,
  اختراعات: Lightbulb,
  "أدب عربي": BookOpen,
  "مدن العالم": Building2,
  سيارات: Car,
  طيران: Plane,
  "كرة القدم": Goal,
  "رياضات أخرى": Dumbbell,
  الطعام: UtensilsCrossed,
  "الثقافة العامة والأرقام الصادمة": Globe2,
  "الألغاز والمنطق وأسئلة الفخ": Puzzle,
  "حيوانات للأطفال": PawPrint,
  "حساب بسيط للأطفال": Calculator,
  "من حولنا للأطفال": Earth,
  "ارسم المشهد": Paintbrush,
  "اشرح بشكل مضحك": Mic2,
  "تمثيل صامت": Drama,
  "كلمات ممنوعة": Zap,
  "سرعة وبديهة": Timer,
  "ارتجال وإقناع": Sparkles,
  "توازن ومهارات": PersonStanding,
  "موسيقى وشارات": Music2,
  "رسم للأطفال": Paintbrush,
  "حركة للأطفال": Dumbbell,
};

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? MapPinned;
}

export function hasCategoryIcon(category: string) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, category);
}

export function CategoryLabel({
  category,
  className = "",
  iconClassName = "",
  size = 16,
  stacked = false,
}: {
  category: string;
  className?: string;
  iconClassName?: string;
  size?: number;
  stacked?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${stacked ? "flex-col gap-1 text-center" : ""} ${className}`}
    >
      {createElement(categoryIcon(category), {
        size,
        "aria-hidden": true,
        className: `shrink-0 ${iconClassName}`,
        strokeWidth: 2.4,
      })}
      <span>{category}</span>
    </span>
  );
}

export function CategoryIcon({
  category,
  size = 16,
  className = "",
  label = false,
}: {
  category: string;
  size?: number;
  className?: string;
  label?: boolean;
}) {
  return createElement(categoryIcon(category), {
    size,
    "aria-hidden": !label,
    "aria-label": label ? category : undefined,
    className: `shrink-0 ${className}`,
    strokeWidth: 2.4,
  });
}
