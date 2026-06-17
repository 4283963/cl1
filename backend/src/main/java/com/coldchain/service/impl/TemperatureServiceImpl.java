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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

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

        TemperatureReading reading = TemperatureReading.builder()
                .device(device)
                .temperature(request.getTemperature())
                .readingTime(readingTime)
                .build();
        temperatureReadingRepository.save(reading);

        Alert alert = alertService.checkAndCreateAlert(device, request.getTemperature());

        if (alert != null) {
            AlertDto alertDto = AlertDto.builder()
                    .id(alert.getId())
                    .deviceId(device.getId())
                    .deviceCode(device.getDeviceCode())
                    .deviceName(device.getDeviceName())
                    .batchNo(device.getBatchNo())
                    .alertType(alert.getAlertType())
                    .message(alert.getMessage())
                    .temperature(alert.getTemperature())
                    .acknowledged(alert.getAcknowledged())
                    .createdAt(alert.getCreatedAt())
                    .build();
            webSocketHandler.broadcastAlert(alertDto);
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
