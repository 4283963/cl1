package com.coldchain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemperatureReadingDto {

    private Long id;
    private Long deviceId;
    private Double temperature;
    private LocalDateTime readingTime;
}
