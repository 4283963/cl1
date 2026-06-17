package com.coldchain.service;

import com.coldchain.dto.AlertDto;
import com.coldchain.entity.Alert;
import com.coldchain.entity.Device;

import java.util.List;

public interface AlertService {

    Alert checkAndCreateAlert(Device device, Double temperature);

    List<AlertDto> getAllAlerts();

    List<AlertDto> getUnacknowledgedAlerts();

    AlertDto acknowledgeAlert(Long id);
}
