package com.security.ailogsystem.exception;

/**
 * WMI采集异常
 * 
 * @author AI Log System
 * @version 1.0
 */
public class WmiCollectionException extends DatabaseException {
    
    private final String targetHost;
    private final String wmiClass;
    private final int retryCount;
    private final long duration;

    public WmiCollectionException(String message) {
        super("WMI_COLLECTION_ERROR", message);
        this.targetHost = null;
        this.wmiClass = null;
        this.retryCount = 0;
        this.duration = 0;
    }

    public WmiCollectionException(String message, Throwable cause) {
        super("WMI_COLLECTION_ERROR", message, cause);
        this.targetHost = null;
        this.wmiClass = null;
        this.retryCount = 0;
        this.duration = 0;
    }

    public WmiCollectionException(String message, String targetHost, String wmiClass) {
        super("WMI_COLLECTION_ERROR", message);
        this.targetHost = targetHost;
        this.wmiClass = wmiClass;
        this.retryCount = 0;
        this.duration = 0;
    }

    public WmiCollectionException(String message, String targetHost, String wmiClass, Throwable cause) {
        super("WMI_COLLECTION_ERROR", message, cause);
        this.targetHost = targetHost;
        this.wmiClass = wmiClass;
        this.retryCount = 0;
        this.duration = 0;
    }

    public WmiCollectionException(String message, String targetHost, String wmiClass, int retryCount, long duration) {
        super("WMI_COLLECTION_ERROR", message);
        this.targetHost = targetHost;
        this.wmiClass = wmiClass;
        this.retryCount = retryCount;
        this.duration = duration;
    }

    public WmiCollectionException(String message, String targetHost, String wmiClass, int retryCount, long duration, Throwable cause) {
        super("WMI_COLLECTION_ERROR", message, cause);
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
