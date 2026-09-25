# ADR-003: Native HTML5 drag-and-drop for kanban
**Status:** Accepted · **Context:** avoid a DnD dependency and its React 19 compatibility churn. **Decision:** `draggable` + `onDrop` on columns, calling a server action; each card also has a status select for keyboard/touch. **Consequences:** no touch drag; acceptable for a desktop internal tool.
