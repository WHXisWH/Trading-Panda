import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PandaLabPage } from "@/components/panda/lab/PandaLabPage";
import { isPandaLabEnabled } from "@/lib/pandaLab";

export const metadata = {
  title: "熊猫试装实验室 | TradingPanda",
  description: "无需铸造，调试 Canvas PNG 素材合成熊猫",
};

export default function PandaLabRoute() {
  if (!isPandaLabEnabled()) {
    notFound();
  }

  return (
    <PageContainer variant="wide" className="py-8">
      <PandaLabPage />
    </PageContainer>
  );
}
