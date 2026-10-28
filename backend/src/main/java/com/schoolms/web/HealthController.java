package com.schoolms.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.Map;

import static com.schoolms.web.Util.map;

@RestController
@RequestMapping("/api")
public class HealthController {
    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean databaseUp;
        try (Connection connection = dataSource.getConnection()) {
            databaseUp = connection.isValid(2);
        } catch (Exception ex) {
            databaseUp = false;
        }

        Map<String, Object> body = map(
                "status", databaseUp ? "UP" : "DEGRADED",
                "database", databaseUp ? "UP" : "DOWN",
                "service", "LeoneSIS",
                "time", Instant.now().toString());

        return databaseUp ? ResponseEntity.ok(body) : ResponseEntity.status(503).body(body);
    }
}
