"""Panda growth stage helper tests."""

from app.services.panda_stats import growth_stage_from_experience


def test_growth_stages():
    assert growth_stage_from_experience(0) == "newborn"
    assert growth_stage_from_experience(15) == "learning"
    assert growth_stage_from_experience(45) == "experienced"
    assert growth_stage_from_experience(70) == "master"
    assert growth_stage_from_experience(90) == "legend"
