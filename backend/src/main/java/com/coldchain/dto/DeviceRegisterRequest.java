package com.coldchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeviceRegisterRequest {

    @NotBlank
    private String deviceCode;

    @NotBlank
    private String deviceName;

    @NotBlank
    private String deviceType;

    private String location;

    private String batchNo;

    @NotNull
    private Double minTemp;

    @NotNull
    private Double maxTemp;
}
