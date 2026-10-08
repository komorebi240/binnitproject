package com.company.project.modules.crm.domain;

/** Where the customers of a dataset came from; used to group and filter datasets, never to change behaviour. */
public enum CrmSourceType {
    FACEBOOK,
    ZALO,
    WEBSITE,
    EXCEL,
    EVENT,
    REFERRAL,
    OTHER
}
