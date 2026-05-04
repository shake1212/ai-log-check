UPDATE unified_security_events
SET ai_is_anomaly = b'1',
    combined_score = anomaly_score
WHERE source_system = 'WINDOWS_SECURITY'
  AND is_anomaly = b'1';

SELECT COUNT(*) AS ai_anomaly_count
FROM unified_security_events
WHERE source_system = 'WINDOWS_SECURITY'
  AND ai_is_anomaly = b'1';
