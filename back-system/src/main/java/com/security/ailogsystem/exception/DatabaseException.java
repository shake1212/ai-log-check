package com.security.ailogsystem.exception;

/**
 * 数据库操作异常基类
 * 
 * @author AI Log System
 * @version 1.0
 */
public class DatabaseException extends RuntimeException {
    
    private final String errorCode;
    private final Object[] args;

    public DatabaseException(String message) {
        super(message);
        this.errorCode = "DATABASE_ERROR";
        this.args = new Object[0];
    }

    public DatabaseException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "DATABASE_ERROR";
        this.args = new Object[0];
    }

    public DatabaseException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.args = new Object[0];
    }

    public DatabaseException(String errorCode, String message, Object... args) {
        super(message);
        this.errorCode = errorCode;
        this.args = args;
    }

    public DatabaseException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.args = new Object[0];
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Object[] getArgs() {
        return args;
    }
}
