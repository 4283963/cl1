package com.coldchain.dto;

import com.coldchain.entity.Device;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceDto {

    private Long id;
    private String deviceCode;
    private String deviceName;
    private Device.DeviceType deviceType;
    private String location;
    private String batchNo;
    private Double minTemp;
    private Double maxTemp;
    private Boolean online;
    private LocalDateTime lastSeenAt;
    private LocalDateTime createdAt;
    private Double currentTemp;
}
