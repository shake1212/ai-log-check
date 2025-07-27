package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.ModelDTO;
import com.security.ailogsystem.model.AiModel;
import com.security.ailogsystem.repository.AiModelRepository;
import com.security.ailogsystem.service.ModelService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.persistence.EntityNotFoundException;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ModelServiceImpl implements ModelService {

    private static final Logger logger = LoggerFactory.getLogger(ModelServiceImpl.class);

    @Value("${ai.model.base-path}")
    private String modelBasePath;

    private final AiModelRepository modelRepository;

    @Autowired
    public ModelServiceImpl(AiModelRepository modelRepository) {
        this.modelRepository = modelRepository;
    }

    @Override
    @Transactional
    public ModelDTO createModel(ModelDTO modelDTO) {
        AiModel model = convertToEntity(modelDTO);
        model.setModelId(UUID.randomUUID().toString());
        model.setCreatedAt(LocalDateTime.now());
        model.setStatus(AiModel.ModelStatus.INACTIVE);
        
        AiModel savedModel = modelRepository.save(model);
        return convertToDTO(savedModel);
    }

    @Override
    public ModelDTO getModelById(String id) {
        AiModel model = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        return convertToDTO(model);
    }

    @Override
    public Page<ModelDTO> getAllModels(Pageable pageable) {
        return modelRepository.findAll(pageable)
                .map(this::convertToDTO);
    }

    @Override
    public List<ModelDTO> getModelsByType(AiModel.ModelType type) {
        return modelRepository.findByType(type).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ModelDTO> getModelsByStatus(AiModel.ModelStatus status) {
        return modelRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ModelDTO uploadModel(MultipartFile file, ModelDTO modelDTO) {
        try {
            // 创建模型
            AiModel model = convertToEntity(modelDTO);
            model.setModelId(UUID.randomUUID().toString());
            model.setCreatedAt(LocalDateTime.now());
            model.setStatus(AiModel.ModelStatus.INACTIVE);

            // 确保目录存在
            Path modelDir = Paths.get(modelBasePath);
            if (!Files.exists(modelDir)) {
                Files.createDirectories(modelDir);
            }

            // 保存文件
            String fileName = model.getModelId() + "_" + file.getOriginalFilename();
            Path filePath = modelDir.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);
            model.setFilePath(filePath.toString());

            AiModel savedModel = modelRepository.save(model);
            return convertToDTO(savedModel);
        } catch (IOException e) {
            logger.error("Failed to upload model file", e);
            throw new RuntimeException("Failed to upload model file: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ModelDTO updateModel(String id, ModelDTO modelDTO) {
        AiModel existingModel = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));

        // 更新模型属性
        existingModel.setName(modelDTO.getName());
        existingModel.setDescription(modelDTO.getDescription());
        existingModel.setAlgorithm(modelDTO.getAlgorithm());
        existingModel.setVersion(modelDTO.getVersion());
        
        if (modelDTO.getParameters() != null) {
            existingModel.getParameters().clear();
            existingModel.getParameters().putAll(modelDTO.getParameters());
        }
        
        if (modelDTO.getMetrics() != null) {
            existingModel.getMetrics().clear();
            existingModel.getMetrics().putAll(modelDTO.getMetrics());
        }
        
        existingModel.setUpdatedAt(LocalDateTime.now());
        
        AiModel updatedModel = modelRepository.save(existingModel);
        return convertToDTO(updatedModel);
    }

    @Override
    @Transactional
    public ModelDTO deployModel(String id) {
        AiModel model = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        
        // 检查模型文件是否存在
        if (model.getFilePath() == null || !new File(model.getFilePath()).exists()) {
            throw new RuntimeException("Model file not found");
        }
        
        // 将同类型的其他活动模型设为非活动
        List<AiModel> activeModels = modelRepository.findByTypeAndStatus(
                model.getType(), AiModel.ModelStatus.ACTIVE);
        
        for (AiModel activeModel : activeModels) {
            activeModel.setStatus(AiModel.ModelStatus.INACTIVE);
            modelRepository.save(activeModel);
        }
        
        // 激活当前模型
        model.setStatus(AiModel.ModelStatus.ACTIVE);
        model.setUpdatedAt(LocalDateTime.now());
        
        AiModel deployedModel = modelRepository.save(model);
        return convertToDTO(deployedModel);
    }

    @Override
    @Transactional
    public ModelDTO deactivateModel(String id) {
        AiModel model = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        
        model.setStatus(AiModel.ModelStatus.INACTIVE);
        model.setUpdatedAt(LocalDateTime.now());
        
        AiModel deactivatedModel = modelRepository.save(model);
        return convertToDTO(deactivatedModel);
    }

    @Override
    @Transactional
    public ModelDTO startTraining(String id, Map<String, String> parameters) {
        AiModel model = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        
        // 设置训练参数
        if (parameters != null) {
            model.getParameters().putAll(parameters);
        }
        
        // 更新模型状态为训练中
        model.setStatus(AiModel.ModelStatus.TRAINING);
        model.setUpdatedAt(LocalDateTime.now());
        
        AiModel savedModel = modelRepository.save(model);
        
        // 异步启动训练过程
        // 这里只是模拟，实际应用中应该使用线程池或消息队列
        new Thread(() -> {
            try {
                // 模拟训练过程
                Thread.sleep(5000);
                
                // 更新训练结果
                savedModel.setStatus(AiModel.ModelStatus.INACTIVE);
                savedModel.setLastTrainedAt(LocalDateTime.now());
                savedModel.getMetrics().put("accuracy", 0.95);
                savedModel.getMetrics().put("precision", 0.93);
                savedModel.getMetrics().put("recall", 0.92);
                savedModel.getMetrics().put("f1_score", 0.925);
                savedModel.setAccuracy(0.95);
                
                modelRepository.save(savedModel);
            } catch (InterruptedException e) {
                logger.error("Model training interrupted", e);
                savedModel.setStatus(AiModel.ModelStatus.FAILED);
                modelRepository.save(savedModel);
            }
        }).start();
        
        return convertToDTO(savedModel);
    }

    @Override
    public Map<String, Object> getModelMetrics(String id) {
        AiModel model = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("id", model.getModelId());
        metrics.put("name", model.getName());
        metrics.put("type", model.getType());
        metrics.put("algorithm", model.getAlgorithm());
        metrics.put("status", model.getStatus());
        metrics.put("accuracy", model.getAccuracy());
        metrics.put("lastTrainedAt", model.getLastTrainedAt());
        metrics.put("metrics", model.getMetrics());
        
        return metrics;
    }

    @Override
    @Transactional
    public void deleteModel(String id) {
        AiModel model = modelRepository.findByModelId(id)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + id));
        
        // 检查模型是否处于活动状态
        if (model.getStatus() == AiModel.ModelStatus.ACTIVE) {
            throw new IllegalStateException("Cannot delete an active model. Deactivate it first.");
        }
        
        // 删除模型文件
        if (model.getFilePath() != null) {
            try {
                Files.deleteIfExists(Paths.get(model.getFilePath()));
            } catch (IOException e) {
                logger.error("Failed to delete model file", e);
            }
        }
        
        modelRepository.delete(model);
    }

    @Override
    public Map<String, Object> predict(String modelId, Map<String, Object> data) {
        AiModel model = modelRepository.findByModelId(modelId)
                .orElseThrow(() -> new EntityNotFoundException("Model not found with id: " + modelId));
        
        if (model.getStatus() != AiModel.ModelStatus.ACTIVE) {
            throw new IllegalStateException("Model is not active");
        }
        
        // 这里是模拟预测，实际应用中应该加载模型并进行真实预测
        Map<String, Object> result = new HashMap<>();
        result.put("modelId", model.getModelId());
        result.put("modelName", model.getName());
        result.put("timestamp", LocalDateTime.now());
        
        // 根据模型类型返回不同的结果
        switch (model.getType()) {
            case ANOMALY_DETECTION:
                double anomalyScore = Math.random();
                boolean isAnomaly = anomalyScore > 0.8;
                result.put("isAnomaly", isAnomaly);
                result.put("anomalyScore", anomalyScore);
                result.put("anomalyThreshold", 0.8);
                break;
            case CLASSIFICATION:
                List<String> classes = Arrays.asList("normal", "warning", "critical");
                String predictedClass = classes.get(new Random().nextInt(classes.size()));
                Map<String, Double> classProbs = new HashMap<>();
                classProbs.put("normal", 0.1);
                classProbs.put("warning", 0.3);
                classProbs.put("critical", 0.6);
                result.put("predictedClass", predictedClass);
                result.put("probabilities", classProbs);
                break;
            case CLUSTERING:
                int clusterId = new Random().nextInt(5);
                result.put("clusterId", clusterId);
                break;
            case FORECASTING:
                List<Double> forecast = new ArrayList<>();
                for (int i = 0; i < 10; i++) {
                    forecast.add(Math.random() * 100);
                }
                result.put("forecast", forecast);
                break;
            default:
                result.put("error", "Unsupported model type");
        }
        
        return result;
    }

    @Override
    public List<Map<String, Object>> batchPredict(String modelId, List<Map<String, Object>> data) {
        // 简单实现：对每条数据单独预测
        return data.stream()
                .map(item -> predict(modelId, item))
                .collect(Collectors.toList());
    }

    // 辅助方法：将实体转换为DTO
    private ModelDTO convertToDTO(AiModel model) {
        return ModelDTO.builder()
                .id(model.getModelId())
                .name(model.getName())
                .description(model.getDescription())
                .type(model.getType())
                .algorithm(model.getAlgorithm())
                .version(model.getVersion())
                .status(model.getStatus())
                .accuracy(model.getAccuracy())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .lastTrainedAt(model.getLastTrainedAt())
                .parameters(model.getParameters())
                .metrics(model.getMetrics())
                .build();
    }

    // 辅助方法：将DTO转换为实体
    private AiModel convertToEntity(ModelDTO dto) {
        AiModel model = new AiModel();
        model.setName(dto.getName());
        model.setDescription(dto.getDescription());
        model.setType(dto.getType());
        model.setAlgorithm(dto.getAlgorithm());
        model.setVersion(dto.getVersion());
        
        if (dto.getParameters() != null) {
            model.getParameters().putAll(dto.getParameters());
        }
        
        if (dto.getMetrics() != null) {
            model.getMetrics().putAll(dto.getMetrics());
        }
        
        return model;
    }
} 