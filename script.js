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

// Fetch weather from Netlify function
async function fetchWeather(city) {
  setStatus('Fetching weather…', true);
  try {
    const res = await fetch(`/.netlify/functions/weather?city=${city}&units=${units}`);
    const data = await res.json();
    if (data.cod && data.cod !== 200) throw new Error(data.message || 'Place not found');

    currentForecastData = data.forecast;
    renderWeather(data.current, data.forecast);
    setStatus('', false);
  } catch (err) {
    setStatus('Unable to fetch weather', false);
    console.error(err);
  }
}

// Render weather UI
function renderWeather(current, forecast) {
  weatherContent.classList.remove('hidden');
  placeEl.textContent = current.cityName || "Unknown Location";
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
searchForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const value = searchInput.value.trim();
  if (!value) return;
  fetchWeather(value);
});

// Use my location
locBtn.onclick = function () {
  if (navigator.geolocation) {
    setStatus('Locating…', true);
    navigator.geolocation.getCurrentPosition(
      async pos => fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
      () => setStatus('Unable to get location', false)
    );
  } else setStatus('Geolocation not supported', false);
};

// Toggle unit
unitToggle.onclick = function () {
  units = units === 'metric' ? 'imperial' : 'metric';
  if (currentForecastData) fetchWeather(searchInput.value);
};

// Travel planner
travelDateInput.onchange = function () {
  const date = this.value;
  if (!date) {
    travelContent.textContent = 'Select a date to see travel suggestions.';
    return;
  }
  if (!currentForecastData) {
    travelContent.textContent = 'No forecast data available. Search for a location first.';
    return;
  }
  const forecast = currentForecastData.list.find(item => item.dt_txt.startsWith(date));
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
