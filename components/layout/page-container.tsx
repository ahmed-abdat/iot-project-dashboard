import { PageHeader } from "@/components/ui/page-header";

interface PageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PageContainer({
  title,
  description,
  children,
}: PageContainerProps) {
  return (
    <div className="flex-1 w-full min-h-screen">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <PageHeader title={title} description={description} />
        {children}
      </div>
    </div>
  );
}
