package com.security.ailogsystem.exception;

/**
 * 数据完整性异常
 * 
 * @author AI Log System
 * @version 1.0
 */
public class DataIntegrityException extends DatabaseException {
    
    private final String constraintName;
    private final String tableName;

    public DataIntegrityException(String message) {
        super("DATA_INTEGRITY_ERROR", message);
        this.constraintName = null;
        this.tableName = null;
    }

    public DataIntegrityException(String message, Throwable cause) {
        super("DATA_INTEGRITY_ERROR", message, cause);
        this.constraintName = null;
        this.tableName = null;
    }

    public DataIntegrityException(String message, String constraintName, String tableName) {
        super("DATA_INTEGRITY_ERROR", message);
        this.constraintName = constraintName;
        this.tableName = tableName;
    }

    public DataIntegrityException(String message, String constraintName, String tableName, Throwable cause) {
        super("DATA_INTEGRITY_ERROR", message, cause);
        this.constraintName = constraintName;
        this.tableName = tableName;
    }

    public String getConstraintName() {
        return constraintName;
    }

    public String getTableName() {
        return tableName;
    }
}
