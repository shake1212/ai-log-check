package com.security.ailogsystem.exception;

/**
 * 批量操作异常
 * 
 * @author AI Log System
 * @version 1.0
 */
public class BatchOperationException extends DatabaseException {
    
    private final int successCount;
    private final int errorCount;
    private final int totalCount;

    public BatchOperationException(String message, int successCount, int errorCount, int totalCount) {
        super("BATCH_OPERATION_ERROR", message);
        this.successCount = successCount;
        this.errorCount = errorCount;
        this.totalCount = totalCount;
    }

    public BatchOperationException(String message, Throwable cause, int successCount, int errorCount, int totalCount) {
        super("BATCH_OPERATION_ERROR", message, cause);
        this.successCount = successCount;
        this.errorCount = errorCount;
        this.totalCount = totalCount;
    }

    public BatchOperationException(String errorCode, String message, int successCount, int errorCount, int totalCount) {
        super(errorCode, message);
        this.successCount = successCount;
        this.errorCount = errorCount;
        this.totalCount = totalCount;
    }

    public int getSuccessCount() {
        return successCount;
    }

    public int getErrorCount() {
        return errorCount;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public double getSuccessRate() {
        return totalCount > 0 ? (double) successCount / totalCount : 0.0;
    }

    public double getErrorRate() {
        return totalCount > 0 ? (double) errorCount / totalCount : 0.0;
    }
}
