export interface ChartData {
  timestamp: string;
  time: Date;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  distance: number | null;
  errors: {
    temperature: boolean;
    humidity: boolean;
    pressure: boolean;
    distance: boolean;
  };
} 