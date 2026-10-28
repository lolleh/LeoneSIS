package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "schools")
public class School {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false, unique = true, length = 40)
    public String code;

    public String address;
    public String city;
    public String phone;
    public String email;
    public String principal;

    @Column(length = 500)
    public String motto;

    public boolean active = true;

    @Column(length = 1000)
    public String enabledModules;

    @Column(length = 512)
    public String logoPath;

    @Column(length = 512)
    public String badgePath;
 
    public LocalDateTime createdAt = LocalDateTime.now();

    public List<String> getEnabledModulesList() {
        if (enabledModules == null || enabledModules.isBlank()) {
            // By default enable fees and library for backward compatibility
            return new ArrayList<>(Arrays.asList("fees", "library"));
        }
        return Arrays.stream(enabledModules.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public boolean isModuleEnabled(String module) {
        if ("fees".equals(module) || "library".equals(module)) {
            return getEnabledModulesList().contains(module);
        }
        return true;
    }
}
