from src.core import __version__


def test_core_version() -> None:
    assert __version__ == "1.0.0-MVP"
