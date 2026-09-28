package com.company.project.modules.drive.repository;

import com.company.project.modules.drive.domain.OAuthStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthStateRepository extends JpaRepository<OAuthStateEntity, String> {
}
