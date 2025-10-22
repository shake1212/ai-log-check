package com.security.ailogsystem.exception;

/**
 * 事务操作异常
 * 
 * @author AI Log System
 * @version 1.0
 */
public class TransactionException extends DatabaseException {
    
    public TransactionException(String message) {
        super("TRANSACTION_ERROR", message);
    }

    public TransactionException(String message, Throwable cause) {
        super("TRANSACTION_ERROR", message, cause);
    }

    public TransactionException(String errorCode, String message) {
        super(errorCode, message);
    }

    public TransactionException(String errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }
}
