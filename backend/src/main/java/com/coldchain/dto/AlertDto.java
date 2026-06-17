package com.coldchain.dto;

import com.coldchain.entity.Alert;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertDto {

    private Long id;
    private Long deviceId;
    private String deviceCode;
    private String deviceName;
    private String batchNo;
    private Alert.AlertType alertType;
    private String message;
    private Double temperature;
    private Boolean acknowledged;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime createdAt;
}
