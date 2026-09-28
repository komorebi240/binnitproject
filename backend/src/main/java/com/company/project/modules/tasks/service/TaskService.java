package com.company.project.modules.tasks.service;

import com.company.project.modules.tasks.dto.request.CreateTaskRequest;
import com.company.project.modules.tasks.dto.response.TaskResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface TaskService {

    TaskResponse createTask(CreateTaskRequest request, UserPrincipal caller);

    List<TaskResponse> listTasks(UserPrincipal caller);

    TaskResponse acceptTask(Long taskId, UserPrincipal caller);

    TaskResponse declineTask(Long taskId, UserPrincipal caller);

    TaskResponse completeTask(Long taskId, UserPrincipal caller);

    TaskResponse cancelTask(Long taskId, UserPrincipal caller);
}
