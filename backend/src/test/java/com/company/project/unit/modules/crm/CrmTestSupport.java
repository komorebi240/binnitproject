package com.company.project.unit.modules.crm;

import com.company.project.common.AuthorityLevel;
import com.company.project.modules.crm.CrmProperties;
import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.company.project.modules.crm.domain.CrmDatasetEntity;
import com.company.project.modules.crm.domain.CrmSourceType;
import com.company.project.modules.crm.service.CrmCrypto;
import com.company.project.modules.crm.service.CrmRowCodec;
import com.company.project.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.lang.reflect.Field;
import java.util.Base64;

/** Fixtures shared by the CRM unit tests: people, datasets, columns and a real (not mocked) codec, so the tests see real ciphertext. */
final class CrmTestSupport {

    static final Long COMPANY = 1L;
    static final Long OTHER_COMPANY = 2L;
    static final Long ENGINEERING = 10L;
    static final Long SALES = 11L;

    static final CrmProperties PROPERTIES = new CrmProperties(
            Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes()),
            100, 5_242_880, 1000, 6, 500);

    static final CrmCrypto CRYPTO = new CrmCrypto(PROPERTIES);
    static final CrmRowCodec CODEC = new CrmRowCodec(CRYPTO, new ObjectMapper());

    private CrmTestSupport() {
    }

    static UserPrincipal executive(Long userId, Long companyId) {
        return new UserPrincipal(userId, "exec" + userId, null, companyId, AuthorityLevel.EXECUTIVE, null, null, true);
    }

    static UserPrincipal head(Long userId, Long departmentId) {
        return new UserPrincipal(userId, "head" + userId, null, COMPANY, AuthorityLevel.DEPARTMENT_HEAD, departmentId, null, true);
    }

    static UserPrincipal employee(Long userId, Long departmentId) {
        return new UserPrincipal(userId, "emp" + userId, null, COMPANY, AuthorityLevel.EMPLOYEE, departmentId, null, true);
    }

    static CrmDatasetEntity dataset(Long id, Long companyId, Long departmentId, Long createdBy) {
        CrmDatasetEntity dataset = new CrmDatasetEntity(companyId, "Leads", CrmSourceType.FACEBOOK, null, departmentId, createdBy);
        setId(dataset, id);
        return dataset;
    }

    static CrmColumnEntity column(Long id, Long datasetId, String name, CrmColumnType type, int position) {
        CrmColumnEntity column = new CrmColumnEntity(datasetId, name, type, position);
        setId(column, id);
        return column;
    }

    static void setId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
