package com.company.project.modules.legal.service.impl;

import com.company.project.common.exception.BusinessException;
import com.company.project.modules.legal.domain.TermsAcceptanceEntity;
import com.company.project.modules.legal.domain.TermsVersionEntity;
import com.company.project.modules.legal.dto.response.TermsResponse;
import com.company.project.modules.legal.repository.TermsAcceptanceRepository;
import com.company.project.modules.legal.repository.TermsVersionRepository;
import com.company.project.modules.legal.service.TermsService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The newest version only changes when a migration publishes one, which means a deployment and a restart, so it is read
 * once. A user who has accepted it is remembered in memory (acceptance is never taken back), which keeps the check that
 * runs on every request from touching the database for people who already accepted.
 */
@Service
public class TermsServiceImpl implements TermsService {

    static final String DEFAULT_LANGUAGE = "vi";
    private static final Set<String> LANGUAGES = Set.of("vi", "en");

    private final TermsVersionRepository versionRepository;
    private final TermsAcceptanceRepository acceptanceRepository;

    private volatile TermsVersionEntity current;
    private final Set<Long> acceptedCurrent = ConcurrentHashMap.newKeySet();

    public TermsServiceImpl(TermsVersionRepository versionRepository, TermsAcceptanceRepository acceptanceRepository) {
        this.versionRepository = versionRepository;
        this.acceptanceRepository = acceptanceRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public TermsResponse getCurrent(String language) {
        TermsVersionEntity version = currentVersion();
        String lang = language != null && LANGUAGES.contains(language.toLowerCase(Locale.ROOT))
                ? language.toLowerCase(Locale.ROOT) : DEFAULT_LANGUAGE;
        String text = readText(version.getVersion(), lang);
        int firstBreak = text.indexOf('\n');
        String firstLine = firstBreak < 0 ? text : text.substring(0, firstBreak);
        if (!firstLine.startsWith("# ")) {
            throw new IllegalStateException("Terms v" + version.getVersion() + " (" + lang + ") must start with a '# ' title line");
        }
        String content = firstBreak < 0 ? "" : text.substring(firstBreak + 1).strip();
        return new TermsResponse(version.getVersion(), version.getPublishedAt(), lang, firstLine.substring(2).strip(), content);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasAcceptedCurrent(Long userId) {
        if (acceptedCurrent.contains(userId)) {
            return true;
        }
        boolean accepted = acceptanceRepository.existsByUserIdAndVersion(userId, currentVersion().getVersion());
        if (accepted) {
            acceptedCurrent.add(userId);
        }
        return accepted;
    }

    @Override
    @Transactional
    public void accept(Long userId, int version) {
        requireCurrentVersion(version);
        if (!acceptanceRepository.existsByUserIdAndVersion(userId, version)) {
            acceptanceRepository.save(new TermsAcceptanceEntity(userId, version));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void requireCurrentVersion(Integer acceptedVersion) {
        if (acceptedVersion == null || !acceptedVersion.equals(currentVersion().getVersion())) {
            throw new BusinessException(
                    "TERMS_VERSION_MISMATCH", "The terms have changed; please read and accept the current version", HttpStatus.CONFLICT);
        }
    }

    @Override
    @Transactional
    public void recordAcceptance(Long userId, int version) {
        requireCurrentVersion(version);
        acceptanceRepository.save(new TermsAcceptanceEntity(userId, version));
    }

    private TermsVersionEntity currentVersion() {
        TermsVersionEntity cached = current;
        if (cached != null) {
            return cached;
        }
        TermsVersionEntity loaded = versionRepository.findFirstByOrderByVersionDesc()
                .orElseThrow(() -> new IllegalStateException("No terms version is published (see migration V30)"));
        current = loaded;
        return loaded;
    }

    private String readText(int version, String language) {
        Resource resource = new ClassPathResource("terms/v" + version + "/" + language + ".txt");
        if (!resource.exists() && !DEFAULT_LANGUAGE.equals(language)) {
            return readText(version, DEFAULT_LANGUAGE);
        }
        try {
            return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8).replace("\r\n", "\n").strip();
        } catch (IOException e) {
            // A published version without its text is a deployment mistake, not something a client can fix.
            throw new IllegalStateException("Terms text for v" + version + " (" + language + ") cannot be read", e);
        }
    }
}
