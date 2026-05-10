import { talentMeta, hasTalent } from "@/lib/talent";
import { Badge } from "@/components/ui/Badge";

interface Props {
  talentId: number;
}

export function TalentBadge({ talentId }: Props) {
  if (!hasTalent(talentId)) {
    return <Badge className="text-ink-500 bg-ink-100">普通</Badge>;
  }
  const meta = talentMeta(talentId);
  return (
    <Badge color="#f0a500">
      {meta.emoji} {meta.name}
    </Badge>
  );
}
