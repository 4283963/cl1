package com.coldchain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertType alertType;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    private Double temperature;

    @Column(nullable = false)
    private Boolean acknowledged;

    private LocalDateTime acknowledgedAt;

    private LocalDateTime createdAt;

    public enum AlertType {
        TEMP_TOO_HIGH,
        TEMP_TOO_LOW,
        DEVICE_OFFLINE
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (acknowledged == null) {
            acknowledged = false;
        }
    }
}
