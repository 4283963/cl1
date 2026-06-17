package com.coldchain.service.impl;

import com.coldchain.dto.AlertDto;
import com.coldchain.dto.TemperatureReadingDto;
import com.coldchain.dto.TemperatureReportRequest;
import com.coldchain.entity.Alert;
import com.coldchain.entity.Device;
import com.coldchain.entity.TemperatureReading;
import com.coldchain.repository.TemperatureReadingRepository;
import com.coldchain.service.AlertService;
import com.coldchain.service.DeviceService;
import com.coldchain.service.TemperatureService;
import com.coldchain.websocket.AlertWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemperatureServiceImpl implements TemperatureService {

    private final TemperatureReadingRepository temperatureReadingRepository;
    private final DeviceService deviceService;
    private final AlertService alertService;
    private final AlertWebSocketHandler webSocketHandler;

    @Override
    @Transactional
    public Alert reportTemperature(TemperatureReportRequest request) {
        Device device = deviceService.getEntityByCode(request.getDeviceCode());

        deviceService.markDeviceOnline(request.getDeviceCode());

        LocalDateTime readingTime;
        if (request.getTimestamp() != null) {
            readingTime = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(request.getTimestamp()),
                    ZoneId.systemDefault()
            );
        } else {
            readingTime = LocalDateTime.now();
        }

        boolean isDuplicate = temperatureReadingRepository
                .existsByDeviceAndReadingTimeAndTemperature(device, readingTime, request.getTemperature());
        if (isDuplicate) {
            log.debug("Duplicate temperature reading ignored: device={}, time={}, temp={}",
                    device.getDeviceCode(), readingTime, request.getTemperature());
            return null;
        }

        TemperatureReading reading = TemperatureReading.builder()
                .device(device)
                .temperature(request.getTemperature())
                .readingTime(readingTime)
                .build();
        temperatureReadingRepository.save(reading);

        Alert alert = alertService.checkAndCreateAlert(device, request.getTemperature());

        if (alert != null) {
            final Long alertId = alert.getId();
            final String deviceCode = device.getDeviceCode();
            final String deviceName = device.getDeviceName();
            final String batchNo = device.getBatchNo();
            final Alert.AlertType alertType = alert.getAlertType();
            final String message = alert.getMessage();
            final Double temperature = alert.getTemperature();
            final Boolean acknowledged = alert.getAcknowledged();
            final LocalDateTime createdAt = alert.getCreatedAt();
            final Long deviceId = device.getId();

            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        AlertDto alertDto = AlertDto.builder()
                                .id(alertId)
                                .deviceId(deviceId)
                                .deviceCode(deviceCode)
                                .deviceName(deviceName)
                                .batchNo(batchNo)
                                .alertType(alertType)
                                .message(message)
                                .temperature(temperature)
                                .acknowledged(acknowledged)
                                .createdAt(createdAt)
                                .build();
                        webSocketHandler.broadcastAlert(alertDto);
                    } catch (Exception e) {
                        log.error("Failed to broadcast alert after commit", e);
                    }
                }
            });
        }

        return alert;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TemperatureReadingDto> getReadingsLastHour(Long deviceId) {
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        return temperatureReadingRepository.findByDeviceIdAndReadingTimeAfter(deviceId, oneHourAgo)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private TemperatureReadingDto toDto(TemperatureReading reading) {
        return TemperatureReadingDto.builder()
                .id(reading.getId())
                .deviceId(reading.getDevice().getId())
                .temperature(reading.getTemperature())
                .readingTime(reading.getReadingTime())
                .build();
    }
}
