package com.coldchain.controller;

import com.coldchain.dto.TemperatureReadingDto;
import com.coldchain.dto.TemperatureReportRequest;
import com.coldchain.entity.Alert;
import com.coldchain.service.TemperatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/temperature")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TemperatureController {

    private final TemperatureService temperatureService;

    @PostMapping("/report")
    public ResponseEntity<Map<String, Object>> reportTemperature(@Valid @RequestBody TemperatureReportRequest request) {
        Alert alert = temperatureService.reportTemperature(request);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("alertGenerated", alert != null);
        if (alert != null) {
            result.put("alertId", alert.getId());
            result.put("alertType", alert.getAlertType());
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/device/{deviceId}/last-hour")
    public ResponseEntity<List<TemperatureReadingDto>> getReadingsLastHour(@PathVariable Long deviceId) {
        return ResponseEntity.ok(temperatureService.getReadingsLastHour(deviceId));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}
