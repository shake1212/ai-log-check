package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.ModelDTO;
import com.security.ailogsystem.model.AiModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface ModelService {
    
    ModelDTO createModel(ModelDTO modelDTO);
    
    ModelDTO getModelById(String id);
    
    Page<ModelDTO> getAllModels(Pageable pageable);
    
    List<ModelDTO> getModelsByType(AiModel.ModelType type);
    
    List<ModelDTO> getModelsByStatus(AiModel.ModelStatus status);
    
    ModelDTO uploadModel(MultipartFile file, ModelDTO modelDTO);
    
    ModelDTO updateModel(String id, ModelDTO modelDTO);
    
    ModelDTO deployModel(String id);
    
    ModelDTO deactivateModel(String id);
    
    ModelDTO startTraining(String id, Map<String, String> parameters);
    
    Map<String, Object> getModelMetrics(String id);
    
    void deleteModel(String id);
    
    Map<String, Object> predict(String modelId, Map<String, Object> data);
    
    List<Map<String, Object>> batchPredict(String modelId, List<Map<String, Object>> data);
} 