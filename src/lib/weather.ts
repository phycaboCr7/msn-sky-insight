import { supabase } from "@/integrations/supabase/client";

export interface AirQuality {
  co: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  'us-epa-index': number;
  'gb-defra-index': number;
}

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    windchill_c: number;
    windchill_f: number;
    heatindex_c: number;
    heatindex_f: number;
    dewpoint_c: number;
    dewpoint_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
    air_quality?: AirQuality;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: number;
      };
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        avgtemp_c: number;
        avgtemp_f: number;
        maxwind_mph: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        totalsnow_cm: number;
        avgvis_km: number;
        avgvis_miles: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        daily_will_it_snow: number;
        daily_chance_of_snow: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
      hour: Array<{
        time: string;
        temp_c: number;
        temp_f: number;
        is_day: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        wind_mph: number;
        wind_kph: number;
        wind_degree: number;
        wind_dir: string;
        pressure_mb: number;
        pressure_in: number;
        precip_mm: number;
        precip_in: number;
        humidity: number;
        cloud: number;
        feelslike_c: number;
        feelslike_f: number;
        windchill_c: number;
        windchill_f: number;
        heatindex_c: number;
        heatindex_f: number;
        dewpoint_c: number;
        dewpoint_f: number;
        will_it_rain: number;
        chance_of_rain: number;
        will_it_snow: number;
        chance_of_snow: number;
        vis_km: number;
        vis_miles: number;
        gust_mph: number;
        gust_kph: number;
        uv: number;
      }>;
    }>;
  };
}

export const getCurrentWeather = async (location: string): Promise<WeatherData> => {
  const { data, error } = await supabase.functions.invoke('weather-proxy', {
    body: { endpoint: 'current', location },
  });
  if (error) throw new Error(`Weather API error: ${error.message}`);
  return data;
};

export const getForecastWeather = async (location: string, days: number = 7): Promise<WeatherData> => {
  const { data, error } = await supabase.functions.invoke('weather-proxy', {
    body: { endpoint: 'forecast', location, days },
  });
  if (error) throw new Error(`Weather API error: ${error.message}`);
  return data;
};

export const searchLocations = async (query: string) => {
  const { data, error } = await supabase.functions.invoke('weather-proxy', {
    body: { endpoint: 'search', query },
  });
  if (error) throw new Error(`Weather API error: ${error.message}`);
  return data;
};

export const getLocationFromCoords = async (lat: number, lon: number): Promise<WeatherData> => {
  const { data, error } = await supabase.functions.invoke('weather-proxy', {
    body: { endpoint: 'coords', lat, lon },
  });
  if (error) throw new Error(`Weather API error: ${error.message}`);
  return data;
};

export const getWeatherIcon = (code: number, isDay: boolean = true): string => {
  // Map weather codes to appropriate weather states
  const weatherMap: { [key: number]: string } = {
    1000: 'sunny', // Sunny/Clear
    1003: 'partly-cloudy', // Partly cloudy
    1006: 'cloudy', // Cloudy
    1009: 'overcast', // Overcast
    1030: 'mist', // Mist
    1063: 'patchy-rain', // Patchy rain possible
    1066: 'patchy-snow', // Patchy snow possible
    1069: 'patchy-sleet', // Patchy sleet possible
    1072: 'patchy-freezing-drizzle', // Patchy freezing drizzle possible
    1087: 'thundery-outbreaks', // Thundery outbreaks possible
    1114: 'blowing-snow', // Blowing snow
    1117: 'blizzard', // Blizzard
    1135: 'fog', // Fog
    1147: 'freezing-fog', // Freezing fog
    1150: 'patchy-light-drizzle', // Patchy light drizzle
    1153: 'light-drizzle', // Light drizzle
    1168: 'freezing-drizzle', // Freezing drizzle
    1171: 'heavy-freezing-drizzle', // Heavy freezing drizzle
    1180: 'patchy-light-rain', // Patchy light rain
    1183: 'light-rain', // Light rain
    1186: 'moderate-rain-at-times', // Moderate rain at times
    1189: 'moderate-rain', // Moderate rain
    1192: 'heavy-rain-at-times', // Heavy rain at times
    1195: 'heavy-rain', // Heavy rain
    1198: 'light-freezing-rain', // Light freezing rain
    1201: 'moderate-heavy-freezing-rain', // Moderate or heavy freezing rain
    1204: 'light-sleet', // Light sleet
    1207: 'moderate-heavy-sleet', // Moderate or heavy sleet
    1210: 'patchy-light-snow', // Patchy light snow
    1213: 'light-snow', // Light snow
    1216: 'patchy-moderate-snow', // Patchy moderate snow
    1219: 'moderate-snow', // Moderate snow
    1222: 'patchy-heavy-snow', // Patchy heavy snow
    1225: 'heavy-snow', // Heavy snow
    1237: 'ice-pellets', // Ice pellets
    1240: 'light-rain-shower', // Light rain shower
    1243: 'moderate-heavy-rain-shower', // Moderate or heavy rain shower
    1246: 'torrential-rain-shower', // Torrential rain shower
    1249: 'light-sleet-showers', // Light sleet showers
    1252: 'moderate-heavy-sleet-showers', // Moderate or heavy sleet showers
    1255: 'light-snow-showers', // Light snow showers
    1258: 'moderate-heavy-snow-showers', // Moderate or heavy snow showers
    1261: 'light-showers-ice-pellets', // Light showers of ice pellets
    1264: 'moderate-heavy-showers-ice-pellets', // Moderate or heavy showers of ice pellets
    1273: 'patchy-light-rain-thunder', // Patchy light rain with thunder
    1276: 'moderate-heavy-rain-thunder', // Moderate or heavy rain with thunder
    1279: 'patchy-light-snow-thunder', // Patchy light snow with thunder
    1282: 'moderate-heavy-snow-thunder' // Moderate or heavy snow with thunder
  };

  return weatherMap[code] || 'sunny';
};
