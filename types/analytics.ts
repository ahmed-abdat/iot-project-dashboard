export interface ChartData {
  timestamp: string;
  time: Date;
  temperature: number | null;
  humidity: number | null;
  gasLevel: number | null;
  distance: number | null;
  errors: Record<string, boolean>;
}
