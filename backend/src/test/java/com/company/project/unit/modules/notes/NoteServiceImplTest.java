package com.company.project.unit.modules.notes;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.notes.domain.NoteEntity;
import com.company.project.modules.notes.dto.request.SaveNoteRequest;
import com.company.project.modules.notes.repository.NoteRepository;
import com.company.project.modules.notes.service.impl.NoteServiceImpl;
import com.company.project.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** Confirms Phase 6's "fully private note" rule: a wrong id or someone else's note reads as 404. */
@ExtendWith(MockitoExtension.class)
class NoteServiceImplTest {

    @Mock
    private NoteRepository noteRepository;

    private NoteServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new NoteServiceImpl(noteRepository);
    }

    private UserPrincipal principal(Long userId) {
        return new UserPrincipal(userId, "caller", null, 1L, AuthorityLevel.EMPLOYEE, null, null, true);
    }

    @Test
    void update_someoneElsesNoteIsNotFound() {
        when(noteRepository.findActiveByIdAndUserId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(5L, new SaveNoteRequest("x", "y"), principal(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_ownNoteSucceeds() {
        NoteEntity note = new NoteEntity(1L, "old title", "old content");
        when(noteRepository.findActiveByIdAndUserId(5L, 1L)).thenReturn(Optional.of(note));

        var response = service.update(5L, new SaveNoteRequest("new title", "new content"), principal(1L));

        assertThat(response.title()).isEqualTo("new title");
        assertThat(response.content()).isEqualTo("new content");
    }

    @Test
    void delete_someoneElsesNoteIsNotFound() {
        when(noteRepository.findActiveByIdAndUserId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(5L, principal(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void setPinned_ownNoteTogglesPin() {
        NoteEntity note = new NoteEntity(1L, "title", "content");
        when(noteRepository.findActiveByIdAndUserId(5L, 1L)).thenReturn(Optional.of(note));

        var response = service.setPinned(5L, true, principal(1L));

        assertThat(response.pinned()).isTrue();
    }

    @Test
    void setPinned_someoneElsesNoteIsNotFound() {
        when(noteRepository.findActiveByIdAndUserId(5L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setPinned(5L, true, principal(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
