package com.company.project.modules.tasks.dto.response;

import java.util.List;

/** The tasks that were actually hidden, which is what an undo should send back. */
public record HiddenTasksResponse(List<Long> taskIds) {
}
