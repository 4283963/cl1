package com.coldchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TemperatureReportRequest {

    @NotBlank
    private String deviceCode;

    @NotNull
    private Double temperature;

    private Long timestamp;
}
