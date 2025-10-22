package com.security.ailogsystem.exception;

/**
 * WMI认证异常
 * 
 * @author AI Log System
 * @version 1.0
 */
public class WmiAuthenticationException extends WmiCollectionException {
    
    private final String username;
    private final String domain;

    public WmiAuthenticationException(String message, String targetHost) {
        super(message, targetHost, null);
        this.username = null;
        this.domain = null;
    }

    public WmiAuthenticationException(String message, String targetHost, Throwable cause) {
        super(message, targetHost, null, cause);
        this.username = null;
        this.domain = null;
    }

    public WmiAuthenticationException(String message, String targetHost, String username, String domain) {
        super(message, targetHost, null);
        this.username = username;
        this.domain = domain;
    }

    public WmiAuthenticationException(String message, String targetHost, String username, String domain, Throwable cause) {
        super(message, targetHost, null, cause);
        this.username = username;
        this.domain = domain;
    }

    public String getUsername() {
        return username;
    }

    public String getDomain() {
        return domain;
    }
}
