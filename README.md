# IoT Project Dashboard

A modern dashboard for monitoring IoT sensor data with real-time updates, alerts, and analytics.

## Features

- 🌡️ Real-time sensor monitoring (Temperature, Humidity, Pressure)
- 📊 Interactive data visualization with charts
- ⚡ Real-time updates and alerts
- 🎨 Customizable units and themes
- 📱 Responsive design
- 🔔 Email and audio notifications
- 📈 Historical data analytics

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: Tamagui, Shadcn UI
- **State Management**: Zustand
- **Database**: Firestore
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Notifications**: Email, Audio alerts
- **Type Safety**: Zod

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/ahmed-abdat/iot-project-dashboard.git
   cd iot-project-dashboard
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Firebase configuration and other required variables.

4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                  # Next.js app directory
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and store
│   ├── stores/        # Zustand stores
│   └── utils/         # Helper functions
├── public/            # Static assets
└── types/             # TypeScript types
```

## Features in Detail

### Real-time Monitoring

- Live sensor data updates
- Customizable update intervals
- Quality indicators for sensor readings

### Alerts System

- Configurable alert thresholds
- Email notifications
- Audio alerts
- Alert history tracking

### Analytics

- Historical data visualization
- Trend analysis
- Data filtering and time ranges
- Unit conversion support

### Settings

- Temperature units (°C/°F)
- Pressure units (hPa/mmHg)
- Theme customization
- Notification preferences

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- ESP32 for sensor data collection
- Firebase for real-time database
- Next.js team for the amazing framework
- All contributors and supporters
