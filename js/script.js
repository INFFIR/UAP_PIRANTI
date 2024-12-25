// html-css-js/js/script.js

const BASE_URL = "http://192.168.138.147/UAP_PHP_PIRANTI/index.php"; // Ganti dengan IP komputer Anda

document.addEventListener("DOMContentLoaded", () => {
  if (document.title.includes("Dashboard")) {
    initDashboard();
  } else if (document.title.includes("Sensor Data Table")) {
    initTablePage();
  }
});

// Inisialisasi Halaman Dashboard
function initDashboard() {
  // Render Charts
  fetchLastHourData().then(data => {
    renderTemperatureChart(data);
    renderHumidityChart(data);
  });

  // Fetch dan Set Fan Settings
  fetchFanSetting().then(setting => {
    updateFanControls(setting);
    updateStatusMessage(setting);
  });

  // Fan On/Off Control
  const fanOnOff = document.getElementById("fanOnOff");
  fanOnOff.addEventListener("change", () => {
    updateFanSetting();
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

// Inisialisasi Halaman Table
function initTablePage() {
  const filterBtn = document.getElementById("filterBtn");
  const showAllBtn = document.getElementById("showAllBtn");
  const dataTable = document.getElementById("dataTable").querySelector("tbody");

  // Default load 1 jam terakhir
  getAllData(1).then(data => {
    renderTable(data, dataTable);
  });

  filterBtn.addEventListener("click", () => {
    const hrs = document.getElementById("filterHour").value;
    if (hrs > 0) {
      getAllData(hrs).then(data => {
        renderTable(data, dataTable);
      });
    }
  });

  showAllBtn.addEventListener("click", () => {
    getAllData().then(data => {
      renderTable(data, dataTable);
    });
  });
}

// ----------------------------------------------
// Fungsi Fetch Data dari Server
// ----------------------------------------------

// Fetch data 1 jam terakhir
function fetchLastHourData() {
  return fetch(`${BASE_URL}?action=getLastHourData`)
    .then(res => res.json())
    .catch(err => console.error(err));
}

// Fetch semua data atau berdasarkan jam
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

// Fetch pengaturan kipas
function fetchFanSetting() {
  return fetch(`${BASE_URL}?action=getFanSetting`)
    .then(res => res.json())
    .catch(err => console.error(err));
}

// Update pengaturan kipas
function updateFanSetting() {
  const fanOnOff = document.getElementById("fanOnOff").checked ? 1 : 0;
  const fanSpeed = document.getElementById("fanSpeed").value;

  // Mengatur mode ke manual secara otomatis
  const mode = "manual";

  const url = `${BASE_URL}?action=updateFanSetting&mode=${mode}&fanOn=${fanOnOff}&speed=${fanSpeed}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("Fan setting updated:", data);
      updateStatusMessage({ mode: mode, fanOn: fanOnOff, speed: fanSpeed });
    })
    .catch(err => console.error(err));
}

// Set mode manual atau auto
function setMode(mode) {
  const fanSetting = mode === "manual" ? {
    mode: "manual",
    fanOn: document.getElementById("fanOnOff").checked ? 1 : 0,
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
        document.getElementById("fanOnOff").checked = false;
        document.getElementById("fanSpeed").value = 0;
        document.getElementById("speedValue").textContent = "0";
      }
    })
    .catch(err => console.error(err));
}

// ----------------------------------------------
// Fungsi Render
// ----------------------------------------------

// Render Temperature Chart
function renderTemperatureChart(data) {
  const ctx = document.getElementById("temperatureChart").getContext("2d");

  const labels = data.map(d => {
    const date = new Date(d.created_at);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const tempData = data.map(d => d.temperature);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Temperature (°C)",
          data: tempData,
          borderColor: "#FF6384",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Temperature (°C)'
          }
        }
      }
    }
  });
}

// Render Humidity Chart
function renderHumidityChart(data) {
  const ctx = document.getElementById("humidityChart").getContext("2d");

  const labels = data.map(d => {
    const date = new Date(d.created_at);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const humData = data.map(d => d.humidity);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Humidity (%)",
          data: humData,
          borderColor: "#36A2EB",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Humidity (%)'
          }
        }
      }
    }
  });
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
  document.getElementById("fanOnOff").checked = setting.fanOn === 1;
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
