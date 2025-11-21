package com.security.ailogsystem.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Collections;
import java.util.List;

@Data
public class ScriptRunRequest {

    @NotBlank(message = "scriptKey不能为空")
    private String scriptKey;

    private List<String> args;

    public List<String> getArgs() {
        return args == null ? Collections.emptyList() : args;
    }
}

