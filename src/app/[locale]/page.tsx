import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { HeroKpis } from "@/components/dashboard/HeroKpis";
import { SnapshotStats } from "@/components/dashboard/SnapshotStats";
import { FunnelSection } from "@/components/dashboard/FunnelSection";
import { TrendSection } from "@/components/dashboard/TrendSection";
import { MetricsLegend } from "@/components/dashboard/MetricsLegend";
import { BookedCallsSection } from "@/components/dashboard/BookedCallsSection";
import { LeadsPhasesSection } from "@/components/dashboard/LeadsPhasesSection";
import { ClientPhasesSection } from "@/components/dashboard/ClientPhasesSection";
import { parseRange } from "@/lib/date-range";

interface DashboardPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const t = await getTranslations("tabs");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">{t("dashboard")}</TabsTrigger>
          <TabsTrigger value="pipeline">{t("pipeline")}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <Suspense fallback={<SnapshotSkeleton />}>
            <SnapshotStats />
          </Suspense>

          <Separator />

          <DateRangePicker />

          <Suspense fallback={<HeroSkeleton />}>
            <HeroKpis range={range} />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <FunnelSection range={range} />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <BookedCallsSection range={range} />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <TrendSection range={range} />
          </Suspense>

          <MetricsLegend />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <LeadsPhasesSection />
          </Suspense>

          <Separator />

          <Suspense fallback={<SectionSkeleton />}>
            <ClientPhasesSection />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </section>
  );
}

function SnapshotSkeleton() {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </section>
  );
}

function SectionSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-48 w-full" />
    </section>
  );
}
