package com.coldchain.service.impl;

import com.coldchain.dto.AlertDto;
import com.coldchain.entity.Alert;
import com.coldchain.entity.Device;
import com.coldchain.repository.AlertRepository;
import com.coldchain.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;

    @Value("${app.alert.cooldown-seconds:300}")
    private int alertCooldownSeconds;

    private final ConcurrentHashMap<String, ReentrantLock> deviceAlertLocks = new ConcurrentHashMap<>();

    private String lockKey(Device device, Alert.AlertType alertType) {
        return device.getId() + ":" + alertType.name();
    }

    @Override
    @Transactional
    public Alert checkAndCreateAlert(Device device, Double temperature) {
        Alert.AlertType alertType = null;
        String message = null;

        if (temperature > device.getMaxTemp()) {
            alertType = Alert.AlertType.TEMP_TOO_HIGH;
            message = String.format("设备[%s]批次[%s]温度%.2f℃超过上限%.2f℃，疫苗有变质风险！",
                    device.getDeviceName(),
                    device.getBatchNo() != null ? device.getBatchNo() : "未知",
                    temperature,
                    device.getMaxTemp());
        } else if (temperature < device.getMinTemp()) {
            alertType = Alert.AlertType.TEMP_TOO_LOW;
            message = String.format("设备[%s]批次[%s]温度%.2f℃低于下限%.2f℃，疫苗有变质风险！",
                    device.getDeviceName(),
                    device.getBatchNo() != null ? device.getBatchNo() : "未知",
                    temperature,
                    device.getMinTemp());
        }

        if (alertType == null) {
            return null;
        }

        String key = lockKey(device, alertType);
        ReentrantLock lock = deviceAlertLocks.computeIfAbsent(key, k -> new ReentrantLock());

        lock.lock();
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusSeconds(alertCooldownSeconds);
            Optional<Alert> recentAlert = alertRepository.findLatestUnacknowledgedByDeviceAndType(device, alertType, cutoffTime);

            if (recentAlert.isPresent()) {
                log.debug("Alert cooldown active, skipping: device={}, type={}", device.getDeviceCode(), alertType);
                return null;
            }

            Alert alert = Alert.builder()
                    .device(device)
                    .alertType(alertType)
                    .message(message)
                    .temperature(temperature)
                    .acknowledged(false)
                    .build();

            return alertRepository.save(alert);
        } finally {
            lock.unlock();
            deviceAlertLocks.remove(key, lock);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertDto> getAllAlerts() {
        return alertRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertDto> getUnacknowledgedAlerts() {
        return alertRepository.findByAcknowledgedFalseOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AlertDto acknowledgeAlert(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + id));
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        return toDto(alertRepository.save(alert));
    }

    private AlertDto toDto(Alert alert) {
        return AlertDto.builder()
                .id(alert.getId())
                .deviceId(alert.getDevice().getId())
                .deviceCode(alert.getDevice().getDeviceCode())
                .deviceName(alert.getDevice().getDeviceName())
                .batchNo(alert.getDevice().getBatchNo())
                .alertType(alert.getAlertType())
                .message(alert.getMessage())
                .temperature(alert.getTemperature())
                .acknowledged(alert.getAcknowledged())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}
