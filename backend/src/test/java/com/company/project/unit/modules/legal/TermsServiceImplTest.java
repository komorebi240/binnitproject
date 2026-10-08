package com.company.project.unit.modules.legal;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.legal.domain.TermsAcceptanceEntity;
import com.company.project.modules.legal.domain.TermsVersionEntity;
import com.company.project.modules.legal.dto.response.TermsResponse;
import com.company.project.modules.legal.repository.TermsAcceptanceRepository;
import com.company.project.modules.legal.repository.TermsVersionRepository;
import com.company.project.modules.legal.service.impl.TermsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Nobody uses the product without having accepted the newest terms, and the acceptance is kept as evidence. */
@ExtendWith(MockitoExtension.class)
class TermsServiceImplTest {

    @Mock
    private TermsVersionRepository versionRepository;
    @Mock
    private TermsAcceptanceRepository acceptanceRepository;

    private TermsServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        service = new TermsServiceImpl(versionRepository, acceptanceRepository);
        TermsVersionEntity v1 = new TermsVersionEntityBuilder().version(1).publishedAt(Instant.parse("2026-10-07T17:00:00Z")).build();
        when(versionRepository.findFirstByOrderByVersionDesc()).thenReturn(Optional.of(v1));
    }

    @Test
    void getCurrent_returnsTheNewestVersionInTheRequestedLanguage() {
        TermsResponse vi = service.getCurrent("vi");
        TermsResponse en = service.getCurrent("en");

        assertThat(vi.version()).isEqualTo(1);
        assertThat(vi.language()).isEqualTo("vi");
        assertThat(vi.title()).startsWith("Điều khoản");
        assertThat(en.language()).isEqualTo("en");
        assertThat(en.title()).contains("Terms of Service");
        assertThat(vi.content()).contains("## 1.");
        assertThat(en.content()).contains("## 1.");
    }

    @Test
    void getCurrent_anUnknownOrMissingLanguageIsVietnamese() {
        assertThat(service.getCurrent("fr").language()).isEqualTo("vi");
        assertThat(service.getCurrent(null).language()).isEqualTo("vi");
    }

    @Test
    void hasAcceptedCurrent_isFalseUntilTheUserAcceptsAndThenStaysTrueWithoutAskingTheDatabaseAgain() {
        when(acceptanceRepository.existsByUserIdAndVersion(7L, 1)).thenReturn(false, true);

        assertThat(service.hasAcceptedCurrent(7L)).isFalse();
        assertThat(service.hasAcceptedCurrent(7L)).isTrue();
        assertThat(service.hasAcceptedCurrent(7L)).isTrue();

        verify(acceptanceRepository, times(2)).existsByUserIdAndVersion(7L, 1);
    }

    @Test
    void accept_recordsTheAcceptanceOfTheCurrentVersionOnce() {
        when(acceptanceRepository.existsByUserIdAndVersion(7L, 1)).thenReturn(false, true);

        service.accept(7L, 1);
        service.accept(7L, 1);

        ArgumentCaptor<TermsAcceptanceEntity> saved = ArgumentCaptor.forClass(TermsAcceptanceEntity.class);
        verify(acceptanceRepository, times(1)).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(7L);
        assertThat(saved.getValue().getVersion()).isEqualTo(1);
        assertThat(saved.getValue().getAcceptedAt()).isNotNull();
    }

    @Test
    void accept_anOutdatedVersionIsRefused() {
        assertThatThrownBy(() -> service.accept(7L, 0))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("terms have changed");

        verify(acceptanceRepository, never()).save(any());
    }

    @Test
    void requireCurrentVersion_refusesAMissingOrOldVersion() {
        assertThatThrownBy(() -> service.requireCurrentVersion(null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.requireCurrentVersion(2)).isInstanceOf(BusinessException.class);
        service.requireCurrentVersion(1);
    }

    @Test
    void recordAcceptance_forANewAccountChecksTheVersionFirst() {
        assertThatThrownBy(() -> service.recordAcceptance(9L, 5)).isInstanceOf(BusinessException.class);
        verify(acceptanceRepository, never()).save(any());

        service.recordAcceptance(9L, 1);
        verify(acceptanceRepository).save(any(TermsAcceptanceEntity.class));
    }

    /** The entity has no public constructor (JPA creates it), so the test fills it by reflection. */
    private static final class TermsVersionEntityBuilder {
        private int version;
        private Instant publishedAt;

        TermsVersionEntityBuilder version(int version) {
            this.version = version;
            return this;
        }

        TermsVersionEntityBuilder publishedAt(Instant publishedAt) {
            this.publishedAt = publishedAt;
            return this;
        }

        TermsVersionEntity build() throws Exception {
            var constructor = TermsVersionEntity.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            TermsVersionEntity entity = constructor.newInstance();
            set(entity, "version", version);
            set(entity, "publishedAt", publishedAt);
            return entity;
        }

        private static void set(Object target, String field, Object value) throws Exception {
            Field f = TermsVersionEntity.class.getDeclaredField(field);
            f.setAccessible(true);
            f.set(target, value);
        }
    }
}
