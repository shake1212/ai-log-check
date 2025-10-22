package com.security.ailogsystem.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.OptimisticLockException;
import jakarta.persistence.PersistenceException;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorResponse> handleEntityNotFoundException(EntityNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ValidationErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ValidationErrorResponse error = new ValidationErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation failed",
                LocalDateTime.now(),
                errors
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // 数据库异常处理
    @ExceptionHandler(DatabaseException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleDatabaseException(DatabaseException ex) {
        logger.error("Database error occurred: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "数据库操作失败: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(TransactionException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleTransactionException(TransactionException ex) {
        logger.error("Transaction error occurred: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "事务操作失败: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(BatchOperationException.class)
    @ResponseStatus(HttpStatus.PARTIAL_CONTENT)
    public ResponseEntity<BatchErrorResponse> handleBatchOperationException(BatchOperationException ex) {
        logger.error("Batch operation error occurred: {}", ex.getMessage(), ex);
        BatchErrorResponse error = new BatchErrorResponse(
                HttpStatus.PARTIAL_CONTENT.value(),
                "批量操作部分失败: " + ex.getMessage(),
                LocalDateTime.now(),
                ex.getSuccessCount(),
                ex.getErrorCount(),
                ex.getTotalCount()
        );
        return new ResponseEntity<>(error, HttpStatus.PARTIAL_CONTENT);
    }

    @ExceptionHandler(DataIntegrityException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleDataIntegrityException(DataIntegrityException ex) {
        logger.error("Data integrity error occurred: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "数据完整性错误: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    // Spring Data 异常处理
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        logger.error("Data integrity violation: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "数据完整性约束违反: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleDuplicateKeyException(DuplicateKeyException ex) {
        logger.error("Duplicate key error: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "数据重复: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleOptimisticLockingFailureException(OptimisticLockingFailureException ex) {
        logger.error("Optimistic locking failure: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "数据已被其他用户修改，请刷新后重试",
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(OptimisticLockException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleOptimisticLockException(OptimisticLockException ex) {
        logger.error("Optimistic lock exception: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "数据已被其他用户修改，请刷新后重试",
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(TransactionSystemException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleTransactionSystemException(TransactionSystemException ex) {
        logger.error("Transaction system error: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "事务系统错误: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(PersistenceException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handlePersistenceException(PersistenceException ex) {
        logger.error("Persistence error: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "数据持久化错误: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(DataAccessException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleDataAccessException(DataAccessException ex) {
        logger.error("Data access error: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "数据访问错误: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(SQLException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleSQLException(SQLException ex) {
        logger.error("SQL error: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "数据库SQL错误: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // WMI采集异常处理
    @ExceptionHandler(WmiCollectionException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<WmiErrorResponse> handleWmiCollectionException(WmiCollectionException ex) {
        logger.error("WMI collection error: {}", ex.getMessage(), ex);
        WmiErrorResponse error = new WmiErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "WMI采集错误: " + ex.getMessage(),
                LocalDateTime.now(),
                ex.getTargetHost(),
                ex.getWmiClass(),
                ex.getRetryCount(),
                ex.getDuration()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(WmiConnectionException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ResponseEntity<WmiConnectionErrorResponse> handleWmiConnectionException(WmiConnectionException ex) {
        logger.error("WMI connection error: {}", ex.getMessage(), ex);
        WmiConnectionErrorResponse error = new WmiConnectionErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "WMI连接错误: " + ex.getMessage(),
                LocalDateTime.now(),
                ex.getTargetHost(),
                ex.getConnectionString(),
                ex.getPort(),
                ex.getProtocol()
        );
        return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
    }

    @ExceptionHandler(WmiAuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<WmiAuthenticationErrorResponse> handleWmiAuthenticationException(WmiAuthenticationException ex) {
        logger.error("WMI authentication error: {}", ex.getMessage(), ex);
        WmiAuthenticationErrorResponse error = new WmiAuthenticationErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "WMI认证错误: " + ex.getMessage(),
                LocalDateTime.now(),
                ex.getTargetHost(),
                ex.getUsername(),
                ex.getDomain()
        );
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex) {
        logger.error("Unexpected error occurred: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "系统内部错误: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static class ErrorResponse {
        private int status;
        private String message;
        private LocalDateTime timestamp;

        public ErrorResponse(int status, String message, LocalDateTime timestamp) {
            this.status = status;
            this.message = message;
            this.timestamp = timestamp;
        }

        public int getStatus() {
            return status;
        }

        public String getMessage() {
            return message;
        }

        public LocalDateTime getTimestamp() {
            return timestamp;
        }
    }

    public static class ValidationErrorResponse extends ErrorResponse {
        private Map<String, String> errors;

        public ValidationErrorResponse(int status, String message, LocalDateTime timestamp, Map<String, String> errors) {
            super(status, message, timestamp);
            this.errors = errors;
        }

        public Map<String, String> getErrors() {
            return errors;
        }
    }

    public static class BatchErrorResponse extends ErrorResponse {
        private int successCount;
        private int errorCount;
        private int totalCount;
        private double successRate;
        private double errorRate;

        public BatchErrorResponse(int status, String message, LocalDateTime timestamp, 
                                int successCount, int errorCount, int totalCount) {
            super(status, message, timestamp);
            this.successCount = successCount;
            this.errorCount = errorCount;
            this.totalCount = totalCount;
            this.successRate = totalCount > 0 ? (double) successCount / totalCount : 0.0;
            this.errorRate = totalCount > 0 ? (double) errorCount / totalCount : 0.0;
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
            return successRate;
        }

        public double getErrorRate() {
            return errorRate;
        }
    }

    public static class WmiErrorResponse extends ErrorResponse {
        private String targetHost;
        private String wmiClass;
        private int retryCount;
        private long duration;

        public WmiErrorResponse(int status, String message, LocalDateTime timestamp, 
                               String targetHost, String wmiClass, int retryCount, long duration) {
            super(status, message, timestamp);
            this.targetHost = targetHost;
            this.wmiClass = wmiClass;
            this.retryCount = retryCount;
            this.duration = duration;
        }

        public String getTargetHost() {
            return targetHost;
        }

        public String getWmiClass() {
            return wmiClass;
        }

        public int getRetryCount() {
            return retryCount;
        }

        public long getDuration() {
            return duration;
        }
    }

    public static class WmiConnectionErrorResponse extends ErrorResponse {
        private String targetHost;
        private String connectionString;
        private int port;
        private String protocol;

        public WmiConnectionErrorResponse(int status, String message, LocalDateTime timestamp,
                                        String targetHost, String connectionString, int port, String protocol) {
            super(status, message, timestamp);
            this.targetHost = targetHost;
            this.connectionString = connectionString;
            this.port = port;
            this.protocol = protocol;
        }

        public String getTargetHost() {
            return targetHost;
        }

        public String getConnectionString() {
            return connectionString;
        }

        public int getPort() {
            return port;
        }

        public String getProtocol() {
            return protocol;
        }
    }

    public static class WmiAuthenticationErrorResponse extends ErrorResponse {
        private String targetHost;
        private String username;
        private String domain;

        public WmiAuthenticationErrorResponse(int status, String message, LocalDateTime timestamp,
                                            String targetHost, String username, String domain) {
            super(status, message, timestamp);
            this.targetHost = targetHost;
            this.username = username;
            this.domain = domain;
        }

        public String getTargetHost() {
            return targetHost;
        }

        public String getUsername() {
            return username;
        }

        public String getDomain() {
            return domain;
        }
    }
}