package com.company.project.modules.identity.service;

import com.company.project.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.Set;

/** The preset colours and icons a department can use; the frontend offers exactly these keys. */
public final class DepartmentAppearance {

    public static final Set<String> COLORS = Set.of(
            "indigo", "violet", "sky", "teal", "emerald", "amber", "rose", "slate");
    public static final Set<String> ICONS = Set.of(
            "building", "code", "chart", "users", "megaphone", "wallet", "headset", "gear", "shield", "rocket");

    private DepartmentAppearance() {
    }

    /** Blank means "default"; anything else must be a preset key. */
    public static String normalizeColor(String color) {
        return normalize(color, COLORS, "color");
    }

    public static String normalizeIcon(String icon) {
        return normalize(icon, ICONS, "icon");
    }

    private static String normalize(String value, Set<String> allowed, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String key = value.trim().toLowerCase();
        if (!allowed.contains(key)) {
            throw new BusinessException("INVALID_APPEARANCE", "Unknown " + field + " preset", HttpStatus.BAD_REQUEST);
        }
        return key;
    }
}
