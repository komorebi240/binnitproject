package com.company.project.modules.notes.service.impl;

import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.notes.domain.NoteEntity;
import com.company.project.modules.notes.dto.request.SaveNoteRequest;
import com.company.project.modules.notes.dto.response.NoteResponse;
import com.company.project.modules.notes.repository.NoteRepository;
import com.company.project.modules.notes.service.NoteService;
import com.company.project.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Every method is implicitly scoped to {@code caller.getUserId()} - a wrong or someone-else's
 * note id reads as 404 (hides whether it exists), there is no 403 path here because there is no
 * sharing concept yet (Phase 6 plan: fully private notes).
 */
@Service
public class NoteServiceImpl implements NoteService {

    private final NoteRepository noteRepository;

    public NoteServiceImpl(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteResponse> listMine(UserPrincipal caller) {
        return noteRepository.findAllActiveByUserId(caller.getUserId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public NoteResponse create(SaveNoteRequest request, UserPrincipal caller) {
        NoteEntity saved = noteRepository.save(new NoteEntity(caller.getUserId(), request.title(), request.content()));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public NoteResponse update(Long id, SaveNoteRequest request, UserPrincipal caller) {
        NoteEntity note = noteRepository.findActiveByIdAndUserId(id, caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Note", id));
        note.update(request.title(), request.content());
        return toResponse(note);
    }

    @Override
    @Transactional
    public void delete(Long id, UserPrincipal caller) {
        NoteEntity note = noteRepository.findActiveByIdAndUserId(id, caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Note", id));
        note.markDeleted();
    }

    @Override
    @Transactional
    public NoteResponse setPinned(Long id, boolean pinned, UserPrincipal caller) {
        NoteEntity note = noteRepository.findActiveByIdAndUserId(id, caller.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Note", id));
        note.setPinned(pinned);
        return toResponse(note);
    }

    private NoteResponse toResponse(NoteEntity note) {
        return new NoteResponse(
                note.getId(), note.getTitle(), note.getContent(), note.isPinned(), note.getCreatedAt(), note.getUpdatedAt());
    }
}
