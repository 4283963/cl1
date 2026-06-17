package com.coldchain.service.impl;

import com.coldchain.dto.DeviceDto;
import com.coldchain.dto.DeviceRegisterRequest;
import com.coldchain.entity.Device;
import com.coldchain.entity.TemperatureReading;
import com.coldchain.repository.DeviceRepository;
import com.coldchain.repository.TemperatureReadingRepository;
import com.coldchain.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeviceServiceImpl implements DeviceService {

    private final DeviceRepository deviceRepository;
    private final TemperatureReadingRepository temperatureReadingRepository;

    @Value("${app.device.offline-timeout-seconds:30}")
    private int offlineTimeoutSeconds;

    @Override
    @Transactional
    public DeviceDto registerDevice(DeviceRegisterRequest request) {
        if (deviceRepository.findByDeviceCode(request.getDeviceCode()).isPresent()) {
            throw new IllegalArgumentException("Device code already exists: " + request.getDeviceCode());
        }

        Device device = Device.builder()
                .deviceCode(request.getDeviceCode())
                .deviceName(request.getDeviceName())
                .deviceType(Device.DeviceType.valueOf(request.getDeviceType()))
                .location(request.getLocation())
                .batchNo(request.getBatchNo())
                .minTemp(request.getMinTemp())
                .maxTemp(request.getMaxTemp())
                .online(false)
                .build();

        device = deviceRepository.save(device);
        return toDto(device, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceDto> getAllDevices() {
        List<Device> devices = deviceRepository.findAllByOrderByCreatedAtDesc();
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        return devices.stream()
                .map(device -> {
                    List<TemperatureReading> readings = temperatureReadingRepository
                            .findByDeviceAndReadingTimeBetweenOrderByReadingTimeAsc(device, oneHourAgo, LocalDateTime.now());
                    Double currentTemp = readings.isEmpty() ? null :
                            readings.get(readings.size() - 1).getTemperature();
                    return toDto(device, currentTemp);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceDto getDeviceById(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + id));
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<TemperatureReading> readings = temperatureReadingRepository
                .findByDeviceAndReadingTimeBetweenOrderByReadingTimeAsc(device, oneHourAgo, LocalDateTime.now());
        Double currentTemp = readings.isEmpty() ? null :
                readings.get(readings.size() - 1).getTemperature();
        return toDto(device, currentTemp);
    }

    @Override
    @Transactional(readOnly = true)
    public Device getEntityByCode(String deviceCode) {
        return deviceRepository.findByDeviceCode(deviceCode)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceCode));
    }

    @Override
    @Transactional
    public void markDeviceOnline(String deviceCode) {
        Device device = getEntityByCode(deviceCode);
        device.setOnline(true);
        device.setLastSeenAt(LocalDateTime.now());
        deviceRepository.save(device);
    }

    @Override
    @Scheduled(fixedDelayString = "${app.device.offline-timeout-seconds:30}000")
    @Transactional
    public void checkAndMarkOfflineDevices() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusSeconds(offlineTimeoutSeconds);
        List<Device> devicesToOffline = deviceRepository.findDevicesToMarkOffline(cutoffTime);
        for (Device device : devicesToOffline) {
            device.setOnline(false);
        }
        deviceRepository.saveAll(devicesToOffline);
    }

    private DeviceDto toDto(Device device, Double currentTemp) {
        return DeviceDto.builder()
                .id(device.getId())
                .deviceCode(device.getDeviceCode())
                .deviceName(device.getDeviceName())
                .deviceType(device.getDeviceType())
                .location(device.getLocation())
                .batchNo(device.getBatchNo())
                .minTemp(device.getMinTemp())
                .maxTemp(device.getMaxTemp())
                .online(device.getOnline())
                .lastSeenAt(device.getLastSeenAt())
                .createdAt(device.getCreatedAt())
                .currentTemp(currentTemp)
                .build();
    }
}
