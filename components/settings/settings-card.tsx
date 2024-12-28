import { Card } from "@/components/ui/card";

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <Card className="border-none bg-background/95 shadow-none">
      <div className="p-6 space-y-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="space-y-6">{children}</div>
      </div>
    </Card>
  );
}
