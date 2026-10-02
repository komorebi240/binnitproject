package com.company.project.modules.kpi.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.TaskStatus;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.kpi.domain.KpiConfigEntity;
import com.company.project.modules.kpi.domain.KpiIncentiveTierEntity;
import com.company.project.modules.kpi.dto.request.IncentiveTierInput;
import com.company.project.modules.kpi.dto.request.ReplaceIncentiveTiersRequest;
import com.company.project.modules.kpi.dto.request.UpdateKpiConfigRequest;
import com.company.project.modules.kpi.dto.response.IncentiveTierResponse;
import com.company.project.modules.kpi.dto.response.KpiConfigResponse;
import com.company.project.modules.kpi.dto.response.KpiSummaryResponse;
import com.company.project.modules.kpi.repository.KpiConfigRepository;
import com.company.project.modules.kpi.repository.KpiIncentiveTierRepository;
import com.company.project.modules.kpi.service.KpiService;
import com.company.project.modules.tasks.domain.TaskEntity;
import com.company.project.modules.tasks.repository.TaskRepository;
import com.company.project.security.UserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Computes a monthly KPI score from tasks personally assigned to a user (Phase 5 plan) -
 * completionRate and onTimeRate weighted by the company's configured
 * {@link KpiConfigEntity#getCompletionWeight()}. Scope checks for viewing someone else's KPI
 * mirror {@code UserManagementServiceImpl.assertCallerCanManage} exactly (same hierarchy,
 * same 404-vs-403 split) rather than introducing a new authorization rule.
 */
@Service
public class KpiServiceImpl implements KpiService {

    private final KpiConfigRepository kpiConfigRepository;
    private final KpiIncentiveTierRepository kpiIncentiveTierRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;

    public KpiServiceImpl(
            KpiConfigRepository kpiConfigRepository,
            KpiIncentiveTierRepository kpiIncentiveTierRepository,
            TaskRepository taskRepository,
            UserRepository userRepository,
            PositionRepository positionRepository
    ) {
        this.kpiConfigRepository = kpiConfigRepository;
        this.kpiIncentiveTierRepository = kpiIncentiveTierRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public KpiConfigResponse getConfig(UserPrincipal caller) {
        return toConfigResponse(caller.getCompanyId());
    }

    @Override
    @Transactional
    public KpiConfigResponse updateConfig(UpdateKpiConfigRequest request, UserPrincipal caller) {
        requireExecutive(caller);

        KpiConfigEntity config = kpiConfigRepository.findByCompanyId(caller.getCompanyId())
                .orElseGet(() -> new KpiConfigEntity(caller.getCompanyId(), KpiConfigEntity.DEFAULT_COMPLETION_WEIGHT));
        config.setCompletionWeight(request.completionWeight());
        kpiConfigRepository.save(config);

        return toConfigResponse(caller.getCompanyId());
    }

    @Override
    @Transactional
    public KpiConfigResponse replaceIncentiveTiers(ReplaceIncentiveTiersRequest request, UserPrincipal caller) {
        requireExecutive(caller);

        kpiIncentiveTierRepository.deleteAllByCompanyId(caller.getCompanyId());
        List<IncentiveTierInput> tiers = request.tiers();
        for (int i = 0; i < tiers.size(); i++) {
            IncentiveTierInput tier = tiers.get(i);
            kpiIncentiveTierRepository.save(
                    new KpiIncentiveTierEntity(caller.getCompanyId(), tier.minScore(), tier.label(), i));
        }

        return toConfigResponse(caller.getCompanyId());
    }

    @Override
    @Transactional(readOnly = true)
    public KpiSummaryResponse getMyKpiSummary(UserPrincipal caller) {
        UserEntity user = userRepository.findActiveById(caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", caller.getUserId()));
        return computeSummary(user, caller.getCompanyId());
    }

    @Override
    @Transactional(readOnly = true)
    public KpiSummaryResponse getUserKpiSummary(Long userId, UserPrincipal caller) {
        UserEntity target = userRepository.findActiveById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!target.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("User", userId);
        }
        PositionEntity targetPosition = positionRepository.findActiveByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        assertCallerCanView(caller, targetPosition);

        return computeSummary(target, caller.getCompanyId());
    }

    /** Mirrors UserManagementServiceImpl.assertCallerCanManage - same hierarchy, no new rule. */
    private void assertCallerCanView(UserPrincipal caller, PositionEntity target) {
        switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> {
                // Any position within the same company (already verified by the caller).
            }
            case DEPARTMENT_HEAD -> {
                if (!caller.getDepartmentId().equals(target.getDepartmentId())) {
                    throw new AccessDeniedException("You can only view KPI for members of your own department");
                }
            }
            case TEAM_LEAD -> {
                if (!caller.getTeamId().equals(target.getTeamId())) {
                    throw new AccessDeniedException("You can only view KPI for members of your own team");
                }
            }
            case EMPLOYEE -> throw new AccessDeniedException("Employees cannot view another user's KPI");
        }
    }

    private void requireExecutive(UserPrincipal caller) {
        if (caller.getAuthorityLevel() != AuthorityLevel.EXECUTIVE) {
            throw new AccessDeniedException("Only an executive can configure KPI settings");
        }
    }

    private KpiConfigResponse toConfigResponse(Long companyId) {
        double completionWeight = kpiConfigRepository.findByCompanyId(companyId)
                .map(KpiConfigEntity::getCompletionWeight)
                .orElse(KpiConfigEntity.DEFAULT_COMPLETION_WEIGHT);

        List<IncentiveTierResponse> tiers = kpiIncentiveTierRepository.findAllByCompanyIdOrderBySortOrder(companyId)
                .stream()
                .map(t -> new IncentiveTierResponse(t.getId(), t.getMinScore(), t.getLabel()))
                .toList();

        double onTimeWeight = Math.round((1 - completionWeight) * 100) / 100.0;
        return new KpiConfigResponse(completionWeight, onTimeWeight, tiers);
    }

    private KpiSummaryResponse computeSummary(UserEntity user, Long companyId) {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        Instant monthStart = now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();

        List<TaskEntity> tasksThisMonth =
                taskRepository.findAllActiveByAssigneeUserIdAndCreatedAtAfter(user.getId(), monthStart);

        List<TaskEntity> countedTasks = tasksThisMonth.stream()
                .filter(t -> t.getStatus() != TaskStatus.CANCELLED)
                .toList();
        List<TaskEntity> doneTasks = countedTasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.DONE)
                .toList();

        int totalAssigned = countedTasks.size();
        int completed = doneTasks.size();
        double completionRate = totalAssigned == 0 ? 0.0 : (double) completed / totalAssigned;

        List<TaskEntity> doneWithDueDate = doneTasks.stream().filter(t -> t.getDueDate() != null).toList();
        long onTimeCount = doneWithDueDate.stream()
                .filter(t -> !t.getCompletedAt().atZone(ZoneOffset.UTC).toLocalDate().isAfter(t.getDueDate()))
                .count();
        // No due dates set on any completed task -> don't penalize for something that was never
        // tracked. Only meaningful when something was actually completed - with zero completed
        // tasks this must NOT default to 1.0, or a totally idle month would score a "free"
        // partial credit from the on-time term alone instead of a flat 0.
        double onTimeRate = doneWithDueDate.isEmpty() ? (completed == 0 ? 0.0 : 1.0)
                : (double) onTimeCount / doneWithDueDate.size();

        double completionWeight = kpiConfigRepository.findByCompanyId(companyId)
                .map(KpiConfigEntity::getCompletionWeight)
                .orElse(KpiConfigEntity.DEFAULT_COMPLETION_WEIGHT);
        int kpiScore = totalAssigned == 0 ? 0
                : (int) Math.round((completionWeight * completionRate + (1 - completionWeight) * onTimeRate) * 100);

        String incentiveLabel = kpiIncentiveTierRepository.findAllByCompanyIdOrderBySortOrder(companyId).stream()
                .filter(t -> t.getMinScore() <= kpiScore)
                .max((a, b) -> Integer.compare(a.getMinScore(), b.getMinScore()))
                .map(KpiIncentiveTierEntity::getLabel)
                .orElse(null);

        return new KpiSummaryResponse(
                user.getId(),
                user.getFullName(),
                now.getYear(),
                now.getMonthValue(),
                totalAssigned,
                completed,
                Math.round(completionRate * 1000) / 10.0,
                Math.round(onTimeRate * 1000) / 10.0,
                kpiScore,
                incentiveLabel);
    }
}
