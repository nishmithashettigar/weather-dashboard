const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { city, units } = event.queryStringParameters || {};
  const apiKey = process.env.OPENWEATHER_KEY;

  if (!city) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'City or coordinates are required.' })
    };
  }

  try {
    let currentUrl = '';
    let forecastUrl = '';

    if (city.includes(',')) {
      // If coordinates are provided
      const [lat, lon] = city.split(',');
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
    } else {
      // If city name is provided
      currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${units}&appid=${apiKey}`;
    }

    const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    if (currentRes.status !== 200) throw new Error(currentData.message || 'Current weather fetch failed');
    if (forecastRes.status !== 200) throw new Error(forecastData.message || 'Forecast fetch failed');

    // Add city name to current data
    currentData.cityName = currentData.name + ', ' + currentData.sys.country;

    return {
      statusCode: 200,
      body: JSON.stringify({
        current: currentData,
        forecast: forecastData
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message })
    };
  }
};
