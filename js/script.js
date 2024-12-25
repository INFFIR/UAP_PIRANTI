// html-css-js/js/script.js

const BASE_URL = "http://192.168.138.147/UAP_PHP_PIRANTI/api.php"; // Ganti dengan IP server Anda

document.addEventListener("DOMContentLoaded", () => {
  if (document.title.includes("Dashboard")) {
    initDashboard();
  } else if (document.title.includes("Sensor Data Table")) {
    initTablePage();
  }
});

// Initialize Dashboard Page
function initDashboard() {
  // Render Charts
  fetchLastHourData().then(data => {
    renderTemperatureChart(data);
    renderHumidityChart(data);
  });

  // Fetch and Set Fan Settings
  fetchFanSetting().then(setting => {
    updateFanControls(setting);
    updateStatusMessage(setting);
  });

  // Fan On/Off Button
  const fanOnOffBtn = document.getElementById("fanOnOffBtn");
  fanOnOffBtn.addEventListener("click", () => {
    toggleFan();
  });

  // Fan Speed Control
  const fanSpeed = document.getElementById("fanSpeed");
  const speedValue = document.getElementById("speedValue");
  fanSpeed.addEventListener("input", () => {
    speedValue.textContent = fanSpeed.value;
    updateFanSetting();
  });

  // Mode Control Buttons
  const setManualBtn = document.getElementById("setManualBtn");
  const setAutoBtn = document.getElementById("setAutoBtn");

  setManualBtn.addEventListener("click", () => {
    setMode("manual");
  });

  setAutoBtn.addEventListener("click", () => {
    setMode("auto");
  });

  // Refresh Status Every 10 Seconds
  setInterval(() => {
    fetchFanSetting().then(setting => {
      updateFanControls(setting);
      updateStatusMessage(setting);
    });
  }, 10000);
}

// Initialize Table Page
function initTablePage() {
  const filterBtn = document.getElementById("filterBtn");
  const showAllBtn = document.getElementById("showAllBtn");
  const dataTable = document.getElementById("dataTable").querySelector("tbody");

  // Load initial 10 rows
  getAllData(1).then(data => {
    renderTable(data.slice(0, 10), dataTable);
  });

  filterBtn.addEventListener("click", () => {
    const hrs = document.getElementById("filterHour").value;
    if (hrs > 0) {
      getAllData(hrs).then(data => {
        renderTable(data.slice(0, 10), dataTable);
        scrollToTop(); // Scroll ke atas setelah filter
      });
    }
  });

  showAllBtn.addEventListener("click", () => {
    getAllData().then(data => {
      renderTable(data, dataTable); // Render semua data tanpa slice
      enableTableScroll();
      scrollToTop(); // Scroll ke atas setelah render
    });
  });
}

// ----------------------------------------------
// Fetch Data from Server
// ----------------------------------------------

// Fetch last hour data
function fetchLastHourData() {
  return fetch(`${BASE_URL}?action=getLastHourData`)
    .then(res => res.json())
    .catch(err => console.error(err));
}

// Fetch all data or based on hours
function getAllData(hours = null) {
  if (hours) {
    return fetch(`${BASE_URL}?action=getAllData&hours=${hours}`)
      .then(res => res.json())
      .catch(err => console.error(err));
  } else {
    return fetch(`${BASE_URL}?action=getAllData`)
      .then(res => res.json())
      .catch(err => console.error(err));
  }
}

// Fetch fan settings
function fetchFanSetting() {
  return fetch(`${BASE_URL}?action=getFanSetting`)
    .then(res => res.json())
    .catch(err => console.error(err));
}

// Update fan settings
function updateFanSetting() {
  const fanOn = document.getElementById("fanOnOffBtn").textContent === "On" ? 1 : 0;
  const fanSpeed = document.getElementById("fanSpeed").value;

  // Automatically set mode to manual
  const mode = "manual";

  const url = `${BASE_URL}?action=updateFanSetting&mode=${mode}&fanOn=${fanOn}&speed=${fanSpeed}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("Fan setting updated:", data);
      updateStatusMessage({ mode: mode, fanOn: fanOn, speed: fanSpeed });
    })
    .catch(err => console.error(err));
}

// Toggle Fan On/Off
function toggleFan() {
  const fanOnOffBtn = document.getElementById("fanOnOffBtn");
  const currentState = fanOnOffBtn.textContent === "On" ? 1 : 0;
  const newState = currentState === 1 ? 0 : 1;

  // Update button text
  fanOnOffBtn.textContent = newState === 1 ? "On" : "Off";

  // Update fan settings on server
  const fanSpeed = document.getElementById("fanSpeed").value;

  // Automatically set mode to manual
  const mode = "manual";

  const url = `${BASE_URL}?action=updateFanSetting&mode=${mode}&fanOn=${newState}&speed=${fanSpeed}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("Fan toggled:", data);
      updateStatusMessage({ mode: mode, fanOn: newState, speed: fanSpeed });
    })
    .catch(err => console.error(err));
}

// Set mode to manual or auto
function setMode(mode) {
  const fanSetting = mode === "manual" ? {
    mode: "manual",
    fanOn: document.getElementById("fanOnOffBtn").textContent === "On" ? 1 : 0,
    speed: document.getElementById("fanSpeed").value
  } : {
    mode: "auto",
    fanOn: 0,
    speed: 0
  };

  const url = `${BASE_URL}?action=updateFanSetting&mode=${fanSetting.mode}&fanOn=${fanSetting.fanOn}&speed=${fanSetting.speed}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("Mode set to:", mode);
      updateStatusMessage(fanSetting);
      if (mode === "auto") {
        // Reset controls
        document.getElementById("fanOnOffBtn").textContent = "Off";
        document.getElementById("fanSpeed").value = 0;
        document.getElementById("speedValue").textContent = "0";
      }
    })
    .catch(err => console.error(err));
}

// ----------------------------------------------
// Render Functions
// ----------------------------------------------

// Render Temperature Chart using Canvas API
function renderTemperatureChart(data) {
  const canvas = document.getElementById("temperatureChart");
  const ctx = canvas.getContext("2d");
  const labels = data.map(d => {
    const date = new Date(d.created_at);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const tempData = data.map(d => d.temperature);

  // Set canvas size to maintain 1:1 ratio
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.width;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw axes
  ctx.beginPath();
  ctx.moveTo(40, 10);
  ctx.lineTo(40, canvas.height - 40);
  ctx.lineTo(canvas.width - 10, canvas.height - 40);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Plot data
  ctx.beginPath();
  ctx.strokeStyle = "#FF6384";
  ctx.lineWidth = 2;

  const maxTemp = Math.max(...tempData, 40); // Assume max temperature 40°C
  const minTemp = Math.min(...tempData, 0);  // Assume min temperature 0°C

  tempData.forEach((temp, index) => {
    const x = 40 + (canvas.width - 50) * (index / (tempData.length - 1));
    const y = canvas.height - 40 - ((temp - minTemp) / (maxTemp - minTemp)) * (canvas.height - 50);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw labels
  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  ctx.fillText("0°C", 10, canvas.height - 40);
  ctx.fillText(`${maxTemp}°C`, 10, 20);
  ctx.fillText("Time", canvas.width / 2, canvas.height - 10);
  ctx.fillText("Temperature", 10, 10);
}

// Render Humidity Chart using Canvas API
function renderHumidityChart(data) {
  const canvas = document.getElementById("humidityChart");
  const ctx = canvas.getContext("2d");
  const labels = data.map(d => {
    const date = new Date(d.created_at);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const humData = data.map(d => d.humidity);

  // Set canvas size to maintain 1:1 ratio
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.width;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw axes
  ctx.beginPath();
  ctx.moveTo(40, 10);
  ctx.lineTo(40, canvas.height - 40);
  ctx.lineTo(canvas.width - 10, canvas.height - 40);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Plot data
  ctx.beginPath();
  ctx.strokeStyle = "#36A2EB";
  ctx.lineWidth = 2;

  const maxHum = Math.max(...humData, 100); // Max humidity 100%
  const minHum = Math.min(...humData, 0);   // Min humidity 0%

  humData.forEach((hum, index) => {
    const x = 40 + (canvas.width - 50) * (index / (humData.length - 1));
    const y = canvas.height - 40 - ((hum - minHum) / (maxHum - minHum)) * (canvas.height - 50);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw labels
  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  ctx.fillText("0%", 10, canvas.height - 40);
  ctx.fillText(`${maxHum}%`, 10, 20);
  ctx.fillText("Time", canvas.width / 2, canvas.height - 10);
  ctx.fillText("Humidity", 10, 10);
}

// Render Table
function renderTable(data, tableBody) {
  tableBody.innerHTML = "";
  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.temperature}</td>
      <td>${row.temperature_condition}</td>
      <td>${row.humidity}</td>
      <td>${row.humidity_condition}</td>
      <td>${capitalizeFirstLetter(row.mode)}</td>
      <td>${row.created_at}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Update Fan Controls based on settings
function updateFanControls(setting) {
  const fanOnOffBtn = document.getElementById("fanOnOffBtn");
  fanOnOffBtn.textContent = setting.fanOn === 1 ? "On" : "Off";
  document.getElementById("fanSpeed").value = setting.speed;
  document.getElementById("speedValue").textContent = setting.speed;
  document.getElementById("currentMode").textContent = capitalizeFirstLetter(setting.mode);
}

// Update Status Message
function updateStatusMessage(setting) {
  const statusDiv = document.getElementById("statusMessage");
  statusDiv.textContent = `Fan is in ${capitalizeFirstLetter(setting.mode)} mode.`;

  if (setting.mode === "manual") {
    statusDiv.classList.remove("status-error");
    statusDiv.classList.add("status-success");
  } else {
    statusDiv.classList.remove("status-success");
    statusDiv.classList.add("status-error");
  }
}

// Capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Enable scrolling in table container
function enableTableScroll() {
  const tableContainer = document.querySelector(".table-container");
  tableContainer.style.maxHeight = "400px"; // Sesuaikan tinggi sesuai kebutuhan
  tableContainer.style.overflowY = "auto";  // Pastikan scroll aktif
}

// Scroll tabel ke atas
function scrollToTop() {
  const tableContainer = document.querySelector(".table-container");
  tableContainer.scrollTop = 0;
}
