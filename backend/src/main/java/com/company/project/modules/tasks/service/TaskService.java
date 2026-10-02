package com.company.project.modules.tasks.service;

import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.dto.response.TaskResponse;
import com.company.project.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

import java.util.List;

public interface TaskService {

    TaskResponse createTask(CreateTaskRequest request, UserPrincipal caller);

    List<TaskResponse> listTasks(UserPrincipal caller);

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

    /** Adds one file; allowed for the assigner, the assignee, an executive, or the head of the assigned department. */
    TaskResponse addAttachment(Long taskId, MultipartFile file, UserPrincipal caller);

    TaskResponse removeAttachment(Long taskId, Long attachmentId, UserPrincipal caller);

    /** Readable by anyone who can see the task (the same scope as the task list); everyone else gets a 404. */
    AttachmentDownload loadAttachment(Long taskId, Long attachmentId, UserPrincipal caller);

    /** A null/blank link clears it; anything but an https Google Drive/Docs link is rejected. */
    TaskResponse updateDriveUrl(Long taskId, String driveUrl, UserPrincipal caller);

    record AttachmentDownload(InputStream data, long sizeBytes, String fileName, String contentType, boolean image) {
    }
}
