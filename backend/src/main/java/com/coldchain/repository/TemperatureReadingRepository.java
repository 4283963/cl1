package com.coldchain.repository;

import com.coldchain.entity.Device;
import com.coldchain.entity.TemperatureReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TemperatureReadingRepository extends JpaRepository<TemperatureReading, Long> {

    List<TemperatureReading> findByDeviceAndReadingTimeBetweenOrderByReadingTimeAsc(
            Device device, LocalDateTime startTime, LocalDateTime endTime);

    @Query("SELECT t FROM TemperatureReading t WHERE t.device.id = :deviceId AND t.readingTime >= :startTime ORDER BY t.readingTime ASC")
    List<TemperatureReading> findByDeviceIdAndReadingTimeAfter(@Param("deviceId") Long deviceId,
                                                               @Param("startTime") LocalDateTime startTime);

    boolean existsByDeviceAndReadingTimeAndTemperature(Device device, LocalDateTime readingTime, Double temperature);
}
