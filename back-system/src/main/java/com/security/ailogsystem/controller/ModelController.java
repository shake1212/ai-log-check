package com.security.ailogsystem.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/models")
@CrossOrigin(origins = "*")
public class ModelController {

    private final Map<String, Map<String, Object>> models = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> trainingStates = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> modelMetrics = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getModels() {
        return ResponseEntity.ok(new ArrayList<>(models.values()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getModel(@PathVariable String id) {
        Map<String, Object> model = models.get(id);
        return model == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(model);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createModel(@RequestBody Map<String, Object> payload) {
        String id = "model-" + System.currentTimeMillis();
        Map<String, Object> model = buildModel(id, payload, "inactive");
        models.put(id, model);
        modelMetrics.put(id, defaultMetrics());
        return ResponseEntity.ok(model);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateModel(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        Map<String, Object> existing = models.get(id);
        if (existing == null) return ResponseEntity.notFound().build();
        existing.putAll(payload);
        existing.put("updatedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModel(@PathVariable String id) {
        models.remove(id);
        trainingStates.remove(id);
        modelMetrics.remove(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/training")
    public ResponseEntity<Map<String, Object>> getTrainingStatus(@PathVariable String id) {
        Map<String, Object> state = trainingStates.getOrDefault(id, Map.of(
                "modelId", id,
                "status", "inactive",
                "progress", 0,
                "message", "尚未开始训练",
                "startedAt", LocalDateTime.now().toString()
        ));
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{id}/training")
    public ResponseEntity<Map<String, Object>> startTraining(@PathVariable String id, @RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> state = new HashMap<>();
        state.put("modelId", id);
        state.put("status", "training");
        state.put("progress", 10);
        state.put("message", "训练已启动");
        state.put("startedAt", LocalDateTime.now().toString());
        trainingStates.put(id, state);

        Map<String, Object> model = models.get(id);
        if (model != null) {
            model.put("status", "training");
            model.put("updatedAt", LocalDateTime.now().toString());
        }
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{id}/training/stop")
    public ResponseEntity<Map<String, Object>> stopTraining(@PathVariable String id) {
        Map<String, Object> state = new HashMap<>();
        state.put("modelId", id);
        state.put("status", "inactive");
        state.put("progress", 0);
        state.put("message", "训练已停止");
        state.put("startedAt", LocalDateTime.now().toString());
        trainingStates.put(id, state);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadModel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String algorithm) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", name == null || name.isBlank() ? file.getOriginalFilename() : name);
        payload.put("description", description == null ? "上传模型" : description);
        payload.put("type", type == null ? "anomaly_detection" : type);
        payload.put("algorithm", algorithm == null ? "unknown" : algorithm);
        String id = "model-" + System.currentTimeMillis();
        Map<String, Object> model = buildModel(id, payload, "inactive");
        models.put(id, model);
        modelMetrics.put(id, defaultMetrics());
        return ResponseEntity.ok(model);
    }

    @GetMapping("/{id}/metrics")
    public ResponseEntity<Map<String, Object>> getModelMetrics(@PathVariable String id) {
        return ResponseEntity.ok(modelMetrics.getOrDefault(id, defaultMetrics()));
    }

    @PostMapping("/{id}/deploy")
    public ResponseEntity<Map<String, Object>> deployModel(@PathVariable String id) {
        Map<String, Object> model = models.get(id);
        if (model == null) return ResponseEntity.notFound().build();
        model.put("status", "active");
        model.put("updatedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(model);
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateModel(@PathVariable String id) {
        Map<String, Object> model = models.get(id);
        if (model == null) return ResponseEntity.notFound().build();
        model.put("status", "inactive");
        model.put("updatedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(model);
    }

    private Map<String, Object> buildModel(String id, Map<String, Object> payload, String status) {
        Map<String, Object> model = new HashMap<>();
        model.put("id", id);
        model.put("name", payload.getOrDefault("name", id));
        model.put("description", payload.getOrDefault("description", ""));
        model.put("type", payload.getOrDefault("type", "anomaly_detection"));
        model.put("algorithm", payload.getOrDefault("algorithm", "unknown"));
        model.put("version", "1.0.0");
        model.put("status", status);
        model.put("accuracy", 0.0);
        model.put("createdAt", LocalDateTime.now().toString());
        model.put("updatedAt", LocalDateTime.now().toString());
        model.put("lastTrainedAt", "");
        model.put("parameters", payload.getOrDefault("parameters", Map.of()));
        model.put("metrics", Map.of());
        return model;
    }

    private Map<String, Object> defaultMetrics() {
        Map<String, Object> m = new HashMap<>();
        m.put("confusionMatrix", List.of());
        m.put("rocCurve", List.of());
        m.put("featureImportance", List.of());
        m.put("trainingHistory", List.of());
        return m;
    }
}
