package com.company.project.modules.messages.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Who receives a copy of the message; each gets it in their own 1-1 conversation with the caller. */
public record ForwardMessageRequest(
        @NotEmpty(message = "recipientUserIds is required")
        @Size(max = 10, message = "a message can be forwarded to at most 10 people at once")
        List<@NotNull Long> recipientUserIds
) {
}
