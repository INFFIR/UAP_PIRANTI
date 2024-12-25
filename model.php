<?php
// UAP_PHP_PIRANTI/model.php
header("Content-Type: application/json; charset=UTF-8");

class Database {
    private $host = "localhost";
    private $db   = "esp32db";   // Ganti sesuai nama DB Anda
    private $user = "root";      // Biasanya root untuk Laragon
    private $pass = "";          // Biasanya kosong untuk Laragon
    public $conn;

    public function __construct() {
        $this->conn = $this->getConnection();
    }

    private function getConnection() {
        $conn = null;
        try {
            $conn = new PDO("mysql:host=$this->host;dbname=$this->db;charset=utf8", $this->user, $this->pass);
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $e) {
            echo json_encode(["error" => "Connection error: " . $e->getMessage()]);
            exit;
        }
        return $conn;
    }
}

class DataModel extends Database {
    
    public function addData($temperature, $humidity) {
        // Dapatkan mode saat ini dari fan_setting
        $mode = $this->getCurrentMode();

        // Hitung kondisi berdasarkan suhu dan kelembapan
        $temperature_condition = $this->getTemperatureCondition($temperature);
        $humidity_condition = $this->getHumidityCondition($humidity);

        $sql = "INSERT INTO sensor_data (temperature, humidity, temperature_condition, humidity_condition, mode, created_at) 
                VALUES (:t, :h, :tc, :hc, :m, NOW())";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":t", $temperature);
        $stmt->bindParam(":h", $humidity);
        $stmt->bindParam(":tc", $temperature_condition);
        $stmt->bindParam(":hc", $humidity_condition);
        $stmt->bindParam(":m", $mode);
        return $stmt->execute();
    }

    public function getLastHourData() {
        $sql = "SELECT * FROM sensor_data 
                WHERE created_at >= (NOW() - INTERVAL 1 HOUR)
                ORDER BY created_at ASC";
        $stmt = $this->conn->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAllData($hours = null) {
        if ($hours) {
            $sql = "SELECT * FROM sensor_data
                    WHERE created_at >= (NOW() - INTERVAL :hrs HOUR)
                    ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(":hrs", $hours, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $sql = "SELECT * FROM sensor_data ORDER BY created_at DESC";
            $stmt = $this->conn->query($sql);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    public function getFanSetting() {
        $sql = "SELECT * FROM fan_setting WHERE id=1 LIMIT 1"; 
        $stmt = $this->conn->query($sql);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function updateFanSetting($mode, $fanOn, $speed) {
        $sql = "UPDATE fan_setting SET mode=:m, fanOn=:on, speed=:s WHERE id=1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":m", $mode);
        $stmt->bindParam(":on", $fanOn);
        $stmt->bindParam(":s", $speed);
        return $stmt->execute();
    }

    private function getCurrentMode() {
        $sql = "SELECT mode FROM fan_setting WHERE id=1 LIMIT 1";
        $stmt = $this->conn->query($sql);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['mode'];
    }

    private function getTemperatureCondition($temperature) {
        if ($temperature <= 30) {
            return 'Normal';
        } elseif ($temperature <= 31) {
            return 'Agak Panas';
        } elseif ($temperature <= 32) {
            return 'Panas';
        } else {
            return 'Sangat Panas';
        }
    }

    private function getHumidityCondition($humidity) {
        // Atur kondisi kelembapan sesuai kebutuhan
        if ($humidity <= 30) {
            return 'Kering';
        } elseif ($humidity <= 60) {
            return 'Normal';
        } elseif ($humidity <= 80) {
            return 'Agak Tinggi';
        } else {
            return 'Tinggi';
        }
    }
}
?>
