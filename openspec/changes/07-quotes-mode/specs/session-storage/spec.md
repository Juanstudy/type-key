# Session Storage Specification

## Purpose

Database schema supports `quote` mode and stores quote metadata (text, source, length category) alongside existing session data.

## Requirements

### Requirement: Quote Mode in Schema

The system MUST accept `quote` as a valid mode value in the sessions table CHECK constraint.

#### Scenario: Insert quote-mode session

- GIVEN the sessions table has an updated CHECK constraint
- WHEN a session with mode='quote' is inserted
- THEN the insert succeeds without constraint violation

#### Scenario: Reject invalid mode values

- GIVEN the CHECK constraint allows only 'time', 'words', 'quote'
- WHEN a session with mode='invalid' is inserted
- THEN the insert fails with a constraint error

### Requirement: Quote Metadata Columns

The system MUST store quote-specific metadata in nullable columns: quote_text, quote_source, quote_length.

#### Scenario: Store quote metadata

- GIVEN a quote-mode session completes
- WHEN the session is persisted
- THEN quote_text contains the full quote text
- AND quote_source contains the attribution
- AND quote_length contains the category (short|medium|long)

#### Scenario: Non-quote sessions leave metadata null

- GIVEN a time-mode session completes
- WHEN the session is persisted
- THEN quote_text, quote_source, and quote_length are NULL

### Requirement: Backward Compatibility

The system MUST not break existing sessions or queries when new columns are added.

#### Scenario: Existing queries still work

- GIVEN existing sessions in the database
- WHEN the schema is migrated with new nullable columns
- THEN all existing rows remain queryable
- AND no data is lost

#### Scenario: Query sessions by mode

- GIVEN sessions of all three modes exist
- WHEN querying WHERE mode = 'quote'
- THEN only quote-mode sessions are returned
- AND quote metadata columns are populated
