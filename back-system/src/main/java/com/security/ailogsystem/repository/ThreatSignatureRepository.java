package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.ThreatSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ThreatSignatureRepository extends JpaRepository<ThreatSignature, Long> {

    List<ThreatSignature> findByEnabledTrue();
}

