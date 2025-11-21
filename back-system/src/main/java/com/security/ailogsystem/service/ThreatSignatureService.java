package com.security.ailogsystem.service;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;

import java.util.List;
import java.util.Optional;

public interface ThreatSignatureService {

    /**
     * 获取启用的特征
     */
    List<ThreatSignature> getActiveSignatures();

    /**
     * 与特征库比对事件
     */
    Optional<SignatureMatch> matchSignatures(UnifiedSecurityEvent event);

    /**
     * 强制刷新缓存
     */
    void refreshCache();

    /**
     * 特征命中结果
     */
    record SignatureMatch(ThreatSignature signature, double score, String reason) {}
}

