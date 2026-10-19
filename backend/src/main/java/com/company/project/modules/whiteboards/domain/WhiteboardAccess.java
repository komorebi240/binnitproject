package com.company.project.modules.whiteboards.domain;

/** The caller's relation to a board, as the API reports it. */
public enum WhiteboardAccess {
    OWNER,
    EDITOR,
    VIEWER;

    public boolean canEdit() {
        return this != VIEWER;
    }

    public static WhiteboardAccess of(WhiteboardRole role) {
        return role == WhiteboardRole.EDITOR ? EDITOR : VIEWER;
    }
}
