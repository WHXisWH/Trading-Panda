import { CheckCircle } from "lucide-react";
import { WHY_CHECKLIST, WHY_COPY } from "@/lib/landing/landingContent";

export function WhyNarrative() {
  const { headline, description } = WHY_COPY;

  return (
    <div>
      <h2 className="text-balance font-display text-[clamp(2rem,4.2vw,3.75rem)] font-black leading-[0.95] tracking-tight text-product-text">
        {headline.before}{" "}
        <span className="text-product-green">{headline.highlightA}</span> {headline.middle}{" "}
        <span className="text-product-green">{headline.highlightB}</span> {headline.tail}
      </h2>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-product-muted sm:text-lg">
        {description}
      </p>
      <ul className="mt-8 space-y-5 sm:space-y-6">
        {WHY_CHECKLIST.map((item) => (
          <li key={item.title} className="group flex items-start gap-4">
            <div className="rounded-full bg-product-green/10 p-2 transition-colors group-hover:bg-product-green/20">
              <CheckCircle className="h-6 w-6 shrink-0 text-product-green" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-product-text sm:text-lg">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-product-muted sm:text-base">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
