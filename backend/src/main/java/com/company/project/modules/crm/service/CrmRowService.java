package com.company.project.modules.crm.service;

import com.company.project.modules.crm.dto.request.SaveRowRequest;
import com.company.project.modules.crm.dto.response.RowPageResponse;
import com.company.project.modules.crm.dto.response.RowResponse;
import com.company.project.security.UserPrincipal;

public interface CrmRowService {

    /**
     * One page of a dataset's customers. With {@code query}, the customers whose any value contains the text
     * (case and accents ignored) - found by reading the dataset, since the values are stored encrypted.
     */
    RowPageResponse list(Long datasetId, int page, int size, String query, UserPrincipal caller);

    RowResponse add(Long datasetId, SaveRowRequest request, UserPrincipal caller);

    /** Changes only the columns present in the request; a blank value empties the cell. */
    RowResponse update(Long rowId, SaveRowRequest request, UserPrincipal caller);

    /** Really deletes the customer. Allowed to those who manage the dataset and to whoever added the customer. */
    void delete(Long rowId, UserPrincipal caller);
}
