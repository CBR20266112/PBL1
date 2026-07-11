---
description: Describe when these instructions should be loaded by the agent based on task context
# applyTo: 'Describe when these instructions should be loaded by the agent based on task context' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---

<!-- Tip: Use /create-instructions in chat to generate content with agent assistance -->

Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
Before creating any commit:

1. Verify the Unity project compiles successfully.
2. Ensure there are no C# compilation errors.
3. Ensure Unity does not open in Safe Mode.
4. Check Console for errors after domain reload.
5. If scene files are modified, verify that no MonoBehaviour references are missing.
6. If UI code is modified, verify all affected scenes render correctly.
7. Do not commit until the project can be opened and compiled successfully.

Always report:
- Number of compilation errors before fix
- Number of compilation errors after fix
- Files modified
- Exact verification steps performed
Do not say "fixed" unless the project builds successfully.
Every fix must be validated in Unity Editor before commit.
A git commit without Unity validation is considered incomplete.