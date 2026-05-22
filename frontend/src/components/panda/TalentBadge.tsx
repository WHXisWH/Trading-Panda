import { talentMeta, hasTalent } from "@/lib/talent";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "clsx";

interface Props {
  talentId: number;
  size?: "sm" | "md";
  reveal?: boolean;
}

export function TalentBadge({ talentId, size = "md", reveal = false }: Props) {
  if (!hasTalent(talentId)) {
    return null;
  }
  const meta = talentMeta(talentId);
  const isRare = talentId <= 3;

  return (
    <Badge
      className={clsx(
        isRare && "animate-glow-pulse border-2 border-[var(--color-warning)]",
        reveal && "animate-spring-up",
        size === "sm" && "text-[10px]"
      )}
      color={isRare ? "var(--color-warning)" : "var(--color-accent)"}
    >
      🎋 {meta.name}
    </Badge>
  );
}
