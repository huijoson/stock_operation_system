# Feature Specification: Dashboard Stock News Module

**Feature Branch**: `002-dashboard-stock-news`
**Created**: 2025-12-16
**Status**: Draft
**Input**: User description: "首頁 Dashboard 股市消息模組..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Latest News (Priority: P1)

As a dashboard user, I want to see the latest stock market news in a dedicated section on my dashboard so that I can stay informed about market trends without leaving the main page.

**Why this priority**: Core value of the feature; provides immediate information utility to the user.

**Independent Test**: Can be tested by loading the dashboard and verifying the news section appears with latest items.

**Acceptance Scenarios**:

1. **Given** the dashboard loads successfully, **When** I view the news section, **Then** I see the 5 most recent news items.
2. **Given** news items are displayed, **When** I look at an item, **Then** I see its Title, Category Tag, Publication Time, and Source.
3. **Given** the external news API is down or slow, **When** I load the dashboard, **Then** the news section shows a friendly error message or empty state without breaking the rest of the dashboard (Graceful Degradation).

---

### User Story 2 - Filter News by Category (Priority: P2)

As a user interested in specific sectors, I want to filter news by industry categories (e.g., Tech, Finance, Healthcare) so that I can focus on information relevant to my portfolio.

**Why this priority**: Enhances usability and personalization, allowing users to find relevant info faster.

**Independent Test**: Can be tested by clicking different category tabs and verifying the list updates.

**Acceptance Scenarios**:

1. **Given** the news section is visible, **When** I see the category tabs/filter, **Then** I can select a specific category (e.g., "Technology").
2. **Given** I select a category, **When** the list updates, **Then** only news items matching that category are displayed.
3. **Given** I am viewing a specific category, **When** I select "All" or clear the filter, **Then** the list shows mixed news from all categories again.

### User Story 3 - System Data Fetching & Delivery (Priority: P1)

As the system, I need to fetch news data from an external API on a backend schedule, store it in the database, and deliver normalized records to the frontend, so that users always see fresh and consistently structured news items without runtime dependency on external API availability.

**Why this priority**: Underpins both US1 and US2; without reliable data retrieval, the UI has nothing to display.

**Independent Test**: Can be tested via API route unit tests and by simulating API failures to confirm fallback behaviour.

**Acceptance Scenarios**:

1. **Given** the sync schedule triggers, **When** the backend sync job runs, **Then** the system calls the Alpha Vantage News & Sentiment API and upserts normalized `NewsItem` records into the database.
2. **Given** the dashboard page is requested, **When** the frontend/server fetch runs, **Then** the system reads news from the database and returns a normalized list of `NewsItem` objects without directly calling Alpha Vantage in the request path.
3. **Given** a sync run fails due to API error or timeout, **When** the dashboard loads, **Then** the system serves the latest successfully synced records (or empty state if none exist) so the dashboard remains functional.

---

### Edge Cases

- **EC-001**: **Empty Feed**: If a sync run produces no news items (or no synced records exist yet), display a "No recent news" message instead of a blank space.
- **EC-002**: **Long Titles**: If a title exceeds 2 lines, truncate with ellipsis (...) to preserve card height.
- **EC-003**: **Missing Metadata**: If a news item lacks a source or time, display "Unknown Source" or hide the field, but do not break the UI.

## Clarifications

### Session 2025-05-27
- Q: What is the primary external data source for market news? → A: Alpha Vantage News & Sentiment API.

### Session 2026-03-04
- Q: Which data delivery model should Dashboard news use? → A: Scheduled Database Sync (backend scheduled ingestion; dashboard reads from database only).
- Q: What is the scheduled sync frequency for news ingestion? → A: Every hour.
- Q: How should news categories be handled? → A: Fixed category list (mapped from API tags; unknown tags default to "Other").
- Q: What sync cadence should be used under Alpha Vantage free tier limits? → A: Every hour.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch stock news from Alpha Vantage News & Sentiment API.
- **FR-001a**: System MUST ingest stock news from Alpha Vantage via a backend scheduled sync job and persist normalized records in the application database.
- **FR-002**: System MUST display a "Stock News" widget/section on the main Dashboard.
- **FR-003**: System MUST display the top 5 most recent news items by default.
- **FR-004**: Each news item MUST display: Title, Category/Industry Tag, Publication Time, and Source.
- **FR-005**: System MUST classify news into a fixed set of categories (e.g., General, Technology, Finance, Earnings, Mergers, Other).
- **FR-005a**: System MUST map incoming Alpha Vantage API tags to this fixed category list. If a tag is unrecognized or missing, it MUST be mapped to "Other".
- **FR-006**: System MUST handle sync failures gracefully by preserving last successful dataset and showing a friendly empty/error state when no synced data is available.
- **FR-007**: The news section layout MUST maintain integrity even if news titles are unusually long (text wrapping or truncation).
- **FR-008**: Dashboard news read path MUST use the local database as source-of-truth and MUST NOT call Alpha Vantage directly during normal page rendering.
- **FR-009**: Backend sync job MUST run on an **hourly schedule** to ingest the latest news from Alpha Vantage and upsert normalized `NewsItem` records into the database.

### Key Entities *(include if feature involves data)*

- **NewsItem**: Represents a single news article persisted in local database (mapped from Alpha Vantage response: ExternalId, Title, Summary, URL, Source, PublishedAt, CategoryTags, SyncedAt).
- **NewsCategory**: Fixed Enum/List used for filtering (e.g., General, Technology, Finance, Earnings, Mergers, Other).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard loads without error even if the News API returns a 500 or timeout (Graceful degradation verified).
- **SC-001a**: During external API outage, dashboard continues to render from last successful synced dataset without request-path failure.
- **SC-002**: Filtering by category updates the displayed list within 1 second (UI responsiveness).
- **SC-003**: News widget layout remains stable (no visual breakage) when populating with maximum length titles (Layout robustness).
- **SC-004**: Users can see the source and time for every displayed news item.
- **SC-005**: Under normal sync operation, news data displayed on the dashboard is at most **60 minutes stale** (aligned with the hourly sync schedule).

## Out of Scope

- Real-time updates via WebSocket (polling or refresh on load is sufficient).
- Detailed stock quotes or interactive charts within the news module.
- Full article reading view within the dashboard (linking to external source is acceptable).
- User customization of news sources.
