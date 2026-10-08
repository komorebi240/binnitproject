package com.company.project.modules.crm.service;

import com.company.project.modules.crm.dto.request.CreateColumnRequest;
import com.company.project.modules.crm.dto.request.CreateDatasetRequest;
import com.company.project.modules.crm.dto.request.RenameColumnRequest;
import com.company.project.modules.crm.dto.request.UpdateDatasetRequest;
import com.company.project.modules.crm.dto.response.ColumnResponse;
import com.company.project.modules.crm.dto.response.DatasetDetailResponse;
import com.company.project.modules.crm.dto.response.DatasetResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface CrmDatasetService {

    /** The datasets of the caller's company that the caller may use. */
    List<DatasetResponse> list(UserPrincipal caller);

    DatasetDetailResponse get(Long datasetId, UserPrincipal caller);

    /** Creates a dataset with the usual first columns (name, email, phone) in the language of the request. */
    DatasetDetailResponse create(CreateDatasetRequest request, UserPrincipal caller);

    DatasetResponse update(Long datasetId, UpdateDatasetRequest request, UserPrincipal caller);

    /** Removes the dataset and really deletes its customers. */
    void delete(Long datasetId, UserPrincipal caller);

    ColumnResponse addColumn(Long datasetId, CreateColumnRequest request, UserPrincipal caller);

    ColumnResponse renameColumn(Long columnId, RenameColumnRequest request, UserPrincipal caller);

    /** Removes the column and the values it held from every customer. */
    void deleteColumn(Long columnId, UserPrincipal caller);
}
