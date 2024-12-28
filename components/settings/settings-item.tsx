import { Label } from "@/components/ui/label";

interface SettingsItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsItem({
  label,
  description,
  children,
}: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
