package com.schoolms.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class Util {
    private Util() {
    }

    public static Map<String, Object> map(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    public static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String letterFor(Double score, double maxScore) {
        if (score == null || maxScore <= 0) return null;
        double pct = (score / maxScore) * 100.0;
        if (pct >= 90) return "A+";
        if (pct >= 80) return "A";
        if (pct >= 70) return "B";
        if (pct >= 60) return "C";
        if (pct >= 50) return "D";
        if (pct >= 40) return "E";
        return "F";
    }

    public static double round(double value, int places) {
        double factor = Math.pow(10, places);
        return Math.round(value * factor) / factor;
    }

    public static String s(Map<String, Object> body, String key) {
        Object value = body == null ? null : body.get(key);
        return value == null ? null : clean(String.valueOf(value));
    }

    public static boolean b(Map<String, Object> body, String key, boolean fallback) {
        Object value = body == null ? null : body.get(key);
        if (value == null) return fallback;
        if (value instanceof Boolean bool) return bool;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    public static UUID uuid(Map<String, Object> body, String key) {
        String value = s(body, key);
        if (value == null) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Invalid identifier supplied.");
        }
    }

    @SuppressWarnings("unchecked")
    public static List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        return ((List<Object>) list).stream().filter(v -> v != null).map(String::valueOf).toList();
    }

    @SuppressWarnings("unchecked")
    public static List<UUID> uuidList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        List<UUID> ids = new java.util.ArrayList<>();
        for (Object item : list) {
            if (item == null) continue;
            try {
                ids.add(UUID.fromString(String.valueOf(item)));
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("Invalid identifier supplied.");
            }
        }
        return ids;
    }
}
