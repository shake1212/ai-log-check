package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.AiModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiModelRepository extends JpaRepository<AiModel, Long> {
    
    Optional<AiModel> findByModelId(String modelId);
    
    List<AiModel> findByStatus(AiModel.ModelStatus status);
    
    List<AiModel> findByType(AiModel.ModelType type);
    
    List<AiModel> findByTypeAndStatus(AiModel.ModelType type, AiModel.ModelStatus status);
    
    Optional<AiModel> findByTypeAndStatusAndAlgorithm(
            AiModel.ModelType type, AiModel.ModelStatus status, String algorithm);
    
    Page<AiModel> findByNameContainingIgnoreCase(String name, Pageable pageable);
    
    boolean existsByModelId(String modelId);
} 