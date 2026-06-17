package com.coldchain.service;

import com.coldchain.dto.TemperatureReadingDto;
import com.coldchain.dto.TemperatureReportRequest;
import com.coldchain.entity.Alert;

import java.util.List;

public interface TemperatureService {

    Alert reportTemperature(TemperatureReportRequest request);

    List<TemperatureReadingDto> getReadingsLastHour(Long deviceId);
}
