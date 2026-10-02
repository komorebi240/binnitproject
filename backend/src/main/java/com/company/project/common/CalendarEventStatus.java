package com.company.project.common;

/**
 * CONFIRMED immediately for an event someone creates for themselves; PENDING when a manager
 * creates it for someone else, until that person ACCEPTs (-> CONFIRMED) or DECLINEs it.
 */
public enum CalendarEventStatus {
    CONFIRMED,
    PENDING,
    DECLINED
}
