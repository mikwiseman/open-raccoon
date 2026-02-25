"""Tests for the agent status message bank."""

from raccoon_runtime.status_messages import StatusMessageBank


class TestStatusMessageBank:
    def test_all_categories_have_messages(self):
        bank = StatusMessageBank()
        for category in bank.get_categories():
            messages = getattr(bank, category.upper())
            assert len(messages) > 0, f"Category {category} has no messages"

    def test_get_message_returns_string(self):
        bank = StatusMessageBank()
        for category in bank.get_categories():
            msg = bank.get_message(category)
            assert isinstance(msg, str)
            assert len(msg) > 0

    def test_no_immediate_repeat(self):
        bank = StatusMessageBank()
        prev = None
        for _ in range(50):
            msg = bank.get_message("thinking")
            if prev is not None and len(bank.THINKING) > 1:
                assert msg != prev, "Same message repeated consecutively"
            prev = msg

    def test_get_categories(self):
        bank = StatusMessageBank()
        categories = bank.get_categories()
        assert "thinking" in categories
        assert "coding" in categories
        assert "generating" in categories
        assert "searching" in categories
        assert "deploying" in categories
        assert "error_recovery" in categories
        assert "reading_code" in categories

    def test_unknown_category_falls_back_to_thinking(self):
        bank = StatusMessageBank()
        msg = bank.get_message("nonexistent")
        assert msg in bank.THINKING

    def test_thinking_messages_from_specs(self):
        """Verify key messages from SPECS.md Appendix A are present."""
        bank = StatusMessageBank()
        assert "contemplating the void..." in bank.THINKING
        assert "asking the rubber duck..." in bank.THINKING
        assert "consulting the raccoon council..." in bank.THINKING
        assert "buffering genius..." in bank.THINKING

    def test_thinking_messages_from_design_system(self):
        """Verify key messages from DESIGN_SYSTEM.md Section 6.2 are present."""
        bank = StatusMessageBank()
        assert "thinking about this..." in bank.THINKING
        assert "untangling your requirements..." in bank.THINKING
        assert "pondering the edge cases..." in bank.THINKING

    def test_coding_messages_from_both_sources(self):
        """Verify coding messages from both spec sources."""
        bank = StatusMessageBank()
        # From DESIGN_SYSTEM.md 6.2
        assert "writing code that hopefully compiles..." in bank.CODING
        assert "arguing with the linter..." in bank.CODING
        # From SPECS.md Appendix A
        assert "writing code at 3am energy..." in bank.CODING
        assert "debugging the matrix..." in bank.CODING

    def test_deploying_messages_from_both_sources(self):
        """Verify deploying messages from both spec sources."""
        bank = StatusMessageBank()
        # From DESIGN_SYSTEM.md 6.2
        assert "shipping it..." in bank.DEPLOYING
        assert "deploying to prod on a friday. you asked for this." in bank.DEPLOYING
        # From SPECS.md Appendix A
        assert "releasing into the wild..." in bank.DEPLOYING
        assert "launching to the moon..." in bank.DEPLOYING

    def test_error_recovery_messages(self):
        """Verify error recovery messages from DESIGN_SYSTEM.md 6.2."""
        bank = StatusMessageBank()
        assert "hmm, that didn't work. plan B." in bank.ERROR_RECOVERY
        assert "the raccoon tripped. getting back up." in bank.ERROR_RECOVERY

    def test_reading_code_messages(self):
        """Verify reading code messages from SPECS.md Appendix A."""
        bank = StatusMessageBank()
        assert "reading your spaghetti code..." in bank.READING_CODE
        assert "judging your variable names..." in bank.READING_CODE
        assert "finding where the bug lives..." in bank.READING_CODE

    def test_category_count(self):
        """Verify we have exactly 7 categories."""
        bank = StatusMessageBank()
        assert len(bank.get_categories()) == 7
