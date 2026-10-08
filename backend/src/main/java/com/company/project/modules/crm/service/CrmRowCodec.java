package com.company.project.modules.crm.service;

import com.company.project.modules.crm.domain.CrmColumnEntity;
import com.company.project.modules.crm.domain.CrmColumnType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns a row's values into what is stored and back: checks each cell against its column, writes the values as one JSON
 * object encrypted with the company's key, and computes the keyed hashes of the dataset's first email and first phone
 * column that duplicate detection uses. Every path that stores a row (typing, importing, deleting a column) goes through
 * here, so they cannot disagree.
 */
@Component
public class CrmRowCodec {

    private static final TypeReference<Map<Long, String>> VALUES_TYPE = new TypeReference<>() { };

    /** A cell that was refused and why (the column's name and the reason, never the value). */
    public record CellProblem(String columnName, CrmCells.Problem problem) {
    }

    /** {@code values} holds only the cells that have something in them. */
    public record Normalized(Map<Long, String> values, List<CellProblem> problems) {
    }

    private final CrmCrypto crypto;
    private final ObjectMapper objectMapper;

    public CrmRowCodec(CrmCrypto crypto, ObjectMapper objectMapper) {
        this.crypto = crypto;
        this.objectMapper = objectMapper;
    }

    /** Checks and cleans {@code raw} (values by column id) against {@code columns}; ids that are not columns are ignored. */
    public Normalized normalize(List<CrmColumnEntity> columns, Map<Long, String> raw) {
        Map<Long, String> values = new LinkedHashMap<>();
        List<CellProblem> problems = new ArrayList<>();
        for (CrmColumnEntity column : columns) {
            if (!raw.containsKey(column.getId())) {
                continue;
            }
            CrmCells.Result result = CrmCells.normalize(column.getDataType(), raw.get(column.getId()));
            if (result.problem() != null) {
                problems.add(new CellProblem(column.getName(), result.problem()));
            } else if (!result.value().isEmpty()) {
                values.put(column.getId(), result.value());
            }
        }
        return new Normalized(values, problems);
    }

    public String encode(Long companyId, Map<Long, String> values) {
        try {
            return crypto.encrypt(companyId, objectMapper.writeValueAsString(values));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise CRM row", e);
        }
    }

    public Map<Long, String> decode(Long companyId, String data) {
        try {
            return objectMapper.readValue(crypto.decrypt(companyId, data), VALUES_TYPE);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not read CRM row", e);
        }
    }

    /** Keyed hash of the first EMAIL column's value, or null when the row has none. {@code columns} must be in position order. */
    public String emailHash(Long companyId, List<CrmColumnEntity> columns, Map<Long, String> values) {
        return firstOfType(columns, CrmColumnType.EMAIL, values)
                .map(email -> crypto.blindIndex(companyId, "email:" + email))
                .orElse(null);
    }

    /** Keyed hash of the first PHONE column's value in its canonical digits, or null when the row has none. */
    public String phoneHash(Long companyId, List<CrmColumnEntity> columns, Map<Long, String> values) {
        return firstOfType(columns, CrmColumnType.PHONE, values)
                .map(phone -> crypto.blindIndex(companyId, "phone:" + CrmCells.phoneDigits(phone)))
                .orElse(null);
    }

    private static java.util.Optional<String> firstOfType(List<CrmColumnEntity> columns, CrmColumnType type, Map<Long, String> values) {
        return columns.stream()
                .filter(column -> column.getDataType() == type)
                .findFirst()
                .map(column -> values.get(column.getId()))
                .filter(value -> !value.isEmpty());
    }
}
