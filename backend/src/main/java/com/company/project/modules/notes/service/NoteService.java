package com.company.project.modules.notes.service;

import com.company.project.modules.notes.dto.request.SaveNoteRequest;
import com.company.project.modules.notes.dto.response.NoteResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface NoteService {

    List<NoteResponse> listMine(UserPrincipal caller);

    NoteResponse create(SaveNoteRequest request, UserPrincipal caller);

    NoteResponse update(Long id, SaveNoteRequest request, UserPrincipal caller);

    void delete(Long id, UserPrincipal caller);

    NoteResponse setPinned(Long id, boolean pinned, UserPrincipal caller);
}
