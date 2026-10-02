package com.company.project.modules.notes.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.notes.dto.request.SaveNoteRequest;
import com.company.project.modules.notes.dto.response.NoteResponse;
import com.company.project.modules.notes.service.NoteService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public ApiResponse<List<NoteResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(noteService.listMine(caller));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<NoteResponse> create(@Valid @RequestBody SaveNoteRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(noteService.create(request, caller));
    }

    @PatchMapping("/{id}")
    public ApiResponse<NoteResponse> update(
            @PathVariable Long id, @Valid @RequestBody SaveNoteRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(noteService.update(id, request, caller));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal caller) {
        noteService.delete(id, caller);
    }

    @PatchMapping("/{id}/pin")
    public ApiResponse<NoteResponse> setPinned(
            @PathVariable Long id, @RequestBody SetPinnedRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(noteService.setPinned(id, request.pinned(), caller));
    }

    public record SetPinnedRequest(boolean pinned) {
    }
}
