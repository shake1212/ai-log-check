package com.security.ailogsystem.exception;

/**
 * WMI连接异常
 * 
 * @author AI Log System
 * @version 1.0
 */
public class WmiConnectionException extends WmiCollectionException {
    
    private final String connectionString;
    private final int port;
    private final String protocol;

    public WmiConnectionException(String message, String targetHost) {
        super(message, targetHost, null);
        this.connectionString = null;
        this.port = 0;
        this.protocol = null;
    }

    public WmiConnectionException(String message, String targetHost, Throwable cause) {
        super(message, targetHost, null, cause);
        this.connectionString = null;
        this.port = 0;
        this.protocol = null;
    }

    public WmiConnectionException(String message, String targetHost, String connectionString, int port, String protocol) {
        super(message, targetHost, null);
        this.connectionString = connectionString;
        this.port = port;
        this.protocol = protocol;
    }

    public WmiConnectionException(String message, String targetHost, String connectionString, int port, String protocol, Throwable cause) {
        super(message, targetHost, null, cause);
        this.connectionString = connectionString;
        this.port = port;
        this.protocol = protocol;
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
