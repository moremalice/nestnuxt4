# Docs Contributing Guide

## Writing Principles
- **Single Source of Truth (DRY)**: Don't repeat the same explanation across multiple documents. Keep it in one place and reference it with links from others.
- **Related Documents Section**: Place a `## Related Documents` section at the end of every major document.
- **Cross-linking**: Adjacent topics must link to each other (e.g., API Communication ↔ Frontend Patterns).
- **Update Order**: Code changes → Test changes → Related documentation updates → `docs/README.md` and `CLAUDE.md` summary updates.

## Language Standards
- **Documentation Language**: All documentation in `docs/` **must be written in English**.
- **Code Comments**: Use English for all code comments and inline documentation.
- **Naming Conventions**: Variable names, function names, API endpoints, and file names should use English terminology.
- **Translation Policy**: When updating existing non-English documentation, translate to English while maintaining the same structure and content depth.
- **User-Facing Content Exception**: Frontend UI text and end-user error messages may use localized languages as appropriate for the target audience.

## Change Checklist
- [ ] A `## Related Documents` section exists at the bottom of this document.
- [ ] Content duplication has been replaced with links.
- [ ] Updated the `docs/README.md` index.
- [ ] Verified that links connect to actual files.
