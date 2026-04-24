# Design Document: Database Stability Fixes

## Overview

This design addresses a SQL syntax error in the AI Log System's database migration script V1.0.5. Database inspection confirms that the required columns (`enable_rule_engine` and `rule_engine_timeout`) already exist in the `log_collector_configs` table. The solution is to simply remove the problematic V1.0.5 migration file.

## Architecture

No architectural changes needed. Simply remove the problematic migration file:

```
back-system/src/main/resources/db/migration/
  ├── V1__create_log_collector_config.sql
  ├── V2__create_system_metrics.sql
  ├── V3__add_metric_value_threshold_to_security_alerts.sql
  ├── V1.0.5__add_rule_engine_config.sql  ← DELETE THIS FILE
  └── V1.0.6__add_rule_engine_config_safe.sql  ← KEEP THIS (safe version)
```

### Key Design Decision

**Remove Problematic File**: Since the database already has the required columns (added by V1.0.6 or manually), and V1.0.5 has incorrect syntax, the simplest solution is to delete or rename V1.0.5 to prevent it from being executed.

## Components and Interfaces

### 1. File to Remove

**File Path**: `back-system/src/main/resources/db/migration/V1.0.5__add_rule_engine_config.sql`

**Action**: Delete or rename to `V1.0.5__add_rule_engine_config.sql.bak`

### 2. Existing Database Schema

The `log_collector_configs` table already contains:
- `enable_rule_engine`: bit(1) NOT NULL - Controls whether rule engine analysis is enabled  
- `rule_engine_timeout`: int(11) DEFAULT NULL - Timeout in seconds for rule engine operations

## Data Models

No changes to data models. The existing columns in `log_collector_configs` table are already correct.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Required Columns Exist

*For any* query to the log_collector_configs table, the table schema must include both enable_rule_engine and rule_engine_timeout columns with correct data types.

**Validates: Requirements 1.2**

## Error Handling

### File Removal

**Scenario**: V1.0.5 migration file is removed

**Handling**:
1. Application will start without attempting to execute V1.0.5
2. No SQL syntax errors will occur
3. Existing database columns remain unchanged

**Prevention**: Keep V1.0.6 migration file which provides safe column addition logic

## Testing Strategy

This feature will use simple unit tests to verify the database schema.

### Unit Testing

Unit tests will focus on:
- Verifying the required columns exist in the database
- Verifying the columns have correct data types
- Verifying the application starts without SQL errors

**Test Framework**: JUnit 5 with Spring Boot Test

**Example Unit Tests**:
- `testRequiredColumnsExist()` - Validates Requirements 1.2
- `testApplicationStartsSuccessfully()` - Validates Requirements 1.3

### Property-Based Testing

Not applicable for this simple fix. Standard unit tests are sufficient.

### Integration Testing

Integration tests will verify:
- Application starts successfully without migration errors
- Rule engine configuration can be read from database
- Rule engine configuration can be updated through the API

### Test Environment

- **Database**: MySQL (same as production)
- **Test Data**: Existing database with columns already present
