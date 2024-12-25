<?php
// UAP_PHP_PIRANTI/api.php
header("Content-Type: application/json; charset=UTF-8");
require_once 'controller.php';

$ctrl = new MainController();
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($action) {
    case 'addData':
        // URL contoh: api.php?action=addData&temperature=30&humidity=70
        $temp = isset($_GET['temperature']) ? floatval($_GET['temperature']) : 0;
        $hum  = isset($_GET['humidity']) ? floatval($_GET['humidity']) : 0;
        $success = $ctrl->addSensorData($temp, $hum);
        echo json_encode(["success"=>$success]);
        break;

    case 'getLastHourData':
        // Mengambil data satu jam terakhir
        $data = $ctrl->getLastHourData();
        echo json_encode($data);
        break;

    case 'getAllData':
        // Dapat disertai parameter ?hours=2 dsb
        $hours = isset($_GET['hours']) ? intval($_GET['hours']) : null;
        $data = $ctrl->getAllData($hours);
        echo json_encode($data);
        break;

    case 'getFanSetting':
        // Kembalikan data fan setting
        $fanSetting = $ctrl->getFanSetting();
        echo json_encode($fanSetting);
        break;

    case 'updateFanSetting':
        // URL contoh: api.php?action=updateFanSetting&mode=manual&fanOn=1&speed=200
        $mode = isset($_GET['mode']) ? $_GET['mode'] : 'auto';
        $fanOn = isset($_GET['fanOn']) ? intval($_GET['fanOn']) : 0;
        $speed = isset($_GET['speed']) ? intval($_GET['speed']) : 0;
        $success = $ctrl->updateFanSetting($mode, $fanOn, $speed);
        echo json_encode(["success"=>$success]);
        break;

    default:
        echo json_encode(["message"=>"No action found"]);
        break;
}
?>
