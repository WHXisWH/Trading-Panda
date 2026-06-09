import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PandaLabQaPage } from "@/components/panda/lab/PandaLabQaPage";
import { isPandaLabEnabled } from "@/lib/pandaLab";

export const metadata = {
  title: "Panda Lab 视觉验收 | TradingPanda",
  description: "内部视觉验收：Panda avatar 组合和小头像检查",
};

export default function PandaLabQaRoute() {
  if (!isPandaLabEnabled()) {
    notFound();
  }

  return (
    <PageContainer variant="wide" className="py-8">
      <PandaLabQaPage />
    </PageContainer>
  );
}

