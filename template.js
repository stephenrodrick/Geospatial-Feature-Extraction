const TOMTOM_API_KEY = 'BFM8H20WdTfnxhnpdQjhCrJ3QCPd4KcQ';
const OPENWEATHER_API_KEY = 'cb669b0e7977e5085210c5309da7b642'; 
const WAQI_API_KEY = '6f62327f8ffbaf28942ff51ceb7deb11e18d3d8c'; 
const NASA_API_KEY = 'TdDdgxW0OmfQ24HoMQ5R8MRdzL6g52tqk8ulAlrn';

let terrainMap, satelliteMap, urbanFeatureMap;

function parseCoordinates(coordinate) {
  const sanitizedCoord = coordinate.replace(/[^\d.-]/g, '');
  return parseFloat(sanitizedCoord);
}

async function fetchData() {
  const query = document.getElementById('searchQuery').value;
  let [lat, lon] = query.split(',').map(coord => parseCoordinates(coord.trim()));

  if (isNaN(lat) || isNaN(lon)) {
    alert('Please enter valid latitude and longitude coordinates.');
    return;
  }

  console.log(`Fetching data for coordinates: lat=${lat}, lon=${lon}`);

  try {
    initializeTerrainMap(lat, lon);

    initializeSatelliteMap(lat, lon);

    await fetchTomTomMap(lat, lon);

    await updateSidebarData(lat, lon);
  } catch (error) {
    console.error('Error fetching data:', error);
    alert('An error occurred while fetching data. Please try again.');
  }
}

function initializeTerrainMap(lat, lon) {
  if (terrainMap) terrainMap.remove();

  terrainMap = L.map('terrainMap', { center: [lat, lon], zoom: 10 });
  L.tileLayer(`https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`, {
    attribution: 'Map data &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  }).addTo(terrainMap);
}

function initializeSatelliteMap(lat, lon) {
  if (satelliteMap) satelliteMap.remove();

  satelliteMap = L.map('satelliteMap', { center: [lat, lon], zoom: 12 });
  const satelliteURL = `https://api.nasa.gov/planetary/earth/imagery?lon=${lon}&lat=${lat}&dim=0.1&api_key=${NASA_API_KEY}`;
  L.tileLayer(satelliteURL, { attribution: 'Imagery © NASA' }).addTo(satelliteMap);
}

async function fetchTomTomMap(lat, lon) {
  if (urbanFeatureMap) urbanFeatureMap.remove();

  urbanFeatureMap = L.map('weatherTempMap', { center: [lat, lon], zoom: 14 });

  L.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, {
    attribution: 'Maps © TomTom',
    maxZoom: 20
  }).addTo(urbanFeatureMap);

  const searchURL = `https://api.tomtom.com/search/2/categorySearch/building.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lon}&radius=1000`;
  const response = await fetch(searchURL);
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    data.results.forEach(feature => {
      const { position, poi } = feature;
      const marker = L.marker([position.lat, position.lon]).addTo(urbanFeatureMap);
      marker.bindPopup(`<strong>${poi.name || 'Building'}</strong>`);
    });
  } else {
    console.log('No man-made features found in this area.');
  }
}

async function updateSidebarData(lat, lon) {
  try {
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`);
    const weatherData = await weatherResponse.json();
    document.getElementById('weatherData').innerHTML = `
      <h2>Weather Data</h2>
      <p>Temperature: ${weatherData.main.temp}°C</p>
      <p>Weather: ${weatherData.weather[0].description}</p>
      <p>Humidity: ${weatherData.main.humidity}%</p>
      <p>Wind Speed: ${weatherData.wind.speed} m/s</p>
    `;

    const airQualityResponse = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${WAQI_API_KEY}`);
    const airQualityData = await airQualityResponse.json();
    document.getElementById('airQualityData').innerHTML = `
      <h2>Air Quality</h2>
      <p>AQI: ${airQualityData.data.aqi}</p>
      <p>PM2.5: ${airQualityData.data.iaqi.pm25 ? airQualityData.data.iaqi.pm25.v : 'N/A'}</p>
      <p>PM10: ${airQualityData.data.iaqi.pm10 ? airQualityData.data.iaqi.pm10.v : 'N/A'}</p>
    `;
    
    document.getElementById('city').textContent = `City: ${weatherData.name}`;
    document.getElementById('country').textContent = `Country: ${weatherData.sys.country}`;
    
    const timezoneOffset = weatherData.timezone / 3600;
    const timezoneString = `GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;
    document.getElementById('timezone').textContent = `Timezone: ${timezoneString}`;
  } catch (error) {
    console.error('Error fetching sidebar data:', error);
  }
}

function updateClock() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
  setTimeout(updateClock, 1000);
}

document.getElementById('searchButton').addEventListener('click', fetchData);
window.addEventListener('load', updateClock);
