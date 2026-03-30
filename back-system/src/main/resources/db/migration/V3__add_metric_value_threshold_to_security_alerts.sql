ALTER TABLE security_alerts
    ADD COLUMN metric_value DOUBLE NULL COMMENT '触发告警时的实际指标值',
    ADD COLUMN threshold DOUBLE NULL COMMENT '告警阈值';
