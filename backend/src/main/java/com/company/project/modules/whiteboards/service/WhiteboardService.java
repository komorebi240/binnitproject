package com.company.project.modules.whiteboards.service;

import com.company.project.modules.whiteboards.dto.request.CreateWhiteboardRequest;
import com.company.project.modules.whiteboards.dto.request.RenameWhiteboardRequest;
import com.company.project.modules.whiteboards.dto.request.SaveWhiteboardSceneRequest;
import com.company.project.modules.whiteboards.dto.request.SetWhiteboardMemberRequest;
import com.company.project.modules.whiteboards.dto.response.WhiteboardDetailResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardMemberResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardSummaryResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardVersionResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

/**
 * Whiteboards a user owns or was shared. A board the caller cannot see is always "not found", never "forbidden", so ids
 * of other people's boards reveal nothing.
 */
public interface WhiteboardService {

    List<WhiteboardSummaryResponse> listBoards(UserPrincipal caller);

    WhiteboardDetailResponse createBoard(CreateWhiteboardRequest request, UserPrincipal caller);

    WhiteboardDetailResponse getBoard(Long id, UserPrincipal caller);

    WhiteboardVersionResponse getVersion(Long id, UserPrincipal caller);

    /**
     * Replaces the drawing (owner and editors). {@code baseVersion} must be the board's current version, otherwise someone
     * else saved first: 409 WHITEBOARD_CONFLICT, and the client merges the newer drawing into its own and saves again.
     */
    WhiteboardVersionResponse saveScene(Long id, SaveWhiteboardSceneRequest request, UserPrincipal caller);

    /** Owner only. */
    WhiteboardSummaryResponse renameBoard(Long id, RenameWhiteboardRequest request, UserPrincipal caller);

    /** Owner only; the board disappears for everyone it was shared with. */
    void deleteBoard(Long id, UserPrincipal caller);

    /** Owner only: shares the board with a colleague, or changes what they may do. Returns everyone on the board. */
    List<WhiteboardMemberResponse> setMember(Long id, Long userId, SetWhiteboardMemberRequest request, UserPrincipal caller);

    /** The owner removes someone, or a member leaves a board shared with them. */
    void removeMember(Long id, Long userId, UserPrincipal caller);
}
