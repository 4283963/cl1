package com.coldchain.repository;

import com.coldchain.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByDeviceCode(String deviceCode);

    List<Device> findAllByOrderByCreatedAtDesc();

    @Query("SELECT d FROM Device d WHERE d.online = true AND d.lastSeenAt < :cutoffTime")
    List<Device> findDevicesToMarkOffline(LocalDateTime cutoffTime);
}
