# 📊 Complete Data Structure Example

## 🏃‍♂️ **User Table (1 row per user)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "strava_id": 20683290,
  "email": "20683290@strava.local",
  "first_name": "Surendran",
  "last_name": "Balachandran", 
  "profile_medium": "https://lh3.googleusercontent.com/a/ACg8ocITUvmVEdIlH2sX4xA0r3zCOyaNUSZ5nj7F2dHmEpsx-fVoM4ehGA=s96-c",
  "access_token": "4c83f9a6a1bd4f9c038bc36dfa2e0c571b8ac63f",
  "refresh_token": "654b2dff29979ab3d4d0cf3d5467baab89b59dcf",
  "expires_at": 1749414175,
  "created_at": "2025-06-08T14:00:00Z",
  "updated_at": "2025-06-08T14:00:00Z"
}
```

## 🏃 **Activity Table (1 row per run)**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "strava_id": 1524888438,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Morning Run in Delhi",
  "distance": 5000.0,           // meters
  "moving_time": 1800,          // seconds (30 minutes)
  "elapsed_time": 1900,         // seconds
  "total_elevation_gain": 25.0, // meters
  "type": "Run",
  "start_date": "2025-06-01T06:00:00Z",
  "start_date_local": "2025-06-01T11:30:00Z",
  "timezone": "(GMT+05:30) Asia/Kolkata",
  "utc_offset": 19800.0,
  "start_latlng": [28.524344, 77.144915],  // [lat, lng]
  "end_latlng": [28.524904, 77.145065],
  "location_city": "New Delhi",
  "location_state": "Delhi",
  "location_country": "India",
  "achievement_count": 2,
  "kudos_count": 5,
  "comment_count": 1,
  "athlete_count": 1,
  "photo_count": 0,
  "average_speed": 2.78,        // m/s (10 km/h)
  "max_speed": 4.17,           // m/s (15 km/h)
  "average_heartrate": 145.5,   // BPM
  "max_heartrate": 165.0,      // BPM
  "suffer_score": 42,
  "created_at": "2025-06-08T14:00:00Z",
  "updated_at": "2025-06-08T14:00:00Z"
}
```

## 🌤️ **Weather Table (1 row per activity)**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "activity_id": "660e8400-e29b-41d4-a716-446655440001",
  "temperature": 28.5,          // Celsius
  "feels_like": 32.1,          // Celsius
  "humidity": 65,              // percentage
  "pressure": 1013,            // hPa
  "visibility": 10000,         // meters
  "wind_speed": 3.2,           // m/s
  "wind_deg": 180,             // degrees
  "weather_main": "Clear",
  "weather_description": "clear sky",
  "weather_icon": "01d",
  "clouds": 10,                // percentage
  "created_at": "2025-06-08T14:00:00Z"
}
```

## 🔗 **Complete Joined Data (What Analytics Will Use)**
```json
{
  "run": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Morning Run in Delhi",
    "date": "2025-06-01T11:30:00Z",
    "distance_km": 5.0,
    "duration_minutes": 30,
    "pace_min_per_km": "6:00",
    "avg_heart_rate": 145.5,
    "elevation_gain_m": 25.0,
    "location": "New Delhi, Delhi, India"
  },
  "weather": {
    "temperature": 28.5,
    "feels_like": 32.1,
    "humidity": 65,
    "condition": "Clear",
    "description": "clear sky",
    "wind_speed": 3.2,
    "icon": "01d"
  },
  "performance": {
    "avg_speed_kmh": 10.0,
    "max_speed_kmh": 15.0,
    "suffer_score": 42,
    "kudos": 5
  }
}
```

## 📈 **Analytics Calculations**
From this data, we can calculate:
- **Pace trends** by weather conditions
- **Performance vs temperature** correlations  
- **Best running weather** for your performance
- **Seasonal patterns** in your running
- **Heart rate vs weather** analysis
- **Distance/elevation preferences** by conditions