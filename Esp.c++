#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"
#include <ArduinoJson.h> // Pastikan library ArduinoJson telah terinstal

// Define pin connections
#define DHTPIN 19          // Pin untuk DHT11
#define DHTTYPE DHT11      // Tipe sensor DHT
const int switchPin = 18;  // Pin untuk saklar
const int buzzerPin = 17;  // Pin untuk buzzer
const int fanPin = 21;     // Pin untuk kipas

// Define RGB LED pins
#define RED_PIN 27    // Pin untuk LED Merah
#define GREEN_PIN 26  // Pin untuk LED Hijau
#define BLUE_PIN 25   // Pin untuk LED Biru

// Initialize DHT sensor
DHT dht(DHTPIN, DHTTYPE);

// WiFi credentials
const char* ssid = "A55 milik Indra";      // Ganti dengan SSID WiFi Anda
const char* password = "";   // Ganti dengan Password WiFi Anda

// Server address
const String serverName = "http://192.168.138.147/UAP_PHP_PIRANTI/api.php"; // Ganti dengan IP server Anda

// Variabel untuk menyimpan status saklar
int switchState = 0;
int lastSwitchState = 0;
bool manualMode = false;

// Variabel untuk kontrol waktu
unsigned long previousMillis = 0;
const unsigned long interval = 500; // Interval pengiriman data (500 ms)

// Variabel untuk blinking LED
unsigned long previousBlinkMillis = 0;
const unsigned long blinkInterval = 500; // Interval blinking (ms)
bool ledState = false;

// Variabel untuk pengaturan kipas
int fanSpeed = 0;
bool fanOn = false;

// Fungsi untuk mengatur warna LED RGB
void setColor(int red, int green, int blue) {
  analogWrite(RED_PIN, red);
  analogWrite(GREEN_PIN, green);
  analogWrite(BLUE_PIN, blue);
}

// Fungsi untuk mengubah mode dan kecepatan kipas
void setFanMode(String mode, int fanOnStatus, int speed) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = serverName + "?action=updateFanSetting&mode=" + mode + "&fanOn=" + String(fanOnStatus) + "&speed=" + String(speed);
    
    http.begin(url);
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Pengaturan kipas diperbarui, respons: ");
      Serial.println(response);
    } else {
      Serial.print("Error mengirim pengaturan kipas: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

// Fungsi untuk toggle mode antara Auto dan Manual
void toggleMode() {
  manualMode = !manualMode;
  Serial.print("Mode diubah ke: ");
  Serial.println(manualMode ? "Manual" : "Auto");
  
  if (manualMode) {
    // Mode Manual: Kipas menyala dengan kecepatan maksimal
    setFanMode("manual", 1, 255);
  } else {
    // Mode Auto: Kipas dikontrol secara otomatis
    setFanMode("auto", 0, 0);
  }
}

void setup() {
  Serial.begin(115200);
  
  // Inisialisasi pin
  pinMode(switchPin, INPUT_PULLDOWN);
  pinMode(buzzerPin, OUTPUT);
  pinMode(fanPin, OUTPUT);
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  
  // Matikan kipas, buzzer, dan LED RGB saat awal
  digitalWrite(buzzerPin, LOW);
  analogWrite(fanPin, 0); // Memastikan kipas mati (0% duty cycle)
  setColor(0, 0, 0);      // Matikan semua warna LED RGB
  
  // Mulai DHT sensor
  dht.begin();
  
  // Koneksi ke WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Baca switch
  switchState = digitalRead(switchPin);
  if (switchState == HIGH && lastSwitchState == LOW) {
    toggleMode();
    delay(200); // Debounce lebih lama untuk mencegah multiple toggle
  }
  lastSwitchState = switchState;
  
  // Setiap 'interval' ms, kirim data ke server & ambil setelan kipas
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (!isnan(temperature) && !isnan(humidity)) {
      // Kirim data ke server
      sendDataToServer(temperature, humidity);
      
      // Ambil pengaturan kipas dari server
      getFanSettingsFromServer();
    } else {
      Serial.println("Gagal membaca sensor DHT!");
    }
  }
  
  // Mode Manual -> LED Biru berkedip, kipas sesuai pengaturan
  if (manualMode) {
    if (currentMillis - previousBlinkMillis >= blinkInterval) {
      previousBlinkMillis = currentMillis;
      ledState = !ledState;
      if (ledState) {
        setColor(0, 0, 255); // Nyalakan Biru
      } else {
        setColor(0, 0, 0);   // Matikan LED
      }
    }
  } else {
    // Mode Otomatis -> Sesuaikan kipas dan LED berdasarkan suhu
    controlFanAutomatically();
  }
  
  // Tidak ada delay di sini untuk menjaga loop tetap responsif
}

// Fungsi kirim data sensor ke server
void sendDataToServer(float temp, float hum) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = serverName + "?action=addData&temperature=" + String(temp) + "&humidity=" + String(hum);
    
    http.begin(url);
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Data dikirim, respons: ");
      Serial.println(response);
    } else {
      Serial.print("Error mengirim data: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

// Fungsi ambil pengaturan kipas dari server
void getFanSettingsFromServer() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = serverName + "?action=getFanSetting";
    
    http.begin(url);
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String payload = http.getString();
      Serial.print("Pengaturan Kipas: ");
      Serial.println(payload);
      
      // Parsing JSON menggunakan ArduinoJSON
      const size_t capacity = JSON_OBJECT_SIZE(4) + 60;
      DynamicJsonDocument doc(capacity);
      
      DeserializationError error = deserializeJson(doc, payload);
      if (error) {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.f_str());
        return;
      }
      
      const char* mode = doc["mode"];
      fanOn = doc["fanOn"];
      fanSpeed = doc["speed"];
      
      manualMode = (String(mode) == "manual");
      
      // Debugging
      Serial.print("Mode: ");
      Serial.println(mode);
      Serial.print("Fan On: ");
      Serial.println(fanOn);
      Serial.print("Fan Speed: ");
      Serial.println(fanSpeed);
      
      // Atur kipas dan LED berdasarkan pengaturan
      if (manualMode) {
        analogWrite(fanPin, fanOn ? fanSpeed : 0);
        digitalWrite(buzzerPin, LOW);
      }
    } else {
      Serial.print("Error mengambil pengaturan kipas: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

// Fungsi kontrol kipas secara otomatis berdasarkan suhu
void controlFanAutomatically() {
  float temperature = dht.readTemperature();
  
  if (isnan(temperature)) {
    Serial.println("Gagal membaca suhu!");
    return;
  }
  
  if (temperature > 33) {
    // Overheat: LED Merah, Kipas Maksimal, Buzzer Nyala
    setColor(255, 0, 0); // Merah
    analogWrite(fanPin, 255);   // Kipas 100%
    digitalWrite(buzzerPin, HIGH);      // Buzzer ON
  }
  else if (temperature > 32) {
    // Kipas Maksimal: LED Oranye, Buzzer Mati
    setColor(255, 165, 0); // Oranye
    analogWrite(fanPin, 255);   // Kipas 100%
    digitalWrite(buzzerPin, LOW);       // Buzzer OFF
  }
  else if (temperature > 31) {
    // Kipas Sedang: LED Kuning, Buzzer Mati
    setColor(255, 255, 0); // Kuning
    analogWrite(fanPin, 128);   // Kipas 50%
    digitalWrite(buzzerPin, LOW);       // Buzzer OFF
  }
  else {
    // Aman: LED Hijau, Kipas Mati, Buzzer Mati
    setColor(0, 255, 0); // Hijau
    analogWrite(fanPin, 0);     // Matikan kipas
    digitalWrite(buzzerPin, LOW);       // Buzzer OFF
  }
}
