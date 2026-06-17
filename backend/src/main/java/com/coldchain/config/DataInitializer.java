package com.coldchain.config;

import com.coldchain.entity.Device;
import com.coldchain.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DeviceRepository deviceRepository;

    @Override
    public void run(String... args) {
        if (deviceRepository.count() > 0) {
            return;
        }

        log.info("Initializing sample data...");

        Device coldStorage1 = Device.builder()
                .deviceCode("CS-001")
                .deviceName("1号冷库")
                .deviceType(Device.DeviceType.COLD_STORAGE)
                .location("北京疾控中心A区")
                .batchNo("VAC-2024-001")
                .minTemp(2.0)
                .maxTemp(8.0)
                .online(false)
                .build();
        deviceRepository.save(coldStorage1);

        Device coldStorage2 = Device.builder()
                .deviceCode("CS-002")
                .deviceName("2号冷库")
                .deviceType(Device.DeviceType.COLD_STORAGE)
                .location("北京疾控中心B区")
                .batchNo("VAC-2024-002")
                .minTemp(2.0)
                .maxTemp(8.0)
                .online(false)
                .build();
        deviceRepository.save(coldStorage2);

        Device truck1 = Device.builder()
                .deviceCode("TRK-001")
                .deviceName("冷链车A-001")
                .deviceType(Device.DeviceType.REFRIGERATED_TRUCK)
                .location("运输中：北京-上海")
                .batchNo("VAC-2024-003")
                .minTemp(2.0)
                .maxTemp(8.0)
                .online(false)
                .build();
        deviceRepository.save(truck1);

        Device truck2 = Device.builder()
                .deviceCode("TRK-002")
                .deviceName("冷链车A-002")
                .deviceType(Device.DeviceType.REFRIGERATED_TRUCK)
                .location("运输中：北京-广州")
                .batchNo("VAC-2024-004")
                .minTemp(2.0)
                .maxTemp(8.0)
                .online(false)
                .build();
        deviceRepository.save(truck2);

        Device truck3 = Device.builder()
                .deviceCode("TRK-003")
                .deviceName("冷链车B-001")
                .deviceType(Device.DeviceType.REFRIGERATED_TRUCK)
                .location("待发车")
                .batchNo("VAC-2024-005")
                .minTemp(2.0)
                .maxTemp(8.0)
                .online(false)
                .build();
        deviceRepository.save(truck3);

        log.info("Sample data initialized: 5 devices created.");
    }
}
