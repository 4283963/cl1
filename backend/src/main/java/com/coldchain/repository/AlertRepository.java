package com.coldchain.repository;

import com.coldchain.entity.Alert;
import com.coldchain.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findAllByOrderByCreatedAtDesc();

    List<Alert> findByAcknowledgedFalseOrderByCreatedAtDesc();

    @Query("SELECT a FROM Alert a WHERE a.device = :device AND a.alertType = :alertType AND a.createdAt >= :cutoffTime ORDER BY a.createdAt DESC")
    List<Alert> findRecentAlerts(@Param("device") Device device,
                                 @Param("alertType") Alert.AlertType alertType,
                                 @Param("cutoffTime") LocalDateTime cutoffTime);

    default Optional<Alert> findLatestUnacknowledgedByDeviceAndType(Device device, Alert.AlertType alertType, LocalDateTime cutoffTime) {
        List<Alert> alerts = findRecentAlerts(device, alertType, cutoffTime);
        return alerts.isEmpty() ? Optional.empty() : Optional.of(alerts.get(0));
    }
}
