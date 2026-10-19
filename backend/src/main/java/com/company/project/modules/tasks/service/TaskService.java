package com.company.project.modules.tasks.service;

import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.dto.request.TaskIdsRequest;
import com.company.project.modules.tasks.dto.response.HiddenTasksResponse;
import com.company.project.modules.tasks.dto.response.TaskResponse;
import com.company.project.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.core.io.Resource;

import java.util.List;

public interface TaskService {

    TaskResponse createTask(CreateTaskRequest request, UserPrincipal caller);

    List<TaskResponse> listTasks(UserPrincipal caller);

    /** Every task of a project, for the project's members (and its managers). */
    List<TaskResponse> listProjectTasks(Long projectId, UserPrincipal caller);

    TaskResponse acceptTask(Long taskId, UserPrincipal caller);

    TaskResponse declineTask(Long taskId, UserPrincipal caller);

    TaskResponse completeTask(Long taskId, UserPrincipal caller);

    TaskResponse cancelTask(Long taskId, UserPrincipal caller);

    /** Only a CANCELLED task can be restored - back to ASSIGNED, as if newly created. */
    TaskResponse restoreTask(Long taskId, UserPrincipal caller);

    /** Only a CANCELLED task can be deleted - soft-deleted, like every other entity in this
     * codebase (CLAUDE.md section 6/36), so it simply stops appearing rather than being
     * permanently destroyed. */
    void deleteTask(Long taskId, UserPrincipal caller);

    /**
     * "Clear all" under Completed / Cancelled: hides these tasks from the caller's own lists only (the task, other
     * people's lists and the KPI are untouched). Ids that are not finished or not visible to the caller are skipped
     * without saying which, so the call reveals nothing about other tasks. Returns the ids now hidden.
     */
    HiddenTasksResponse hideFinishedTasks(TaskIdsRequest request, UserPrincipal caller);

    /** Undo of {@link #hideFinishedTasks}: shows these tasks in the caller's lists again. */
    void unhideTasks(TaskIdsRequest request, UserPrincipal caller);

    /** Adds one file; allowed for the assigner, the assignee, an executive, or the head of the assigned department. */
    TaskResponse addAttachment(Long taskId, MultipartFile file, UserPrincipal caller);

    TaskResponse removeAttachment(Long taskId, Long attachmentId, UserPrincipal caller);

    /** Readable by anyone who can see the task (the same scope as the task list); everyone else gets a 404. */
    AttachmentDownload loadAttachment(Long taskId, Long attachmentId, UserPrincipal caller);

    /** A null/blank link clears it; anything but an https Google Drive/Docs link is rejected. */
    TaskResponse updateDriveUrl(Long taskId, String driveUrl, UserPrincipal caller);

    /** Whoever can manage the task may add, tick and remove checklist lines while it is open. */
    TaskResponse addChecklistItem(Long taskId, String text, UserPrincipal caller);

    /** Ticking the last open line completes the task (it must have been accepted first). */
    TaskResponse setChecklistItemDone(Long taskId, Long itemId, boolean done, UserPrincipal caller);

    TaskResponse removeChecklistItem(Long taskId, Long itemId, UserPrincipal caller);

    record AttachmentDownload(Resource data, String fileName, String contentType, boolean image) {
    }
}
