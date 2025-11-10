import { Card } from "@/components/ui/card";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
        <div className="h-8 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      </div>
    </Card>
  );
}
