"""Agent status message bank - fun, minimalist, developer-humor status messages.

Messages are sourced from SPECS.md Appendix A and DESIGN_SYSTEM.md Section 6.
Rotation rules (from DESIGN_SYSTEM.md 6.3):
- Randomly select from the appropriate category
- Never repeat the same message twice in a row within a session
- For operations lasting > 10 seconds, cycle to a new message every 8-12 seconds
- Each message should feel like a brief, dry aside - not a progress bar
- Keep them short: 6 words max as a target, 10 words as a hard limit
"""

import random


class StatusMessageBank:
    """Manages status messages with no-repeat logic."""

    # --- Thinking / Reasoning ---
    # Sources: SPECS.md Appendix A + DESIGN_SYSTEM.md 6.2
    THINKING = [
        "thinking about this...",
        "untangling your requirements...",
        "consulting the raccoon council...",
        "reading between the lines...",
        "pondering the edge cases...",
        "considering 14 possible approaches, discarding 13...",
        "having a quick existential crisis about types...",
        "contemplating the void...",
        "asking the rubber duck...",
        "thinking raccoon thoughts...",
        "processing at the speed of thought...",
        "one moment, having an existential crisis...",
        "buffering genius...",
    ]

    # --- Coding / Building ---
    # Sources: SPECS.md Appendix A + DESIGN_SYSTEM.md 6.2
    CODING = [
        "writing code that hopefully compiles...",
        "brewing your landing page...",
        "refactoring things you didn't ask me to refactor...",
        "adding semicolons in all the right places...",
        "building something with unreasonable attention to detail...",
        "reading your spaghetti code... trying not to judge...",
        "deleting my first attempt. you'll never know.",
        "arguing with the linter...",
        "writing code at 3am energy...",
        "refactoring reality...",
        "debugging the matrix...",
        "compiling thoughts...",
        "stack overflowing gracefully...",
        "git committing to the cause...",
    ]

    # --- Generating Content ---
    # Sources: SPECS.md Appendix A + DESIGN_SYSTEM.md 6.2
    GENERATING = [
        "drafting something worth reading...",
        "choosing words carefully...",
        "writing, rewriting, re-rewriting...",
        "making your bullet points bulletproof...",
        "turning caffeine into documentation...",
        "generating prose that doesn't sound like a robot...",
        "assembling pixels...",
        "summoning components...",
        "crafting something beautiful...",
        "weaving HTML with care...",
        "painting with CSS...",
    ]

    # --- Searching / Research ---
    # Sources: SPECS.md Appendix A + DESIGN_SYSTEM.md 6.2
    SEARCHING = [
        "digging through the internet...",
        "searching for answers in the digital void...",
        "reading docs so you don't have to...",
        "cross-referencing sources like a paranoid librarian...",
        "going down a rabbit hole for you...",
        "asking the hive mind...",
        "raiding the knowledge base...",
        "foraging for answers...",
        "consulting the archives...",
    ]

    # --- Deploying / Executing ---
    # Sources: SPECS.md Appendix A + DESIGN_SYSTEM.md 6.2
    DEPLOYING = [
        "shipping it...",
        "deploying to prod on a friday. you asked for this.",
        "running your build. fingers crossed.",
        "testing in production like a professional...",
        "pushing to the void and hoping for the best...",
        "watching the CI pipeline like a hawk...",
        "releasing into the wild...",
        "launching to the moon...",
        "pushing pixels to production...",
        "making it live...",
    ]

    # --- Error Recovery ---
    # Source: DESIGN_SYSTEM.md 6.2
    ERROR_RECOVERY = [
        "hmm, that didn't work. plan B.",
        "retrying with more optimism...",
        "something broke. fixing it before you notice.",
        "the raccoon tripped. getting back up.",
        "adjusting expectations...",
    ]

    # --- Reading Code ---
    # Source: SPECS.md Appendix A
    READING_CODE = [
        "reading your spaghetti code...",
        "parsing the chaos...",
        "judging your variable names...",
        "untangling the dependency graph...",
        "deciphering ancient commit messages...",
        "finding where the bug lives...",
    ]

    CATEGORIES = [
        "thinking",
        "coding",
        "generating",
        "searching",
        "deploying",
        "error_recovery",
        "reading_code",
    ]

    def __init__(self) -> None:
        self._last_message: str = ""

    def get_message(self, category: str) -> str:
        """Get a random status message from the given category, avoiding repeats.

        If the category is unknown, falls back to THINKING messages.
        """
        category_upper = category.upper()
        messages: list[str] = getattr(self, category_upper, self.THINKING)
        available = [m for m in messages if m != self._last_message]
        if not available:
            available = messages
        chosen = random.choice(available)
        self._last_message = chosen
        return chosen

    def get_categories(self) -> list[str]:
        """Return list of available categories."""
        return list(self.CATEGORIES)
