const OPENWEATHER_API_KEY = '2bc139a8d3fe6e1f41434c49e6830089'; 
let units = 'metric';
let currentForecastData = null;

const statusEl = document.getElementById('status');
const loader = document.getElementById('loader');
const weatherContent = document.getElementById('weatherContent');
const placeEl = document.getElementById('place');
const tempEl = document.getElementById('temperature');
const descEl = document.getElementById('desc');
const iconEl = document.getElementById('icon');
const detailsEl = document.getElementById('details');
const forecastEl = document.getElementById('forecast');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const locBtn = document.getElementById('locBtn');
const unitToggle = document.getElementById('unitToggle');
const travelDateInput = document.getElementById('travelDate');
const travelContent = document.getElementById('travelContent');

// Show status & loader
function setStatus(msg = '', showLoader = false) {
  statusEl.textContent = msg;
  loader.style.display = showLoader ? 'inline-block' : 'none';
}

// Weather icon URL
function iconUrl(code) {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

// Background gradient based on condition
function setBackground(condition) {
  let gradient = '';
  condition = condition.toLowerCase();
  if (condition.includes('clear')) gradient = 'linear-gradient(180deg,#fceabb,#f8b500)';
  else if (condition.includes('cloud')) gradient = 'linear-gradient(180deg,#bdc3c7,#2c3e50)';
  else if (condition.includes('rain')) gradient = 'linear-gradient(180deg,#2980b9,#6dd5fa)';
  else if (condition.includes('snow')) gradient = 'linear-gradient(180deg,#e0eafc,#cfdef3)';
  else if (condition.includes('thunder')) gradient = 'linear-gradient(180deg,#2c3e50,#4ca1af)';
  else if (condition.includes('mist') || condition.includes('fog')) gradient = 'linear-gradient(180deg,#3e5151,#decba4)';
  else gradient = 'linear-gradient(180deg,#081226,#071023)';
  document.body.style.background = gradient;
}

// Reverse geocoding for city name
async function fetchCityName(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`);
    const data = await res.json();
    if (data && data.length > 0) return `${data[0].name}, ${data[0].country}`;
  } catch (err) {}
  return "Unknown Location";
}

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
  setStatus('Fetching weather…', true);
  try {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${OPENWEATHER_API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${OPENWEATHER_API_KEY}`;
    const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    
    if (!currentRes.ok) throw new Error('Current weather fetch failed');
    if (!forecastRes.ok) throw new Error('Forecast fetch failed');

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();
    currentForecastData = forecastData;
    await renderWeather(currentData, forecastData);
  } catch (err) {
    setStatus('Unable to fetch weather', false);
    console.error(err);
  }
}

// Render weather UI
async function renderWeather(current, forecast) {
  weatherContent.classList.remove('hidden');
  setStatus('', false);

  const cityName = await fetchCityName(current.coord.lat, current.coord.lon);
  placeEl.textContent = cityName;

  tempEl.textContent = `${Math.round(current.main.temp)}°${units === 'metric' ? 'C' : 'F'}`;
  descEl.textContent = current.weather[0].description;
  iconEl.src = iconUrl(current.weather[0].icon);
  iconEl.alt = current.weather[0].description;

  setBackground(current.weather[0].main);

  // Current weather details
  detailsEl.innerHTML = '';
  const details = [
    ['Feels', `${Math.round(current.main.feels_like)}°`],
    ['Humidity', current.main.humidity + '%'],
    ['Wind', `${current.wind.speed} ${units === 'metric' ? 'm/s' : 'mph'}`],
    ['Pressure', current.main.pressure + ' hPa']
  ];
  details.forEach(d => {
    const div = document.createElement('div');
    div.className = 'detail';
    div.innerHTML = `<strong>${d[0]}:</strong> ${d[1]}`;
    detailsEl.appendChild(div);
  });

  // Forecast cards
  forecastEl.innerHTML = '';
  const days = {};
  forecast.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!days[date] && Object.keys(days).length < 5) days[date] = item;
  });
  Object.values(days).forEach(day => {
    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML = `
      <div>${new Date(day.dt * 1000).toLocaleDateString()}</div>
      <img src="${iconUrl(day.weather[0].icon)}" alt="icon" style="width:48px;height:48px;">
      <div>${Math.round(day.main.temp)}°${units === 'metric' ? 'C' : 'F'}</div>
      <div>${day.weather[0].main}</div>
    `;
    forecastEl.appendChild(div);
    setTimeout(() => {
      div.style.opacity = 1;
      div.style.transform = 'translateY(0)';
    }, 100);
  });
}

// Search handler
searchForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const value = searchInput.value.trim();
  if (!value) return;

  if (value.includes(',')) {
    const [lat, lon] = value.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lon)) {
      await fetchWeatherByCoords(lat, lon);
      return;
    }
  }

  setStatus('Fetching weather…', true);
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${value}&units=${units}&appid=${OPENWEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.coord) {
      await fetchWeatherByCoords(data.coord.lat, data.coord.lon);
    } else {
      setStatus('Place not found', false);
    }
  } catch {
    setStatus('Place not found', false);
  }
});

// Use my location
locBtn.onclick = function () {
  if (navigator.geolocation) {
    setStatus('Locating…', true);
    navigator.geolocation.getCurrentPosition(
      async pos => await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => setStatus('Unable to get location', false)
    );
  } else {
    setStatus('Geolocation not supported', false);
  }
};

// Toggle unit
unitToggle.onclick = async function () {
  units = units === 'metric' ? 'imperial' : 'metric';
  if (currentForecastData && currentForecastData.city && currentForecastData.city.coord) {
    await fetchWeatherByCoords(
      currentForecastData.city.coord.lat,
      currentForecastData.city.coord.lon
    );
  }
};

// Travel planner
function getForecastForDate(dateStr) {
  if (!currentForecastData) return null;
  return currentForecastData.list.find(item => item.dt_txt.startsWith(dateStr)) || null;
}

travelDateInput.onchange = function () {
  const date = this.value;
  if (!date) {
    travelContent.textContent = 'Select a date to see travel suggestions.';
    return;
  }
  if (!currentForecastData) {
    travelContent.textContent = `No forecast data available. Search for a location first.`;
    return;
  }
  const forecast = getForecastForDate(date);
  if (!forecast) {
    travelContent.textContent = `No forecast available for ${date}.`;
    return;
  }

  let weather = forecast.weather[0].main.toLowerCase();
  let temp = Math.round(forecast.main.temp);
  let advice = '';

  if (weather.includes('rain') || weather.includes('thunder')) advice = "Carry an umbrella/raincoat and prefer indoor activities.";
  else if (weather.includes('snow')) advice = "Dress warmly; check road conditions as travel may be difficult.";
  else if (weather.includes('clear')) advice = temp > 30 ? "Hot day, stay hydrated, travel in morning/evening." : "Clear day, ideal for sightseeing!";
  else if (weather.includes('cloud')) advice = "Cloudy and comfortable for travel.";
  else if (weather.includes('mist') || weather.includes('fog')) advice = "Foggy; drive carefully and allow extra travel time.";
  else advice = "Weather is moderate, good for travel!";

  travelContent.innerHTML = `
    <strong>${new Date(forecast.dt * 1000).toLocaleDateString()}</strong><br>
    Weather: ${forecast.weather[0].description} <br>
    Temperature: ${temp}°${units === 'metric' ? 'C' : 'F'} <br>
    <em>${advice}</em>
  `;
};

// Initial status
window.onload = () => setStatus('Enter a location to get started');
