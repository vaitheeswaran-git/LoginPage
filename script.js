
// ===================================
// 1. OPENWEATHER API CONFIGURATION
// ===================================

const API_KEY = "3044327a9ade08aecc3c8932cc4f6f67";

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";


// ===================================
// 2. GET HTML ELEMENTS
// ===================================

const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const weatherSection = document.getElementById("weatherSection");


// ===================================
// 3. LISTEN FOR SEARCH BUTTON CLICK
// ===================================

weatherForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const city = cityInput.value.trim();

    if (city) {
        getWeather(city);
    }

});


// ===================================
// 4. GET LOCATION COORDINATES
// ===================================

async function getCoordinates(city) {

    const url = `${GEO_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Location search failed.");
    }

    if (data.length === 0) {
        throw new Error("City not found. Please enter a valid city.");
    }

    return data[0];

}


// ===================================
// 5. FETCH WEATHER INFORMATION
// ===================================

async function getWeather(city) {

    loading.classList.remove("d-none");
    weatherSection.classList.add("d-none");
    errorMessage.classList.add("d-none");

    try {

        // Get coordinates
        const location = await getCoordinates(city);

        const lat = location.lat;
        const lon = location.lon;

        // Create API URLs
        const currentURL =
            `${WEATHER_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

        const forecastURL =
            `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

        // Fetch both API responses together
        const [currentResponse, forecastResponse] =
            await Promise.all([
                fetch(currentURL),
                fetch(forecastURL)
            ]);

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (!currentResponse.ok) {
            throw new Error(currentData.message || "Current weather unavailable.");
        }

        if (!forecastResponse.ok) {
            throw new Error(forecastData.message || "Forecast unavailable.");
        }

        // Display current weather
        displayCurrentWeather(currentData, location);

        // Display five-day forecast
        displayForecast(forecastData);

        weatherSection.classList.remove("d-none");

    }

    catch(error) {

        errorMessage.textContent = error.message;
        errorMessage.classList.remove("d-none");

    }

    finally {

        loading.classList.add("d-none");

    }

}


// ===================================
// 6. DISPLAY CURRENT WEATHER
// ===================================

function displayCurrentWeather(data, location) {

    document.getElementById("cityName").textContent =
        `${location.name}, ${location.country}`;

    document.getElementById("temperature").textContent =
        Math.round(data.main.temp);

    document.getElementById("description").textContent =
        data.weather[0].description;

    document.getElementById("weatherIcon").src =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    document.getElementById("feelsLike").textContent =
        Math.round(data.main.feels_like) + "°C";

    document.getElementById("humidity").textContent =
        data.main.humidity + "%";

    document.getElementById("windSpeed").textContent =
        data.wind.speed + " m/s";

    document.getElementById("pressure").textContent =
        data.main.pressure + " hPa";

    document.getElementById("dateTime").textContent =
        "Current weather in " + location.name;

}


// ===================================
// 7. DISPLAY FIVE-DAY FORECAST
// ===================================

function displayForecast(data) {

    const forecastContainer =
        document.getElementById("forecastContainer");

    forecastContainer.innerHTML = "";

    const timezoneOffset = data.city.timezone;

    // Group forecast entries by local calendar date
    const dailyForecasts = {};

    data.list.forEach(item => {

        const localDate = new Date(
            (item.dt + timezoneOffset) * 1000
        ).toISOString().slice(0, 10);

        if (!dailyForecasts[localDate]) {
            dailyForecasts[localDate] = [];
        }

        dailyForecasts[localDate].push(item);

    });

    const days = Object.keys(dailyForecasts).slice(0, 5);

    days.forEach(date => {

        const entries = dailyForecasts[date];

        // Find forecast closest to local noon
        const noonForecast = entries.reduce((best, item) => {

            const localHour = new Date(
                (item.dt + timezoneOffset) * 1000
            ).getUTCHours();

            const bestHour = new Date(
                (best.dt + timezoneOffset) * 1000
            ).getUTCHours();

            return Math.abs(localHour - 12) <
                   Math.abs(bestHour - 12) ? item : best;

        });

        // Calculate daily minimum and maximum
        const temperatures = entries.map(item => item.main.temp);

        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);

        const rainChance = Math.round(
            Math.max(...entries.map(item => item.pop || 0)) * 100
        );

        const formattedDate = new Date(
            date + "T12:00:00"
        ).toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

        // Create forecast card
        const card = document.createElement("div");

        card.className = "col-6 col-md-4 col-lg";

        card.innerHTML = `
            <div class="forecast-card">

                <h5>${formattedDate}</h5>

                <img
                    src="https://openweathermap.org/img/wn/${noonForecast.weather[0].icon}@2x.png"
                    alt="${noonForecast.weather[0].description}"
                >

                <p>${noonForecast.weather[0].description}</p>

                <h5>${Math.round(maxTemp)}°C</h5>

                <p class="text-muted">
                    Min: ${Math.round(minTemp)}°C
                </p>

                <p>Rain: ${rainChance}%</p>

            </div>
        `;

        forecastContainer.appendChild(card);

    });

}

// ===================================
// AI WEATHER CHATBOT
// ===================================

const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatMessages = document.getElementById("chatMessages");

// Stores the conversation
const chatHistory = [];

function addChatMessage(message, sender) {
    const messageElement = document.createElement("div");

    messageElement.className =
        sender === "user" ? "user-message" : "bot-message";

    // textContent prevents HTML entered by users from being executed
    messageElement.textContent = message;

    chatMessages.appendChild(messageElement);

    // Automatically scroll to the latest message
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {

    const message = chatInput.value.trim();

    // Check whether the user entered a message
    if (!message || sendChatBtn.disabled) {
        return;
    }

    // Display the user's message
    addChatMessage(message, "user");

    chatHistory.push({
        role: "user",
        text: message
    });

    chatInput.value = "";
    sendChatBtn.disabled = true;
    sendChatBtn.textContent = "Thinking...";

    try {

        // Send the conversation to our backend
        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: chatHistory
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Chat request failed.");
        }

        // Display the AI response
        addChatMessage(data.reply, "bot");

        // Save AI response for conversation context
        chatHistory.push({
            role: "model",
            text: data.reply
        });

        // Keep only recent conversation history
        if (chatHistory.length > 12) {
            chatHistory.splice(0, chatHistory.length - 12);
        }

    } catch (error) {

        console.error("Chatbot error:", error);

        addChatMessage(
            error.message || "Sorry, something went wrong.",
            "bot"
        );

    } finally {

        sendChatBtn.disabled = false;
        sendChatBtn.textContent = "Send";
        chatInput.focus();

    }
}

// Send message when button is clicked
sendChatBtn.addEventListener("click", sendChatMessage);

// Send message when Enter is pressed
chatInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        sendChatMessage();
    }

});
