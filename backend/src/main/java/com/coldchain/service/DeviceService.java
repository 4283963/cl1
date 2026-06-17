package com.coldchain.service;

import com.coldchain.dto.DeviceDto;
import com.coldchain.dto.DeviceRegisterRequest;
import com.coldchain.entity.Device;

import java.util.List;

public interface DeviceService {

    DeviceDto registerDevice(DeviceRegisterRequest request);

    List<DeviceDto> getAllDevices();

    DeviceDto getDeviceById(Long id);

    Device getEntityByCode(String deviceCode);

    void markDeviceOnline(String deviceCode);

    void checkAndMarkOfflineDevices();
}
