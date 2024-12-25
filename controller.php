<?php
// php/controller.php
header("Content-Type: application/json; charset=UTF-8");
require_once 'model.php';

class MainController {
    private $model;

    public function __construct() {
        $this->model = new DataModel();
    }

    public function addSensorData($temperature, $humidity) {
        return $this->model->addData($temperature, $humidity);
    }

    public function getLastHourData() {
        return $this->model->getLastHourData();
    }

    public function getAllData($hours = null) {
        return $this->model->getAllData($hours);
    }

    public function getFanSetting() {
        return $this->model->getFanSetting();
    }

    public function updateFanSetting($mode, $fanOn, $speed) {
        return $this->model->updateFanSetting($mode, $fanOn, $speed);
    }
}
?>
