package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.ModelDTO;
import com.security.ailogsystem.model.AiModel;
import com.security.ailogsystem.service.ModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/models")
@Tag(name = "AI模型管理", description = "AI模型管理和推理接口")
public class ModelController {

    private final ModelService modelService;

    @Autowired
    public ModelController(ModelService modelService) {
        this.modelService = modelService;
    }

    @PostMapping
    @Operation(summary = "创建模型", description = "创建新的AI模型")
    public ResponseEntity<ModelDTO> createModel(@Valid @RequestBody ModelDTO modelDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(modelService.createModel(modelDTO));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取模型详情", description = "根据ID获取模型详情")
    public ResponseEntity<ModelDTO> getModelById(@PathVariable String id) {
        return ResponseEntity.ok(modelService.getModelById(id));
    }

    @GetMapping
    @Operation(summary = "获取所有模型", description = "分页获取所有模型")
    public ResponseEntity<Page<ModelDTO>> getAllModels(Pageable pageable) {
        return ResponseEntity.ok(modelService.getAllModels(pageable));
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "按类型获取模型", description = "根据类型获取模型列表")
    public ResponseEntity<List<ModelDTO>> getModelsByType(@PathVariable AiModel.ModelType type) {
        return ResponseEntity.ok(modelService.getModelsByType(type));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "按状态获取模型", description = "根据状态获取模型列表")
    public ResponseEntity<List<ModelDTO>> getModelsByStatus(@PathVariable AiModel.ModelStatus status) {
        return ResponseEntity.ok(modelService.getModelsByStatus(status));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "上传模型", description = "上传模型文件并创建模型")
    public ResponseEntity<ModelDTO> uploadModel(
            @Parameter(description = "模型文件") @RequestPart("file") MultipartFile file,
            @Parameter(description = "模型信息") @RequestPart("model") ModelDTO modelDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(modelService.uploadModel(file, modelDTO));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新模型", description = "更新模型信息")
    public ResponseEntity<ModelDTO> updateModel(
            @PathVariable String id, @Valid @RequestBody ModelDTO modelDTO) {
        return ResponseEntity.ok(modelService.updateModel(id, modelDTO));
    }

    @PutMapping("/{id}/deploy")
    @Operation(summary = "部署模型", description = "部署模型到生产环境")
    public ResponseEntity<ModelDTO> deployModel(@PathVariable String id) {
        return ResponseEntity.ok(modelService.deployModel(id));
    }

    @PutMapping("/{id}/deactivate")
    @Operation(summary = "停用模型", description = "停用生产环境中的模型")
    public ResponseEntity<ModelDTO> deactivateModel(@PathVariable String id) {
        return ResponseEntity.ok(modelService.deactivateModel(id));
    }

    @PostMapping("/{id}/train")
    @Operation(summary = "开始训练", description = "开始模型训练")
    public ResponseEntity<ModelDTO> startTraining(
            @PathVariable String id, @RequestBody Map<String, String> parameters) {
        return ResponseEntity.ok(modelService.startTraining(id, parameters));
    }

    @GetMapping("/{id}/metrics")
    @Operation(summary = "获取模型指标", description = "获取模型性能指标")
    public ResponseEntity<Map<String, Object>> getModelMetrics(@PathVariable String id) {
        return ResponseEntity.ok(modelService.getModelMetrics(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除模型", description = "根据ID删除模型")
    public ResponseEntity<Void> deleteModel(@PathVariable String id) {
        modelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/predict")
    @Operation(summary = "单条预测", description = "使用模型进行单条数据预测")
    public ResponseEntity<Map<String, Object>> predict(
            @PathVariable String id, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(modelService.predict(id, data));
    }

    @PostMapping("/{id}/batch-predict")
    @Operation(summary = "批量预测", description = "使用模型进行批量数据预测")
    public ResponseEntity<List<Map<String, Object>>> batchPredict(
            @PathVariable String id, @RequestBody List<Map<String, Object>> data) {
        return ResponseEntity.ok(modelService.batchPredict(id, data));
    }
} 